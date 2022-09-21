import { defineStore } from 'pinia'
import { DRNG } from '@/helpers/DRNG';
import { Noise } from '@/helpers/Noise';
import { TuxitCrypto } from '@/helpers/TuxitCrypto';

let _initialState = {
    turn: null,
    map: null,
    startPoints: null,
    players: [
        { index: 0, x:0, y:0, orientation: 0, pears: 0, oranges: 0, apples: 0, hit: false },
        { index: 1, x:0, y:0, orientation: 0, pears: 0, oranges: 0, apples: 0, hit: false }
    ],
    finished: false,
    winner: null,
    lastShotId: null,
    shots: null,
    totalPlayers: null,
    gridWidth: null
}

export const useGameStore = defineStore({
    id: 'game',
    state: () => ({ ..._initialState }),
    getters: {
        playerTurn: (state) => (state.turn==null || state.players.length == 0)?null:state.players[state.turn%state.players.length].index,
        currentState: (state) => { return { turn: state.turn, players: state.players, finished: state.finished, winner: state.winner, shots: state.shots, lastShotId: state.lastShotId }; }
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

            //05. Compress map and players number and indices into array of 128 bit numbers, with each tile/index using 3 bits.
            let fixedGameData = TuxitCrypto.toFelts([
                { data: GRID_SIZE, bits: 8 },
                { data: (GRID_SIZE**2), bits: 16 },
                { data: map, bits: 3 },
                { data: TOTAL_PLAYERS, bits: 3},
                { data: playerIndices, bits: 3}
            ]);

            //06. Compress initial state into array of 128 bit numbers:
            const initialApples = 8;
            const initialOranges = 4;
            const initialPears = 2;

            let firstCheckpoint = TuxitCrypto.toFelts([
                {data: 0, bits: 32 }, {data: 0, bits: 32 }, {data: 0, bits: 1 }, {data: 0, bits: 3, forceNext: true}, //TURN, LAST_SHOT_ID, FINISHED, WINNER
                {data: (start_1[0]), bits: 32},    {data: (start_1[1]), bits: 32},    {data: orientation1, bits: 2},    {data: 0, bits: 1},
                {data: initialApples, bits: 16},   {data: initialOranges, bits: 16},  {data: initialPears, bits: 16, forceNext: true},
                {data: (start_2[0]), bits: 32},    {data: (start_2[1]), bits: 32},    {data: orientation2, bits: 2},    {data: 0, bits: 1},
                {data: initialApples, bits: 16},   {data: initialOranges, bits: 16},  {data: initialPears, bits: 16}
            ]);

            firstCheckpoint.push("0x0"); //LAST_HASH (for turn 0, there is no first hash);
            
            return { fixed: fixedGameData, state: firstCheckpoint };
        },

        decodeFixed(fixed) {
            try {
                let decoded = TuxitCrypto.fromFelts(fixed, [
                    { name: 'gridWidth', bits: 8 },
                    { name: 'gridArea', bits: 16 },
                    { name: 'map', bits: 3, length: 'prev' },
                    { name: 'totalPlayers', bits: 3},
                    { name: 'playerIndices', bits: 3, length: 'prev' }
                ]);

                return decoded;
            } catch (err) {
                console.log(err);
                throw Error("Could not load fixed game data");
            }
        },

        decodeCheckpoint(checkpoint) {
            try {
                checkpoint = JSON.parse(JSON.stringify(checkpoint));
                let lastActionHash = checkpoint.pop();

                let statusPart = checkpoint.slice(0,3);

                let decodedStatus = TuxitCrypto.fromFelts(statusPart, [
                    { name: 'turn', bits: 32 }, { name: 'lastShotId', bits: 32, type: 'hex' }, { name: 'finished', bits: 1, type: 'bool' }, { name: 'winner', bits: 3, forceNext: true},
                    { name: 'player_1_x', bits: 32 }, { name: 'player_1_y', bits: 32 }, { name: 'player_1_orientation', bits: 2 }, { name: 'player_1_hit', bits: 1, type: 'bool' },
                    { name: 'player_1_apples', bits: 16 },{ name: 'player_1_oranges', bits: 16 }, { name: 'player_1_pears', bits: 16, forceNext: true},
                    { name: 'player_2_x', bits: 32 }, { name: 'player_2_y', bits: 32 }, { name: 'player_2_orientation', bits: 2 }, { name: 'player_2_hit', bits: 1, type: 'bool' },
                    { name: 'player_2_apples', bits: 16 },{ name: 'player_2_oranges', bits: 16 }, { name: 'player_2_pears', bits: 16},
                ]);

                let playersList = [
                    {
                        x: decodedStatus.player_1_x,
                        y: decodedStatus.player_1_y,
                        orientation: decodedStatus.player_1_orientation,
                        pears: decodedStatus.player_1_pears,
                        oranges: decodedStatus.player_1_oranges,
                        apples: decodedStatus.player_1_apples,
                        hit: decodedStatus.player_1_hit
                    }, {
                        x: decodedStatus.player_2_x,
                        y: decodedStatus.player_2_y,
                        orientation: decodedStatus.player_2_orientation,
                        pears: decodedStatus.player_2_pears,
                        oranges: decodedStatus.player_2_oranges,
                        apples: decodedStatus.player_2_apples,
                        hit: decodedStatus.player_2_hit
                    }
                ];

                let shotsPart = checkpoint.slice(3, checkpoint.length);
                let shotList = [];
                for (let i=0; i<shotsPart.length; i++) {
                    let shot = TuxitCrypto.fromFelts([shotsPart[i]], [
                        { name: 'id', bits: 32, type: 'hex' }, { name: 'x', bits: 32}, { name: 'y', bits: 32}, { name: 'type', bits: 2 }, { name: 'direction', bits: 2, forceNext: true} 
                    ]);
                    shotList.push({
                        id: shot.id,
                        type: shot.type,
                        current: { x: shot.x, y: shot.y },
                        direction: shot.direction,
                        hit: false,
                        destroy: null
                    });
                }
            
                return {
                    turn: decodedStatus.turn,
                    finished: decodedStatus.finished,
                    winner: decodedStatus.finished?decodedStatus.winner:null,
                    players: playersList,
                    shots: shotList,
                    lastShotId: decodedStatus.lastShotId,
                    lastActionHash: lastActionHash
                };
            } catch (err) {
                console.log(err);
                throw Error("Could not decode Checkpoint");
            }
        },

        decodeAction(action) {
            try {
                action = JSON.parse(JSON.stringify(action));
                let lastActionHash = action.pop();
                let decoded = TuxitCrypto.fromFelts(action, [
                    { name: 'turn', bits: 32 },
                    { name: 'player', bits: 3 },
                    { name: 'action', bits: 8, forceNext: true}
                ]);
                decoded["last_turn_hash"] = lastActionHash;
                return decoded;
            } catch (err) {
                console.log(err);
                throw Error("Could not decode Checkpoint");
            }
        },

        loadGame(fixed, checkpoint, actions) {

            if (fixed.length != 7) { throw Error("Wrong fixed size"); }
            if (checkpoint.length < 3) { throw Error("Wrong checkpoint size"); }

            function absToCoord(a, g) { return {x: (a%g), y: Math.floor(a/g)}; }

            let decodedFixed = this.decodeFixed(fixed);
            let decodedCheckpoint = this.decodeCheckpoint(checkpoint);

            decodedCheckpoint.players[0].index = decodedFixed.playerIndices[0];
            decodedCheckpoint.players[1].index = decodedFixed.playerIndices[1];

            let _startPoints = [{},{}];
            for (let i=0; i<decodedFixed.map.length; i++) {
                if (decodedFixed.map[i] == 5) { _startPoints[0] = absToCoord(i); }
                if (decodedFixed.map[i] == 6) { _startPoints[1] = absToCoord(i); }
            }

            this.$patch({
                totalPlayers: decodedFixed.totalPlayers,
                gridWidth: decodedFixed.gridWidth,
                turn: decodedCheckpoint.turn + 1,
                map: decodedFixed.map,
                startPoints: _startPoints,
                players: decodedCheckpoint.players,
                shots: decodedCheckpoint.shots,
                lastShotId: decodedCheckpoint.lastShotId,
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
                let isMovement = true;

                if (code == 37) { state.players[playerNumber].x--; }
                else if (code == 38) { state.players[playerNumber].y--; }
                else if (code == 39) { state.players[playerNumber].x++; }
                else if (code == 40) { state.players[playerNumber].y++; }
                else {
                    isMovement = false;

                    if ([90,88,67].includes(code)) {
                        let hasFruit = (state.players[playerNumber].apples > 0 && code == 90) ||
                                       (state.players[playerNumber].oranges > 0 && code == 88) ||
                                       (state.players[playerNumber].pears > 0 && code == 67);

                        if (hasFruit) {

                            function getTypeFromCode(code) { 
                                if (code == 90) return 0;
                                if (code == 88) return 1;
                                if (code == 67) return 2;
                                return null;
                            }

                            function nextShotId(lastShot) {
                                if (lastShot == null) { return "0x0"; }
                                return "0x" + (BigInt(lastShot) + 1n).toString(16);
                            }

                            let newId = nextShotId(state.lastShotId);
                            state.lastShotId = newId;

                            state.shots.push({
                                id: newId,
                                type: getTypeFromCode(code),
                                current: {
                                    x: state.players[playerNumber].x,
                                    y: state.players[playerNumber].y
                                },
                                direction: state.players[playerNumber].orientation,
                                hit: false,
                                destroy: null
                            });
                            if (code == 90) { state.players[playerNumber].apples--; }
                            if (code == 88) { state.players[playerNumber].oranges--; }
                            if (code == 67) { state.players[playerNumber].pears--; }
                        } else { return null; }
                    }
                    else { return null; }
                }

                //05.If the turn was a movement, process the movement:
                if (isMovement) {
                    //06. Verify that the character's new position is allowed, if not, reverse and try to change only orientation. If orientation is the same, action is invalid.
                    let _characterAbsCoord = coordToAbs([state.players[playerNumber].x, state.players[playerNumber].y], this.gridWidth);
                
                    //0: water, 1: water with obstacle, 4: land with obstacle
                    if ([0,1,4].includes(this.map[_characterAbsCoord])) {
                        if (state.players[playerNumber].orientation == (40 - code)) {
                            return null;
                        } else {
                            if (code == 37) { state.players[playerNumber].x++; }
                            else if (code == 38) { state.players[playerNumber].y++; }
                            else if (code == 39) { state.players[playerNumber].x--; }
                            else if (code == 40) { state.players[playerNumber].y--; }
                    }} 

                    state.players[playerNumber].orientation = 40 - code;

                    //07. Check for collision between players
                    for (let i=0; i<this.totalPlayers; i++) {
                        if (i != playerNumber) {
                            let _opponentAbsCoord = coordToAbs([state.players[i].x, state.players[i].y], this.gridWidth);    
                            if (_characterAbsCoord == _opponentAbsCoord) { return null; }
                        }
                    }
                }

                //08.Process shots:
                //About SHOTS: some information is added to the shots Array that will be only used by the animation engine:
                //Hit, the starting position and the coordinates where destroyed
                let SHOTS = [];
                for (let i=0; i<state.shots.length; i++) {
                    state.shots[i].start = JSON.parse(JSON.stringify(state.shots[i].current));
                    if (state.shots[i].destroy == null && !state.shots[i].hit) {
                        SHOTS.push(state.shots[i]);
                    }
                }

                //Loop through max amount of distance traveled
                for (let t=0; t<4; t++) {
                    //Loop through each shot and make the move if type allows it
                    for (let i=0; i<SHOTS.length; i++) {
                        //09. First find out if the shot should be moving
                        if (!SHOTS[i].hit && SHOTS[i].destroy == null && ((t - SHOTS[i].type) < 2)) {

                            //10. Add the movement
                            if (SHOTS[i].direction == 3) { SHOTS[i].current.x--; }
                            else if (SHOTS[i].direction == 2) { SHOTS[i].current.y--; }
                            else if (SHOTS[i].direction == 1) { SHOTS[i].current.x++; }
                            else if (SHOTS[i].direction == 0) { SHOTS[i].current.y++; }
                            else { return null; }

                            //11. Destroy if it went out of limits
                            if (SHOTS[i].current.x < 0 || SHOTS[i].current.x > this.gridWidth || SHOTS[i].current.y < 0 || SHOTS[i].current.y > this.gridWidth) {
                                SHOTS[i].destroy = { x: SHOTS[i].current.x, y: SHOTS[i].current.y };
                            }

                            //12. Destroy if it has hit an obstacle
                            if (!SHOTS[i].hit && SHOTS[i].destroy == null) {
                                let _newShotCoord = coordToAbs([SHOTS[i].current.x, SHOTS[i].current.y], this.gridWidth);
                                if ([1,4].includes(this.map[_newShotCoord])) {
                                    SHOTS[i].destroy = { x: SHOTS[i].current.x, y: SHOTS[i].current.y };
                                } else {

                                    //13. Check if it has hit a player (and also add to delete list)
                                    for (let j=0; j<this.totalPlayers; j++) {
                                        let _characterAbsCoord = coordToAbs([state.players[j].x, state.players[j].y], this.gridWidth);    
                                        if (_characterAbsCoord == _newShotCoord) {
                                            state.players[j].hit = true;
                                            SHOTS[i].hit = true;
                    }}}}}}

                    //14. After finishing each individual movement, check if shots have not hit each other
                    for (let i=0; i<SHOTS.length; i++) {
                        for (let j=0; j<SHOTS.length; j++) {
                            if (i != j && !SHOTS[i].hit && SHOTS[i].destroy == null && !SHOTS[j].hit && SHOTS[j].destroy == null) {
                                let _shotAbsCoord1 = coordToAbs([SHOTS[i].current.x, SHOTS[i].current.y], this.gridWidth);
                                let _shotAbsCoord2 = coordToAbs([SHOTS[j].current.x, SHOTS[j].current.y], this.gridWidth);
                                if (_shotAbsCoord1 == _shotAbsCoord2) {
                                    SHOTS[i].destroy = { x: SHOTS[i].current.x, y: SHOTS[i].current.y };
                                    SHOTS[j].destroy = { x: SHOTS[j].current.x, y: SHOTS[j].current.y };
                }}}}}

                //15. Copy the new shots object to the current state
                state.shots = SHOTS;
                

                //17. Chcek for winning condition: reach another player's starting position without getting hit
                let _characterAbsCoord = coordToAbs([state.players[playerNumber].x, state.players[playerNumber].y], this.gridWidth);  
                if (!state.players[playerNumber].hit) {
                    if  (this.map[_characterAbsCoord] >= 5 && this.map[_characterAbsCoord] != (5+playerNumber)) {
                        state.finished = true;
                        state.winner = playerNumber;
                    }
                }

                //16. Chcek for winning condition: last player standing
                let notHitPlayers = [];
                for (let i=0; i<state.players.length; i++) {
                    if (!state.players[i].hit) {
                        notHitPlayers.push(i);
                }}
                if (notHitPlayers.length == 1) {
                    state.finished = true;
                    state.winner = notHitPlayers[0];
                }

                //17. Update turn number
                state.turn++;

                return state;

            } catch (err) {
                return null;
            }
        },

        encodeCheckpoint(lastActionHash) {
            console.log("game: encodeCheckpoint()");
            try {
                let checkpoint = TuxitCrypto.toFelts([
                    {data: (this.turn-1), bits: 32 },               {data: this.lastShotId, bits: 32},          {data: (this.finished)?1:0, bits: 1},         {data: (this.winner != null)?this.winner:0, bits: 3, forceNext: true}, //TURN, FINISHED, WINNER
                    {data: this.players[0].x, bits: 32},        {data: this.players[0].y, bits: 32},        {data: this.players[0].orientation, bits: 2}, {data: + this.players[0].hit, bits: 1},
                    {data: this.players[0].apples, bits: 16},   {data: this.players[0].oranges, bits: 16},  {data: this.players[0].pears, bits: 16, forceNext: true},
                    {data: this.players[1].x, bits: 32},        {data: this.players[1].y, bits: 32},        {data: this.players[1].orientation, bits: 2}, {data: + this.players[1].hit, bits: 1},
                    {data: this.players[1].apples, bits: 16},   {data: this.players[1].oranges, bits: 16},  {data: this.players[1].pears, bits: 16, forceNext: true},
                ]);

                let feltShotsArray = [];
                for (let i=0; i<this.shots.length; i++) {
                    if (this.shots[i].destroy == null && this.shots[i].hit == false) {
                        let feltShot = TuxitCrypto.toFelts([
                            {data: BigInt(this.shots[i].id), bits: 32}, {data: this.shots[i].current.x, bits: 32}, {data: this.shots[i].current.y, bits: 32},
                            {data: this.shots[i].type, bits: 2}, {data: this.shots[i].direction, bits: 2, forceNext: true } 
                        ]);
                        feltShotsArray.push(feltShot[0]);
                    }
                }

                let finalCheckpoint = checkpoint.concat(feltShotsArray);
                finalCheckpoint.push(lastActionHash);

                return finalCheckpoint;

            } catch (err) {
                throw err;
            }
        },
        
        encodeAction(keyboardEvent, playerNumber, lastAction) {
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

                        if (this.turn > 1) {
                            let decodedAction = this.decodeAction(lastAction.data);
                            if (decodedAction.turn != this.turn - 1) { return null; }
                        }

                        turnData.push((lastAction == null)?"0x0":lastAction.hash);
                        return turnData;
                }}
            } catch (err) {}
            return null;
        },

        doActions(actions, from=0) {
            console.log("game: doActions()");
            try {
                for (let i=from; i<actions.length; i++) {

                    let decodedAction = this.decodeAction(actions[i].data);

                    if (decodedAction.turn == this.turn) {
                        let lastAction = null;
                        if (i>0) {
                            lastAction = actions[i-1];
                            if (lastAction.turn != i) {
                                throw Error(`Couldn't process turn #${decodedAction.turn}`);
                            }
                            if (lastAction.hash != decodedAction.last_turn_hash) {
                                throw Error(`Couldn't process turn #${decodedAction.turn}`);
                            }
                        }
                        let newState = this.processAction(decodedAction.action, this.currentState, this.playerTurn, lastAction);
                        if (newState != null) {
                            this.$patch({
                                turn: newState.turn,
                                players: JSON.parse(JSON.stringify(newState.players)),
                                shots: JSON.parse(JSON.stringify(newState.shots)),
                                finished: newState.finished,
                                winner: newState.winner,
                                shots: JSON.parse(JSON.stringify(newState.shots)),
                                lastShotId: newState.lastShotId
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