import { defineStore } from 'pinia'
import { useStarkNetStore } from './starknet'
import { Contract, number, ec, validateAndParseAddress } from "starknet";
import { tuxitContractAddress } from '@/helpers/blockchainConstants';
import tuxitAbi from './abis/tuxit.json' assert {type: 'json'};

let _initialState = {
    loadingPreviousRooms: false,

    gameId: null,
    gameName: null,
    gameDescription: null,
    unfinishedRoomId : null,

    loadingRoom: false,
    roomId: null,
    roomPlayer1: null,
    roomPlayer2: null,
    roomDeadline: null,
    roomStatus: null,
    roomCreator: false,
    roomJoined: false,
    roomPrivateKeyLost: false,

    creatingRoom: false,
    closingRoom: false,
    joiningRoom: false,
    
}
let _tuxitContract = null;
let _starkNetStore = null;

export const useTuxitStore = defineStore({
    id: 'tuxit',
    state: () => ({ ..._initialState }),
    getters: {
        turnMode: (state) => (["manualComplete"].includes(state.gameId))?'manual':'auto'
    },
    actions: {
        
        async init() {
            console.log("tuxit: init()");
            _starkNetStore = useStarkNetStore();
            _tuxitContract = new Contract(tuxitAbi, tuxitContractAddress[_starkNetStore.chainId], _starkNetStore.starknet.account);
        },

        reset() {
            this.$patch({ ..._initialState });
        },

        async loadGame(gameId, lookForUnfinishedGame = true) {
            if (gameId == 0) {
                this.$patch({
                    gameId: gameId,
                    gameName: "Manual Turns with Complete Information",
                    gameDescription: "Our most basic game-type. Players exchange turns manually via WebRTC (fully P2P) while game state is publicly available to all players"
                });
            } else {
                this.$patch({ gameId: null, gameName: null, gameDescription: null});
            }

            if (gameId != null && lookForUnfinishedGame) {
                this.loadingPreviousRooms = true;
                let lastRoomId = await this.getLastRoomId();
                if (lastRoomId != null) {
                  if (await this.isRoomFinished(lastRoomId)) { lastRoomId = null; }
                }
                this.$patch({
                    unfinishedRoomId: (lastRoomId != null)?BigInt(lastRoomId.toString()):null,
                    loadingPreviousRooms: false
                });
            }
        },

        async createRoom(gameId) {
            console.log("starknet: createRoom()");
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
                this.unfinishedRoomId = BigInt(lastRoomId.toString());

            } catch (err) {
                this.creatingRoom = false;
            }
        },

        async getLastRoomId() {
            console.log("starknet: getLastRoomId()");
            const totalRooms = await _tuxitContract.getPlayerTotalRooms(_starkNetStore.address);
            if (totalRooms.total.gt(number.toBN(0))) {
                let lastIndex = totalRooms.total.sub(number.toBN(1));
                const lastGameRoomId = await _tuxitContract.getPlayerGameRoomByIndex(_starkNetStore.address, lastIndex);
                return lastGameRoomId.roomId;
            }
            return null;
        },

        async loadRoom(roomId) {
            this.loadingRoom = true;
            const room = await this.getRoom(roomId);
            if (room == null) { return; }

            const gameId = room.gameId.toNumber();
            if (this.gameId != gameId) {
                await this.loadGame(gameId, false);
            }

            const status = room.status.toNumber();
            const owner_address = validateAndParseAddress("0x" + room.player_1_address.toString(16).padStart(64,"0"));
            const player_2_address = validateAndParseAddress("0x" + room.player_2_address.toString(16).padStart(64,"0"));
            const player_joined = [owner_address, player_2_address].includes(_starkNetStore.address);
            const localData = this.getLocalStorage(roomId);

            const isFinished = await this.isRoomFinished(null, room);
            if (!isFinished) {
                this.$patch({
                    roomId: roomId,
                    roomStatus: status,
                    roomCreator: (owner_address == _starkNetStore.address),
                    roomJoined: player_joined,
                    roomPrivateKeyLost: player_joined && ((localData == null) || !("private_key" in localData)),
                    roomPlayer1: owner_address,
                    roomPlayer2: player_2_address,
                    roomDeadline: room.deadline.toNumber(),
                    loadingRoom: false
                });
            }
        },
       
        async getRoom(roomId) {
            console.log("starknet: getRoom()");
            try {
                let room = await _tuxitContract.getGameRoom(roomId);
                return room.room;
            } catch (err) {
                return null;
            }
        },

        async isRoomFinished(roomId, room = null) {
            console.log("starknet: isRoomFinished()");
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

        getLocalStorage(roomId) {
            console.log("starknet: checkLocalStatus()");
            let storage = localStorage.getItem(`${_tuxitContract.address}_room_${roomId.toString()}`);
            if (storage != null) { return JSON.parse(storage); }
            return null;
        },

        async closeRoom(roomId) {
            console.log("starknet: closeRoom()");
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
            console.log("starknet: joinRoom()");
            this.joiningRoom = true;

            if (this.roomId == null) { return this.creatingRoom = false; }

            try {
                const starkKeyPair = ec.genKeyPair();
                const starkKey = ec.getStarkKey(starkKeyPair);

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
                    roomJoined: true,
                    roomPlayer2: _starkNetStore.address
                });

            } catch (err) {
                this.joiningRoom = false;
            }
        }
    }
});