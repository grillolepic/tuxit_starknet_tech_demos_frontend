import { defineStore } from 'pinia';
import { useStarkNetStore } from './starknet';
import { useGameStore } from './game';
import { Contract, number, ec, validateAndParseAddress, hash } from "starknet";
import { tuxitContractAddress } from '@/helpers/blockchainConstants';
import { TuxitCrypto } from '@/helpers/TuxitCrypto';
import { joinRoom } from 'trystero';

import tuxitAbi from './abis/tuxit.json' assert {type: 'json'};
import { toHandlers } from 'vue';

const TURNS_FOR_CHECKPOINT = 10;

let _initialState = {
    loadingPreviousRooms: false,

    gameId: null,
    gamePlayers: 2,
    gameName: null,
    gameDescription: null,
    unfinishedRoomId : null,

    loadingRoom: false,
    roomId: null,
    roomStatus: null,
    roomPlayers: [],
    roomStarkKeys: [],
    roomDeadline: null,
    roomPrivateKeyLost: false,
    roomRandomSeed: null,

    creatingRoom: false,
    closingRoom: false,
    joiningRoom: false,    

    //gameStatus:
    //-1: Uninitialized
    //0: Loading stored data
    //1: Waiting for peers
    //2: Connected to peers: syncing fixed data         -2: Fixed data sync error
    //3: Connected to peers: syncing last checkpoint    -3: Checkpoint sync error
    //4: Connected to peers: syncing last turns         -4: Turns sync error
    //5: Initializing game                              -5: Error initializing game
    //6: Connected to peers, synced, playing
    //7: Connected to peers: problem?

    gameStatus: -1,
    gameFixed: null,
    gameActions: null,
    gameCheckpoint: null,
    gameRequireCheckpoint: false,
    
    gamePeers: {}
}

let _tuxitContract = null;
let _starkNetStore = null;
let _gameStore = null;
let _lastCheckedBlock = null;

let _keyPairs = [];

