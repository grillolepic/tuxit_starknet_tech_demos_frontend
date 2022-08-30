import { defineStore } from 'pinia'
import { useStarkNetStore } from './starknet'
import { Contract, number, ec, validateAndParseAddress } from "starknet";
import { tuxitContractAddress } from '@/helpers/blockchainConstants';
import tuxitAbi from './abis/tuxit.json' assert {type: 'json'};

let _initialState = {
    creatingRoom: false,
    closingRoom: false
}
let _tuxitContract = null;
let _starkNetStore = null;

export const useTuxitStore = defineStore({
    id: 'tuxit',
    state: () => ({ ..._initialState }),
    getters: {
        
    },
    actions: {
        
        async init() {
            console.log("tuxit: init()");
            _starkNetStore = useStarkNetStore();
            _tuxitContract = new Contract(tuxitAbi, tuxitContractAddress[_starkNetStore.chainId], _starkNetStore.starknet.account);
        },

        getGameTypeInfo(gameId) {
            let type, description;
            if (gameId == "manualComplete") {
                type = "Manual Turns with Complete Information";
                description = "Our most basic game-type. Players exchange turns manually via WebRTC (fully P2P) while game state is publicly available to all players";
          } else {
          }
          return { type, description };
        },

        async createRoom(gameId) {
            console.log("starknet: createRoom()");
            this.creatingRoom = true;

            try {
                const starkKeyPair = ec.genKeyPair();
                const starkKey = ec.getStarkKey(starkKeyPair);
                console.log(`Created new private key: ${starkKeyPair.getPrivate("hex")} => Stark key: ${starkKey}`);

                const transaction = await _tuxitContract.createRoom(gameId, starkKey, 60 * 5);
                console.log(transaction);
                await _starkNetStore.starknet.provider.waitForTransaction(transaction.transaction_hash);

                const status = await _starkNetStore.starknet.provider.getTransactionStatus(transaction.transaction_hash);
                console.log(status);

                const trace = await _starkNetStore.starknet.provider.getTransactionTrace(transaction.transaction_hash);
                console.log(trace);

                const lastGameRoomId = await this.getLastRoomId()
                
                localStorage.setItem(`${_tuxitContract.address}_room_${lastGameRoomId.toString()}`, JSON.stringify({ private_key: starkKeyPair.getPrivate("hex")}));

                return BigInt(lastGameRoomId.roomId.toString());
            } catch (err) {
                this.creatingRoom = false
                return null;
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

        async getRoom(roomId) {
            console.log("starknet: getRoom()");
            try {
                let room = await _tuxitContract.getGameRoom(roomId);
                return room.room;
            } catch (err) {
                return null;
            }
        },

        async isRoomFinished(roomId) {
            console.log("starknet: isRoomFinished()");
            const room = await this.getRoom(roomId);
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

        async joinRoomStatus(roomId) {
            console.log("starknet: joinRoomStatus()");
            const room = await this.getRoom(roomId);
            if (room == null) { throw Error("Room not found") }

            const status = room.status.toNumber();
            const owner_address = validateAndParseAddress("0x" + room.player_1_address.toString(16).padStart(64,"0"));
            const isCreator = (owner_address == _starkNetStore.address);
            const player_2_address = validateAndParseAddress("0x" + room.player_2_address.toString(16).padStart(64,"0"));
            const joined = [owner_address, player_2_address].includes(_starkNetStore.address);
            return { status, isCreator, joined }
        },

        getLocalStorage(roomId) {
            console.log("starknet: checkLocalStatus()");
            let storage = localStorage.getItem(`${_tuxitContract.address}_room_${roomId.toString()}`);
            if (storage != null) { return JSON.parse(storage); }
            return null;
        },

        async closeRoom(roomId) {
            this.closingRoom = true;
            try {
                const transaction = await _tuxitContract.exitRoom(number.toBN(roomId));
                console.log(transaction);
                await _starkNetStore.starknet.provider.waitForTransaction(transaction.transaction_hash);

                const status = await _starkNetStore.starknet.provider.getTransactionStatus(transaction.transaction_hash);
                console.log(status);

                const trace = await _starkNetStore.starknet.provider.getTransactionTrace(transaction.transaction_hash);
                console.log(trace);

                return true;
            } catch (err) {
                this.closingRoom = false
                return null;
            }
        }
    }
});