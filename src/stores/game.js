import { defineStore } from 'pinia'
import { DRNG } from '@/helpers/DRNG';
import { Noise } from '@/helpers/Noise';
import { TuxitCrypto } from '@/helpers/TuxitCrypto';

let _initialState = {
    turn: null,
    map: null,
    startPoints: null,
    players: [
        { index: 0, x:0, y:0, orientation: 0, pears: 0, oranges: 0, apples: 0 },
        { index: 1, x:0, y:0, orientation: 0, pears: 0, oranges: 0, apples: 0 }
    ],
    finished: false,
    winner: null,
    shots: null,
    totalPlayers: null,
    gridSize: null
}

export const useGameStore = defineStore({
    id: 'game',
    state: () => ({ ..._initialState }),
    getters: {
        playerTurn: (state) => (state.turn==null || state.players.length == 0)?null:state.players[state.turn%state.players.length].index,
        currentState: (state) => { return { turn: state.turn, players: state.players, finished: state.finished, winner: state.winner, shots: state.shots }; }
    },
    actions: {

        playerInTurn(turn) { return (this.players.length == 0)?null:this.players[turn%this.players.length].index; },

        reset() {
            console.log("game: reset()");
            this.$patch({ ..._initialState });
        },

        create(random_seed) {
            console.log("game: createMap()");
            this.reset();

            const GRID_SIZE = 16;
            const TOTAL_PLAYERS = 2;
            const LAND_LIMIT = 0.3;
            const OBSTACLE_LIMIT = 0.7;
            
            let input_seed = BigInt(random_seed);
            console.log(`Random Seed: ${input_seed}`);

            //01. Create map from Random Seed and store as flot grid
            let nextSeed = DRNG.seed(input_seed);
            let resultA = Noise.noiseGrid(GRID_SIZE, 2, nextSeed);
            let resultA_contrast = Noise.contrast(resultA.grid, 0.4, 0.75);           
            let resultB = Noise.noiseGrid(GRID_SIZE, 4, resultA.newSeed);
            let resultB_contrast = Noise.contrast(resultB.grid, 0.3, 0.75);
            let resultC = Noise.noiseGrid(GRID_SIZE, 8, resultB.newSeed);
            let resultC_contrast = Noise.contrast(resultC.grid, 0.3, 0.75);
            let addAB = Noise.addGrids(resultA_contrast, resultB_contrast, 0.5);
            let addABC = Noise.addGrids(addAB, resultC_contrast, 0.25);
            let shape = Noise.shapeGrid(GRID_SIZE, 0);
            let shape_contrast = Noise.contrast(shape, 0, 0.5);
            let finalGrid = Noise.multiplyGrids(addABC, shape_contrast);
            let obstacles = Noise.noiseGrid(GRID_SIZE, 8, resultC.newSeed);

            // map:
            // 0: water
            // 1: water with obstacle
            // 2: land
            // 3: land with grass
            // 4: land with obstacle
            // 5: starting position for player 1
            // 6: starting position for player 2

            let map = [];
            for (let i=0; i<finalGrid.length; i++) {
                let isLand = (finalGrid[i].toFloat() >= LAND_LIMIT)?1:0;
                let hasGrass = (finalGrid[i].toFloat() >= (LAND_LIMIT*2.5))?1:0;
                let isObstacle = (obstacles.grid[i].toFloat() >= OBSTACLE_LIMIT)?1:0;
                if (!isLand && !isObstacle) { map.push(0); }
                else if (!isLand && isObstacle) { map.push(1); }
                else if (isLand && !hasGrass && !isObstacle) { map.push(2); }
                else if (isLand && hasGrass && !isObstacle) { map.push(3); }
                else if (isLand && isObstacle) { map.push(4); }
            };

            //02. Remove obstacles from border land tiles
            function coordToAbs(c, g) { return c[1]*g + c[0]; }
            function isWater(m, i) { if (i<0 || i>=m.length) { return false; } return (m[i]<2); }
            function isBorderLand(m, i, g) { return (isWater(m, i-g) || isWater(m, i-1) || isWater(m, i+1) || isWater(m, i+g)); }

            for (let i=0;i<map.length; i++) {
                if(map[i] == 4 && isBorderLand(map, i, GRID_SIZE)) {
                    map[i] = 3;
                }
            };

            //03. Find starting points and set them on the map
            let foundLand = false;
            let findingLandDirection = 0;
            let findingLandLength = 1;
            let findingLandCount = 0;
            let start_0 = [GRID_SIZE/2, GRID_SIZE/2];
            let start_1, start_2;
            let player1direction = 0;
            let player2direction = 2;

            for (let i=0; i<100; i++) {
                if (!foundLand) {
                    if (map[coordToAbs(start_0, GRID_SIZE)] == 2) {
                        foundLand = true;
                        start_1 = [...start_0];
                        start_2 = [...start_0];
                    } else {
                        if (findingLandDirection == 0) { start_0[0]++; }
                        if (findingLandDirection == 1) { start_0[1]--; }
                        if (findingLandDirection == 2) { start_0[0]--; }
                        if (findingLandDirection == 3) { start_0[1]++; }
                        findingLandCount++;
                        if (findingLandCount == findingLandLength) {
                            findingLandCount = 0;
                            findingLandDirection++;
                            if (findingLandDirection > 3) { findingLandDirection = 0}
                            if (findingLandDirection % 2 == 0) { findingLandLength++ }
                        }
                    }
                } else {
                    let newTempStart1 = [...start_1];
                    if (player1direction == 0) { newTempStart1[1]--; }
                    if (player1direction == 1) { newTempStart1[0]--; }
                    if (player1direction == 2) { newTempStart1[1]++; }
                    if (player1direction == 3) { newTempStart1[0]++; }
                
                    const newValue1 = map[coordToAbs(newTempStart1, GRID_SIZE)];
                    if (newValue1 == 2 || newValue1 == 3) {
                        start_1 = [...newTempStart1];
                        if (player1direction == 2) { player1direction = 0; }
                        if (player1direction == 3) { player1direction = 1; }
                    } else {
                        player1direction++;
                        if (player1direction > 3) { player1direction = 0; }
                    }

                    let newTempStart2 = [...start_2];
                    if (player2direction == 0) { newTempStart2[1]--; }
                    if (player2direction == 1) { newTempStart2[0]--; }
                    if (player2direction == 2) { newTempStart2[1]++; }
                    if (player2direction == 3) { newTempStart2[0]++; }
                    
                    const newValue2 = map[coordToAbs(newTempStart2, GRID_SIZE)];
                    if (newValue2 == 2 || newValue2 == 3) {
                        start_2 = [...newTempStart2];
                        if (player2direction == 0) { player2direction = 3; }
                        if (player2direction == 1) { player2direction = 2; }
                    } else {
                        player2direction++;
                        if (player2direction > 3) { player2direction = 0; }
                    }
                    
                    if ((Math.abs(start_1[0]-start_2[0]) + Math.abs(start_1[1]-start_2[1])) >= 16) { break; }
                }
            }

            map[coordToAbs(start_1, GRID_SIZE)] = 5;
            map[coordToAbs(start_2, GRID_SIZE)] = 6;

            //04. Calculate player order and initial orientation with DRNG
            let turnOrder = DRNG.next(obstacles.newSeed);
            let playerIndices = [];

            while(playerIndices.length < TOTAL_PLAYERS) {
                let _player = Number(turnOrder.result % BigInt(TOTAL_PLAYERS));
                while (playerIndices.includes(_player)) {
                    _player++;
                    if (_player >= TOTAL_PLAYERS) { _player = 0; }
                }
                playerIndices.push(_player);
                turnOrder = DRNG.next(turnOrder.newSeed);
            }

            let orientationRandom1 = DRNG.next(turnOrder.newSeed);
            let orientationRandom2 = DRNG.next(orientationRandom1.newSeed);
            let orientation1 = Number(orientationRandom1.result % 4n);
            let orientation2 = Number(orientationRandom2.result % 4n);

            //05. Compress map and players number and indices into array of felts (251 bit numbers), with each tile/index using 3 bits.
            let fixedGameData = TuxitCrypto.toFelts([
                { data: GRID_SIZE, bits: 8 },
                { data: (GRID_SIZE**2), bits: 32 },
                { data: map, bits: 3 },
                { data: TOTAL_PLAYERS, bits: 3},
                { data: playerIndices, bits: 3}
            ]);

            //06. Compress initial state into array of felts (251 bit numbers):
            const initialApples = 8;
            const initialOranges = 4;
            const initialPears = 2;

            let firstCheckpoint = TuxitCrypto.toFelts([
                {data: 0, bits: 32 }, {data: 0, bits: 1 }, {data: 0, bits: 3, forceNext: true}, //TURN, FINISHED, WINNER
                {data: (start_1[0]), bits: 64},    {data: (start_1[1]), bits: 64},    {data: orientation1, bits: 8},
                {data: initialApples, bits: 16},   {data: initialOranges, bits: 16},  {data: initialPears, bits: 16, forceNext: true},
                {data: (start_2[0]), bits: 64},    {data: (start_2[1]), bits: 64},    {data: orientation2, bits: 8},
                {data: initialApples, bits: 16},   {data: initialOranges, bits: 16},  {data: initialPears, bits: 16}
            ]);
            
            return { fixed: fixedGameData, state: firstCheckpoint };
        },

        decodeFixed(fixed) {
            try {
                let decoded = TuxitCrypto.fromFelts(fixed, [
                    { name: 'gridSize', bits: 8 },
                    { name: 'gridArea', bits: 32 },
                    { name: 'map', bits: 3, length: 'prev' },
                    { name: 'totalPlayers', bits: 3},
                    { name: 'playerIndices', bits: 3, length: 'prev' }
                ]);

                //TODO: Verify if not corrupted

                return decoded;
            } catch (err) {
                console.log(err);
                throw Error("Could not load fixed game data");
            }
        },

        decodeCheckpoint(checkpoint) {
            try {
                let decoded = TuxitCrypto.fromFelts(checkpoint, [
                    { name: 'turn', bits: 32 }, { name: 'finished', bits: 1 }, { name: 'winner', bits: 3, forceNext: true},
                    { name: 'player_1_x', bits: 64 }, { name: 'player_1_y', bits: 64 }, { name: 'player_1_orientation', bits: 8 },
                    { name: 'player_1_apples', bits: 16 },{ name: 'player_1_oranges', bits: 16 }, { name: 'player_1_pears', bits: 16, forceNext: true},
                    { name: 'player_2_x', bits: 64 }, { name: 'player_2_y', bits: 64 }, { name: 'player_2_orientation', bits: 8 },
                    { name: 'player_2_apples', bits: 16 },{ name: 'player_2_oranges', bits: 16 }, { name: 'player_2_pears', bits: 16},
                ]);

                //TODO: Verify if not corrupted

                //TODO: load additional checkpoint data
                //This will require an undefined length in 'fromFelts' that keeps looking for a data structure until end
            
                return decoded;
            } catch (err) {
                console.log(err);
                throw Error("Could not decode Checkpoint");
            }
        },

        decodeAction(action) {
            try {
                let decoded = TuxitCrypto.fromFelts(action, [
                    { name: 'turn', bits: 32 },
                    { name: 'player', bits: 3 },
                    { name: 'action', bits: 8 }
                ]);

                //TODO: Verify if not corrupted

                return decoded;
            } catch (err) {
                console.log(err);
                throw Error("Could not decode Checkpoint");
            }
        },

        loadGame(fixed, checkpoint, actions) {

            if (fixed.length != 4) { throw Error("Wrong fixed size"); }
            if (checkpoint.length < 3) { throw Error("Wrong checkpoint size"); }

            function absToCoord(a, g) { return {x: (a%g), y: Math.floor(a/g)}; }

            let decodedFixed = this.decodeFixed(fixed);
            let decodedCheckpoint = this.decodeCheckpoint(checkpoint);

            let _players = [
                {
                    index: decodedFixed.playerIndices[0],
                    x: decodedCheckpoint.player_1_x,
                    y: decodedCheckpoint.player_1_y,
                    orientation: decodedCheckpoint.player_1_orientation,
                    apples: decodedCheckpoint.player_1_apples,
                    oranges: decodedCheckpoint.player_1_oranges,
                    pears: decodedCheckpoint.player_1_pears
                },{
                    index: decodedFixed.playerIndices[1],
                    x: decodedCheckpoint.player_2_x,
                    y: decodedCheckpoint.player_2_y,
                    orientation: decodedCheckpoint.player_2_orientation,
                    apples: decodedCheckpoint.player_2_apples,
                    oranges: decodedCheckpoint.player_2_oranges,
                    pears: decodedCheckpoint.player_2_pears
                }
            ];

            let _startPoints = [{},{}];
            for (let i=0; i<decodedFixed.map.length; i++) {
                if (decodedFixed.map[i] == 5) { _startPoints[0] = absToCoord(i); }
                if (decodedFixed.map[i] == 6) { _startPoints[1] = absToCoord(i); }
            }

            this.$patch({
                totalPlayers: decodedFixed.totalPlayers,
                gridSize: decodedFixed.gridSize,
                turn: decodedCheckpoint.turn + 1,
                map: decodedFixed.map,
                startPoints: _startPoints,
                players: _players,
                shots: [],
                finished: (decodedCheckpoint.finished == 1),
                winner: (decodedCheckpoint.finished == 1)?decodedCheckpoint.winner:null
            });

            this.doActions(actions, decodedCheckpoint.turn);
        },

        processAction(code, state, playerNumber) {
            console.log("game: processAction()");

            function coordToAbs(c, g) { return c[1]*g + c[0]; }

            try {
                //01.First, clone the provided state
                state = JSON.parse(JSON.stringify(state));

                //02.Check if the game is not already finished. If so, action is invalid.
                if (state.finished) { return null; }
                
                //03. Then, verify that the current turn belongs to the player. If not, action is invalid.
                let _playerTurn = this.players[state.turn%this.players.length].index;
                if (_playerTurn != playerNumber) { return null; }

                //04. Change the state depending on the code. If code is not one of the allowed key codes, action is invalid.
                if (code == 37) { state.players[playerNumber].x--; }
                else if (code == 38) { state.players[playerNumber].y--; }
                else if (code == 39) { state.players[playerNumber].x++; }
                else if (code == 40) { state.players[playerNumber].y++; }
                else { return null; }

                //05. Verify that the character's new position is allowed, if not, reverse and try to change only orientation. If orientation is the same, action is invalid.
                let _characterAbsCoord = coordToAbs([state.players[playerNumber].x, state.players[playerNumber].y], this.gridSize);
                
                //0: water, 1: water with obstacle, 4: land with obstacle
                if ([0,1,4].includes(this.map[_characterAbsCoord])) {
                    if (state.players[playerNumber].orientation == (40 - code)) {
                        return null;
                    } else {
                        if (code == 37) { state.players[playerNumber].x++; }
                        else if (code == 38) { state.players[playerNumber].y++; }
                        else if (code == 39) { state.players[playerNumber].x--; }
                        else if (code == 40) { state.players[playerNumber].y--; }
                    }
                } 

                state.players[playerNumber].orientation = 40 - code;

                for (let i=0; i<this.totalPlayers; i++) {
                    if (i != playerNumber) {
                        let _opponentAbsCoord = coordToAbs([state.players[i].x, state.players[i].y], this.gridSize);    
                        if (_characterAbsCoord == _opponentAbsCoord) { return null; }

                        //06. Check if the player has reached the starting position of an opponent. If so, finish the game and make him the winner.
                        if  (this.map[_characterAbsCoord] == (5+i)) {
                            state.finished = true;
                            state.winner = playerNumber;
                        }
                    }
                }

                //TODO: Process shots and hits!

                //07. Update turn number
                state.turn++;

                return state;

            } catch (err) {
                return null;
            }
        },

        encodeCheckpoint() {
            console.log("game: encodeCheckpoint()");
            try {
                let checkpoint = TuxitCrypto.toFelts([
                    {data: this.turn, bits: 32 }, {data: (this.finished)?1:0, bits: 1 }, {data: (this.winner != null)?this.winner:0, bits: 3, forceNext: true}, //TURN, FINISHED, WINNER
                    {data: this.players[0].x, bits: 64},        {data: this.players[0].y, bits: 64},        {data: this.players[0].orientation, bits: 8},
                    {data: this.players[0].apples, bits: 16},   {data: this.players[0].oranges, bits: 16},  {data: this.players[0].pears, bits: 16, forceNext: true},
                    {data: this.players[1].x, bits: 64},        {data: this.players[1].y, bits: 64},        {data: this.players[1].orientation, bits: 8},
                    {data: this.players[1].apples, bits: 16},   {data: this.players[1].oranges, bits: 16},  {data: this.players[1].pears, bits: 16, forceNext: true},
                ]);

                //TODO: ADD OBJECTS!

                return checkpoint;
            } catch (err) {
                throw err;
            }
        },
        
        encodeAction(keyboardEvent, playerNumber) {
            console.log("game: encodeAction()");
            try {
                if (keyboardEvent.type == "keydown") {
                    let _actionResult = this.processAction(keyboardEvent.keyCode, this.currentState, playerNumber);
                    if (_actionResult != null) {
                        let turnData = TuxitCrypto.toFelts([
                            { data: this.turn, bits: 32 },
                            { data: playerNumber, bits: 3 },
                            { data: keyboardEvent.keyCode, bits: 8 }
                        ]);
                        return turnData;
                    }
                }
            } catch (err) {}
            return null;
        },

        doActions(actions, from=0) {
            console.log("game: doActions()");
            try {
                for (let i=from; i<actions.length; i++) {

                    let decodedAction = this.decodeAction(actions[i]);

                    if (decodedAction.turn == this.turn) {
                        let newState = this.processAction(decodedAction.action, this.currentState, this.playerTurn);
                        if (newState != null) {
                            this.$patch({
                                turn: newState.turn,
                                players: JSON.parse(JSON.stringify(newState.players)),
                                finished: newState.finished,
                                winner: newState.winner,
                                shots: JSON.parse(JSON.stringify(newState.shots))
                            });
                        } else {
                            throw Error(`Couldn't process turn #${decodedAction.turn}`);
                        }
                    }
                }
            } catch (err) {
                console.log(err);
                //TODO: An invalid, signed turn would mean a defeat for the player.
            }
        }
    }
});