let _trysteroRoom = null;
let _sendMessage = null;
let _getMessage = null;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const useTuxitStore = defineStore({
    id: 'tuxit',
    state: () => ({ ..._initialState }),
    getters: {
        turnMode: (state) => ([0].includes(state.gameId))?'manual':'auto',
        roomCreator: (state) => (state.roomId == null || state.roomPlayers.length < 2)?null:(_starkNetStore.address == state.roomPlayers[0]),
        roomJoined: (state) => (state.roomId == null || state.roomPlayers.length < 2)?null:(state.roomPlayers.indexOf(_starkNetStore.address) >= 0),
        playerNumber: (state) => (state.roomId == null || state.roomPlayers.length < 2)?null:(state.roomPlayers.indexOf(_starkNetStore.address)),
        localKey: (state) => (state.roomId == null)?null:`${_tuxitContract.address}_room_${state.roomId.toString()}`
    },
    actions: {
        async init() {
            console.log("tuxit: init()");
            _starkNetStore = useStarkNetStore();
            _gameStore = useGameStore();
            _tuxitContract = new Contract(tuxitAbi, tuxitContractAddress[_starkNetStore.chainId], _starkNetStore.starknet.account);
            await this.loadPreviousRoom();
        },

        reset() {
            console.log("tuxit: reset()");
            _lastCheckedBlock = null;
            _keyPairs = [];
            this.leave();
            this.$patch({ ..._initialState });
        },

        async loadGame(gameId) {
            console.log("tuxit: loadGame()");
            if (gameId == 0) {
                this.$patch({
                    gameId: gameId,
                    gameName: "Manual Turns with Complete Information",
                    gameDescription: "Our most basic game-type. Players exchange turns manually via WebRTC (fully P2P) while game state is publicly available to all players"
                });
            } else {
                this.$patch({ gameId: null, gameName: null, gameDescription: null});
            }

            if (gameId != null) {
                await this.loadPreviousRoom()
            }
        },

        async loadPreviousRoom() {
            this.loadingPreviousRooms = true;
            let lastRoomId = await this.getLastRoomId();
            if (lastRoomId != null) {
              if (await this.isRoomFinished(lastRoomId)) { lastRoomId = null; }
            }
            this.$patch({
                unfinishedRoomId: (lastRoomId != null)?lastRoomId.toString():null,
                loadingPreviousRooms: false
            });
        },

        async createRoom(gameId) {
            console.log("tuxit: createRoom()");
            this.creatingRoom = true;

            if (gameId > 0) { return this.creatingRoom = false; }

            try {
                const starkKeyPair = ec.genKeyPair();
                const starkKey = ec.getStarkKey(starkKeyPair);

                const transaction = await _tuxitContract.createRoom(gameId, starkKey, 1000 * 60 * 5);
                await _starkNetStore.starknet.provider.waitForTransaction(transaction.transaction_hash);

                /*
                const status = await _starkNetStore.starknet.provider.getTransactionStatus(transaction.transaction_hash);
                console.log(status);
                const trace = await _starkNetStore.starknet.provider.getTransactionTrace(transaction.transaction_hash);
                console.log(trace);
                */

                const lastRoomId = await this.getLastRoomId()
                localStorage.setItem(`${_tuxitContract.address}_room_${lastRoomId.toString()}`, JSON.stringify({ private_key: starkKeyPair.getPrivate("hex")}));
                this.unfinishedRoomId = lastRoomId.toString();

            } catch (err) {
                this.creatingRoom = false;
            }
        },

        async getLastRoomId() {
            console.log("tuxit: getLastRoomId()");
            const totalRooms = await _tuxitContract.getPlayerTotalRooms(_starkNetStore.address);
            if (totalRooms.total.gt(number.toBN(0))) {
                let lastIndex = totalRooms.total.sub(number.toBN(1));
                const lastGameRoomId = await _tuxitContract.getPlayerGameRoomByIndex(_starkNetStore.address, lastIndex);
                return lastGameRoomId.roomId;
            }
            return null;
        },

        async loadRoom(roomId, checkBlock = false) {
            if (checkBlock == true) {
                let block = await _starkNetStore.starknet.provider.getBlock();
                if (block.block_number == _lastCheckedBlock) { return; }
                _lastCheckedBlock = block.block_number;
                console.log(`Block number: ${_lastCheckedBlock}`);
            }

            console.log("tuxit: loadRoom()");
            this.loadingRoom = true;

            try {
                const room = await this.getRoom(roomId);
                if (room == null) { return; }

                const gameId = room.gameId.toNumber();
                if (this.gameId != gameId) {
                    await this.loadGame(gameId);
                }

                const status = room.status.toNumber();
                
                const owner_address = validateAndParseAddress("0x" + room.player_1_address.toString(16).padStart(64,"0"));
                const player_2_address = validateAndParseAddress("0x" + room.player_2_address.toString(16).padStart(64,"0"));

                const owner_stark_key = validateAndParseAddress("0x" + room.public_key_1.toString(16).padStart(64,"0"));
                const player_2_stark_key = validateAndParseAddress("0x" + room.public_key_2.toString(16).padStart(64,"0"));

                const localData = this.getLocalStorage(roomId);

                const isFinished = await this.isRoomFinished(null, room);
                if (!isFinished) {

                    const player_joined = ([owner_address, player_2_address].indexOf(_starkNetStore.address) >=0);

                    this.$patch({
                        roomId: roomId,
                        roomStatus: status,
                        roomPrivateKeyLost: player_joined && ((localData == null) || !("private_key" in localData)),
                        roomPlayers: [owner_address, player_2_address],
                        roomStarkKeys: [owner_stark_key, player_2_stark_key],
                        roomDeadline: room.deadline.toNumber(),
                        roomRandomSeed: room.random_seed.toString(),
                        loadingRoom: false
                    });

                    if (player_joined) { await this.loadKeyPairs(); }
                }
            } catch (err) {
                this.loadingRoom = false;
            }
        },

        async loadKeyPairs() {
            try {
                if (this.roomPrivateKeyLost) { return; }

                const localData = this.getLocalStorage(this.roomId);
                const privateKey = localData["private_key"];
                const myKeyPair = ec.getKeyPair(number.toBN(privateKey, 'hex'));

                const myPlayerNumber = this.roomPlayers.indexOf(_starkNetStore.address);
                
                let key_pairs = [];

                if (myPlayerNumber == 0) {
                    key_pairs.push(myKeyPair);
                    if (this.roomPlayers[1] != ZERO_ADDRESS) {
                        let pubKeys = TuxitCrypto.getPublicKeys(this.roomStarkKeys[1]);       
                        let pubKeyPairs = [ec.getKeyPairFromPublicKey(pubKeys[0]), ec.getKeyPairFromPublicKey(pubKeys[1])];
                        key_pairs.push(pubKeyPairs);
                    } else {
                        key_pairs.push(null);
                    }
                } else if (myPlayerNumber == 1) {
                    if (this.roomPlayers[0] != ZERO_ADDRESS) {
                        let pubKeys = TuxitCrypto.getPublicKeys(this.roomStarkKeys[0]);  
                        let pubKeyPairs = [ec.getKeyPairFromPublicKey(pubKeys[0]), ec.getKeyPairFromPublicKey(pubKeys[1])];
                        key_pairs.push(pubKeyPairs);
                    } else {
                        key_pairs.push(null);
                    }
                    key_pairs.push(myKeyPair);
                }

                _keyPairs = key_pairs;
            } catch (err) {
                throw err;
            }
        },
       
        async getRoom(roomId) {
            console.log("tuxit: getRoom()");
            try {
                let room = await _tuxitContract.getGameRoom(roomId);
                return room.room;
            } catch (err) {
                return null;
            }
        },

        async isRoomFinished(roomId, room = null) {
            console.log("tuxit: isRoomFinished()");
            if (room == null) {
                room = await this.getRoom(roomId);
            }
            if (room.status.eq(number.toBN(0))) {
                const currentTs = Math.floor(Date.now()/1000);
                let deadlineTs = room.deadline.toNumber();
                if (currentTs > deadlineTs) { return true; }
            } else {
                const status = room.status.toNumber();
                if (status > 5) { return true; }
            }
            return false;
        },

        getLocalStorage(roomId = null) {
            console.log("tuxit: getLocalStorage()");
            let storage;
            if (roomId == null) { storage = localStorage.getItem(this.localKey); }
            else { storage = localStorage.getItem(`${_tuxitContract.address}_room_${roomId.toString()}`); }
            if (storage != null) { return JSON.parse(storage); }
            return null;
        },

        async closeRoom(roomId) {
            console.log("tuxit: closeRoom()");
            this.closingRoom = true;
            try {
                const transaction = await _tuxitContract.closeRoom(number.toBN(roomId));
                await _starkNetStore.starknet.provider.waitForTransaction(transaction.transaction_hash);

                /*
                const status = await _starkNetStore.starknet.provider.getTransactionStatus(transaction.transaction_hash);
                console.log(status);
                const trace = await _starkNetStore.starknet.provider.getTransactionTrace(transaction.transaction_hash);
                console.log(trace);
                */

                this.reset();
            } catch (err) {
                this.closingRoom = false
                return null;
            }
        },

        async joinRoom() {
            console.log("tuxit: joinRoom()");
            this.joiningRoom = true;

            if (this.roomId == null) { return this.creatingRoom = false; }

            try {
                const starkKeyPair = ec.genKeyPair();
                const starkKey = ec.getStarkKey(starkKeyPair);

                console.log(`Private key: ${starkKeyPair.getPrivate("hex")}`);

                const transaction = await _tuxitContract.joinRoom(number.toBN(this.roomId), starkKey);
                await _starkNetStore.starknet.provider.waitForTransaction(transaction.transaction_hash);

                /*
                const status = await _starkNetStore.starknet.provider.getTransactionStatus(transaction.transaction_hash);
                console.log(status);
                const trace = await _starkNetStore.starknet.provider.getTransactionTrace(transaction.transaction_hash);
                console.log(trace);
                */

                localStorage.setItem(`${_tuxitContract.address}_room_${this.roomId}`, JSON.stringify({ private_key: starkKeyPair.getPrivate("hex")}));

                this.$patch({
                    roomStatus: 3,
                    roomPlayers: [roomPlayers[0], _starkNetStore.address],
                    roomStarkKeys: [roomPlayers[0], starkKey],
                    roomRandomSeed: room.random_seed.toString(),
                    unfinishedRoomId: roomId
                });

                await this.loadKeyPairs();

            } catch (err) {
                this.joiningRoom = false;
            }
        },

        async startGame() {
            console.log("tuxit: startGame()");
            if (this.gameId == null || this.roomId == null || this.roomRandomSeed == null) { return this.gameStatus = -1; }
            
            this.gameStatus = 0;
            
            //01. Load the stored data. If private key data is not found, exit.
            let storedFixed = null;
            let storedCheckpoint = null;
            let storedActions = [];

            let storedGameData = this.getLocalStorage();

            if (storedGameData != null) {
                if (!("private_key" in storedGameData)) { return this.roomPrivateKeyLost = true; }
                try { if ("fixed" in storedGameData) { storedFixed = {...storedGameData.fixed}; } } catch (err) { storedFixed = null; }
                try { if ("checkpoint" in storedGameData) { storedCheckpoint = {...storedGameData.checkpoint}; } } catch (err) { storedCheckpoint = null; }
                try { if ("actions" in storedGameData) { storedActions = [...storedGameData.actions ]; } } catch (err) { storedActions = []; }
            } else {
                return this.roomPrivateKeyLost = true;
            }

            //02. If fixed data was stored, validate it. Delete if invalid.
            if (storedFixed != null) {
                try {
                    let fixedData = JSON.parse(JSON.stringify(storedFixed.data));

                    let ownVerify = TuxitCrypto.verifySignature(fixedData, storedFixed.signatures[this.playerNumber], _keyPairs[this.playerNumber], storedFixed.hash);
                    if (!ownVerify.verified) { throw Error("Wrong fixed data player signature"); }

                    const otherPlayerNumber = (this.playerNumber == 0)?1:0;
                    if (storedFixed.signatures[otherPlayerNumber].length > 0) {
                        let verify = TuxitCrypto.verifySignature(fixedData, storedFixed.signatures[otherPlayerNumber], _keyPairs[otherPlayerNumber]);
                        if (!verify.verified) { throw Error("Wrong fixed data opponent signature"); }
                    }
                    this.gameFixed = storedFixed;

                    _gameStore.decodeFixed(this.gameFixed.data);

                    console.log(" - Found valid fixed game data.");
                } catch (err) {
                    console.log(" - Found invalid fixed game data. Deleted.");
                    console.log(err);
                    storedFixed = null;
                    delete storedGameData.fixed;
                    localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                }
            }

            //03. If a checkpoint was stored, validate it. Delete if invalid.
            if (storedCheckpoint != null) {
                try {
                    let checkpointData = JSON.parse(JSON.stringify(storedCheckpoint.data));

                    let ownVerify = TuxitCrypto.verifySignature(checkpointData, storedCheckpoint.signatures[this.playerNumber], _keyPairs[this.playerNumber], storedCheckpoint.hash);
                    if (!ownVerify.verified) { throw Error("Wrong checkpoint player signature"); }

                    const otherPlayerNumber = (this.playerNumber == 0)?1:0;
                    if (storedCheckpoint.signatures[otherPlayerNumber].length > 0) {
                        let verify = TuxitCrypto.verifySignature(checkpointData, storedCheckpoint.signatures[otherPlayerNumber], _keyPairs[otherPlayerNumber]);
                        if (!verify.verified) { throw Error("Wrong checkpoint opponent signature"); }
                    } else {
                        if (checkpointData[0] != 0n) {
                            throw Error("Checkpoint >0 stored without double signatures");
                        }
                    }
                    this.gameCheckpoint = storedCheckpoint;

                    let _checkpoint = _gameStore.decodeCheckpoint(this.gameCheckpoint.data);
                    this.gameCheckpoint.turn = _checkpoint.turn;

                    console.log(" - Found valid checkpoint.");
                } catch (err) {
                    console.log(" - Found invalid checkpoint. Deleted.");
                    storedCheckpoint = null;
                    delete storedGameData.checkpoint;
                    localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                }
            }

            //04. If no map or checkpoint is available, recreate initial conditions
            if (storedFixed == null || storedCheckpoint == null) {
                let newGame = _gameStore.create(this.roomRandomSeed);

                let signedData = TuxitCrypto.sign(newGame.fixed, _keyPairs[this.playerNumber]);
                storedGameData.fixed = {
                    data: newGame.fixed,
                    hash: signedData.hashedData,
                    signatures: [[],[]]
                };
                storedGameData.fixed.signatures[this.playerNumber] = signedData.signature;

                let signedCheckpoint = TuxitCrypto.sign(newGame.state, _keyPairs[this.playerNumber]);
                storedGameData.checkpoint = {
                    turn: 0,
                    data: newGame.state,
                    hash: signedCheckpoint.hashedData,
                    signatures: [[],[]]
                };
                storedGameData.checkpoint.signatures[this.playerNumber] = signedCheckpoint.signature;

                this.gameFixed = storedGameData.fixed;
                this.gameCheckpoint = storedGameData.checkpoint;
                
                storedGameData.actions = [];
                
                localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                console.log("       - Created new Fixed Data and Initial State.");
            }

            //05. Load stored actions data
            if (storedActions != null) {
                try {
                    let actionsArray = JSON.parse(JSON.stringify(storedActions));
                    actionsArray.forEach((action) => {
                        let verify = TuxitCrypto.verifySignature(action.data, action.signature, _keyPairs[action.player]);
                        if (!verify.verified) { throw Error(`Wrong action signature for turn #{action.turn}`); }
                    });

                    this.gameActions = actionsArray;
                    console.log(` - Found ${actionsArray.length} valid actions.`);
                } catch (err) {
                    console.log(" - Found invalid actions. Delete?");
                    return this.gameStatus = -1;
                }
            }
            this.gameActions = storedActions;

            //06. Connect with other player via P2P and exchange signed ids before beginning sync
            this.gameStatus = 1;
            
            _trysteroRoom = joinRoom({ appId: tuxitContractAddress[_starkNetStore.chainId]}, this.roomId);

            [_sendMessage, _getMessage] = _trysteroRoom.makeAction('message');
            _getMessage((data, peer) => this.getMessage(data, peer));

            _trysteroRoom.onPeerJoin(() => {
                if (this.gameStatus == 1) {
                    let ts = Date.now();
                    let signedTimestamp = TuxitCrypto.sign([number.toBN(ts)], _keyPairs[this.playerNumber]);
                    _sendMessage({ type: "id", data: { address: _starkNetStore.address, timestamp: ts, signature: signedTimestamp.signature }});
                }
            });

            _trysteroRoom.onPeerLeave((peerId) => {
                if (peerId in this.gamePeers) {
                    console.log(` > Player #${this.gamePeers[peerId].playerNumber} (${this.gamePeers[peerId].address}) left the game`);
                    let newPeers = {...this.gamePeers };
                    delete newPeers[peerId];
                    this.gamePeers = { ...newPeers };
                    this.updatePlayers();
                }
            });
        },

        async getMessage(message, peerId) {
            console.log("tuxit: getMessage()");

            if (this.gameStatus == 1 && message.type == "id") {
                try {
                    let timeDiff = Math.abs(Date.now() - message.data.timestamp);
                    if (timeDiff < 10000) {
                        let receivedAddress = validateAndParseAddress(message.data.address);
                        let playerNumber = this.roomPlayers.indexOf(receivedAddress);
                        if (playerNumber >= 0) {
                            if (TuxitCrypto.verifySignature([number.toBN(message.data.timestamp)], message.data.signature, _keyPairs[playerNumber]).verified) {
                                this.gamePeers[peerId] = {
                                    playerNumber: playerNumber,
                                    address: receivedAddress
                                }
                                console.log(` > Player #${playerNumber} (${receivedAddress}) joined the game`);
                                this.updatePlayers();
                            } else { console.log(` > id rejected because provided signature could not be verified`); }
                        } else { console.log(` > id rejected because address has not joined the room`); }
                    } else { console.log(` > id rejected because timestamp is too old`); }
                } catch(err) {
                    console.log(err);
                }

            } else if (this.gameStatus == 2 && message.type == "sync_fixed") {
                try {
                    //01. First, validate the signature
                    let receivedFixed = JSON.parse(JSON.stringify(message.data.data));

                    const otherPlayerNumber = (this.playerNumber == 0)?1:0;
                    let verify = TuxitCrypto.verifySignature(receivedFixed, message.data.signatures[otherPlayerNumber], _keyPairs[otherPlayerNumber]);
                    if (!verify.verified) { throw Error("Wrong signature"); }

                    //02. Then, make sure that the fixed data is equal to the user's stored fixed data
                    if (verify.hashedData != this.gameFixed.hash) { throw Error("Wrong map hash"); }
                    
                    //03. Finally, if no signature (or invalid signature) was stored, replace it
                    if (this.gameFixed.signatures[otherPlayerNumber].length == 0 || 
                        this.gameFixed.signatures[otherPlayerNumber][0] != message.data.signatures[otherPlayerNumber][0] ||
                        this.gameFixed.signatures[otherPlayerNumber][1] != message.data.signatures[otherPlayerNumber][1]) {
                            this.gameFixed.signatures[otherPlayerNumber] = message.data.signatures[otherPlayerNumber];
                            let storedGameData = this.getLocalStorage();
                            storedGameData.fixed = this.gameFixed;
                            localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                    }

                    //04. Once Fixed data is synced, continue syncing the last checkpoint
                    this.gameStatus = 3;
                    setTimeout(() => {
                        if (this.gameFixed == null) { return this.gameStatus == -2; }
                        _sendMessage({type: "sync_checkpoint", data: this.gameCheckpoint});
                    }, 1000);

                } catch(err) {
                    console.log(err);
                    this.gameFixed = null
                    this.gameStatus = -2;
                }

            } else if (this.gameStatus >= 3 && message.type == "sync_checkpoint") {
                try {
                    //01. First, validate the signature
                    let receivedCheckpoint = JSON.parse(JSON.stringify(message.data.data));
                    
                    const otherPlayerNumber = (this.playerNumber == 0)?1:0;
                    let verify = TuxitCrypto.verifySignature(receivedCheckpoint, message.data.signatures[otherPlayerNumber], _keyPairs[otherPlayerNumber]);
                    if (!verify.verified) { throw Error("Wrong signature"); }

                    //02. Then, make sure that the checkpoint is equal to the user's stored checkpoint
                    if (verify.hashedData != this.gameCheckpoint.hash) {
                        
                        //03. If received checkpoint is different from the one stored, first decode the turn number
                        let _checkpoint = _gameStore.decodeCheckpoint(receivedCheckpoint);

                        //04. If the turn is equal to the local current state, verify, sign and save
                        if (_checkpoint.turn == (_gameStore.turn - 1)) {

                            let checkpoint = _gameStore.encodeCheckpoint();
                            let signedCheckpoint = TuxitCrypto.sign(checkpoint, _keyPairs[this.playerNumber]);

                            if (signedCheckpoint.hashedData == message.data.hash) {
                                message.data.signatures[this.playerNumber] = signedCheckpoint.signature;
                                this.gameCheckpoint = JSON.parse(JSON.stringify(message.data));

                                let storedGameData = this.getLocalStorage();
                                storedGameData.checkpoint = this.gameCheckpoint;
                                localStorage.setItem(this.localKey, JSON.stringify(storedGameData));

                                this.gameRequireCheckpoint = (_gameStore.turn - this.gameCheckpoint.turn > TURNS_FOR_CHECKPOINT);
                            } else {
                                //TODO: Consensus error!
                                this.gameStatus = -1;
                            }

                        } else if (_checkpoint.turn >= (_gameStore.turn - 1)) {

                            //TODO: If received checkpoint tun is greater than local current state:
                            //      1) Verify, sign, save and update if it has 2 signatures
                            //      2) Request a resync if it only has one

                        } else {
                            sendNewCheckpoint();
                        }

                    } else {
                        //04. If hash is the same, make sure the opponent's signature is stored
                        if (this.gameCheckpoint.signatures[otherPlayerNumber].length == 0 || 
                            this.gameCheckpoint.signatures[otherPlayerNumber][0] != message.data.signatures[otherPlayerNumber][0] ||
                            this.gameCheckpoint.signatures[otherPlayerNumber][1] != message.data.signatures[otherPlayerNumber][1]) {
                                this.gameCheckpoint.signatures[otherPlayerNumber] = message.data.signatures[otherPlayerNumber];
                                let storedGameData = this.getLocalStorage();
                                storedGameData.checkpoint = this.gameCheckpoint;
                                localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                    }}
                    
                    //04. Once last Checkpoint is synced, continue syncing action data
                    if (this.gameStatus == 3) {
                        this.gameStatus = 4;
                        setTimeout(() => {
                            if (this.gameCheckpoint == null) { return this.gameStatus == -3; }
                            _sendMessage({type: "sync_actions", data: this.gameActions});
                        }, 1000);
                    }
                } catch (err) {
                    console.log(err);
                    this.gameCheckpoint = null;
                    this.gameStatus = -3;
                }
            }  else if (this.gameStatus == 4 && message.type == "sync_actions") {

                let receivedActions = JSON.parse(JSON.stringify(message.data));
                let updated = false;

                for (let i=0; i<receivedActions.length; i++) {
                    if (this.gameActions.length > i) {
                        if (receivedActions[i].hash != this.gameActions[i].hash) {
                            //TODO: A double turn. If the turn signature is valid, the player has lost and a win can be claiemd
                        }
                    } else {
                        let verify = TuxitCrypto.verifySignature(receivedActions[i].data, receivedActions[i].signature, _keyPairs[receivedActions[i].player]);
                        if (verify.verified) {
                            this.gameActions.push(receivedActions[i]);
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    let storedGameData = this.getLocalStorage();
                    storedGameData.actions = this.gameActions;
                    localStorage.setItem(this.localKey, JSON.stringify(storedGameData));
                }

                try {
                    if (this.gameActions == null) { return this.gameStatus == -4; }
                    this.gameStatus = 5;
                    this.loadGameState();
                } catch (err) {
                    console.log(err);
                    this.gameCheckpoint = null;
                    this.gameStatus = -4;
                }


            } else if (this.gameStatus == 6 && message.type == "action") {

                let actionsData = [...message.data.data];
                
                const otherPlayerNumber = (this.playerNumber == 0)?1:0;
                let verify = TuxitCrypto.verifySignature(actionsData, message.data.signature, _keyPairs[otherPlayerNumber]);
                if (!verify.verified) { throw Error("Wrong signature in actions data"); }
                if (!verify.hashedData == message.data.hash) { throw Error("Wrong hash on actions data"); }
                
                if (!this.gameActions.some(e => e.hash === message.data.hash)) {
                    this.gameActions.push(message.data);
                    let storedGameData = this.getLocalStorage();
                    storedGameData.actions = this.gameActions;
                    localStorage.setItem(this.localKey, JSON.stringify(storedGameData));

                    _gameStore.doActions([[...message.data.data]]);

                    this.gameRequireCheckpoint = (_gameStore.turn - this.gameCheckpoint.turn > TURNS_FOR_CHECKPOINT);
                    if (this.gameRequireCheckpoint) { this.sendNewCheckpoint(); }
                }
            }
        },

        async updatePlayers() {
            console.log("tuxit: updatePlayers()");
            if (Object.keys(this.gamePeers).length == (this.gamePlayers - 1)) {
                this.gameStatus = 2;
                setTimeout(() => {
                    if (this.gameFixed == null) { return this.gameStatus == -2; }
                    _sendMessage({type: "sync_fixed", data: this.gameFixed});
                }, 1000);
            } else {
                this.gameStatus = 1;
            }
        },

        loadGameState() {
            console.log("tuxit: loadGameState()");
            if (this.gameFixed == null || this.gameCheckpoint == null || this.gameActions == null) {
                return this.gameStatus == -5;
            }

            try {
                _gameStore.loadGame(this.gameFixed.data, this.gameCheckpoint.data, this.gameActions.map(a => a.data));

                this.gameRequireCheckpoint = (_gameStore.turn - this.gameCheckpoint.turn > TURNS_FOR_CHECKPOINT);
                if (this.gameRequireCheckpoint) { this.sendNewCheckpoint(); }

                this.gameStatus = 6;

            } catch (err) {
                return this.gameStatus == -5;
            }
        },

        sendNewCheckpoint() {
            console.log("tuxit: sendNewCheckpoint()");
            try {
                let checkpoint = _gameStore.encodeCheckpoint();

                let signedCheckpoint = TuxitCrypto.sign(checkpoint, _keyPairs[this.playerNumber]);
                let newCheckpoint = {
                    turn: _gameStore.turn - 1,
                    data: checkpoint,
                    hash: signedCheckpoint.hashedData,
                    signatures: [[],[]]
                };
                newCheckpoint.signatures[this.playerNumber] = signedCheckpoint.signature;

                this.gameCheckpoint = newCheckpoint;
                
                _sendMessage({type: "sync_checkpoint", data: this.gameCheckpoint});

                this.gameRequireCheckpoint = (_gameStore.turn - this.gameCheckpoint.turn > TURNS_FOR_CHECKPOINT);
                
            } catch(err) {
                console.log(err)
            }


        },

        signAndSendAction(action) {
            console.log("tuxit: signAndSendAction()");
            try {
                //Triple checking everything just in case:
                // - Find the encoded turn number
                // - Verify it's the current player's turn
                // - Verify it's the current turn
                // - Verify the turn is not stored

                let decodedAction = _gameStore.decodeAction(action);

                if (_gameStore.turn != decodedAction.turn) { return null; }
                if (_gameStore.playerTurn != this.playerNumber) { return null; }
                if (this.gameActions.length > decodedAction.turn) {
                    //TODO: Force reload turns!
                    return null;
                }

                let _signedTurn = TuxitCrypto.sign(action, _keyPairs[this.playerNumber]);
                let turn = {
                    player: decodedAction.player,
                    turn: decodedAction.turn,
                    data: action,
                    hash: _signedTurn.hashedData,
                    signature: _signedTurn.signature
                };

                this.gameActions.push(turn);
                let storedGameData = this.getLocalStorage();
                storedGameData.actions = this.gameActions;
                localStorage.setItem(this.localKey, JSON.stringify(storedGameData));

                _sendMessage({type: "action", data: turn});
                _gameStore.doActions([turn.data]);

                this.gameRequireCheckpoint = (_gameStore.turn - this.gameCheckpoint.turn > TURNS_FOR_CHECKPOINT);
                if (this.gameRequireCheckpoint) { this.sendNewCheckpoint(); }

            } catch (err) {}
            return null;
        },

        async leave() {
            console.log("tuxit: leave()");
            if (_trysteroRoom != null) {
                _trysteroRoom.leave();
                _trysteroRoom = null;
                this.$patch({ ..._initialState });
            }
            _sendMessage = null;
            _getMessage = null;
        }
    }
});