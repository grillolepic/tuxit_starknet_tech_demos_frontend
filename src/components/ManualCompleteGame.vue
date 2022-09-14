<script setup>
    import { Application, Texture, Rectangle, Sprite, BaseTexture, AnimatedSprite, utils } from 'pixi.js';
    import { useGameStore } from '@/stores/game';
    import { useTuxitStore } from '@/stores/tuxit';
    import { ref, onMounted, onUnmounted, defineProps } from '@vue/runtime-core';

    const tuxitStore = useTuxitStore();
    const gameStore = useGameStore();

    const animating = ref(false);

    let _screenElement;
    let _application;
    let _tileWidth;
    let _sprites;

    const DIRECTIONS = ["South", "East", "North", "West"];
    const TURN_ANIMATION_LENGTH = 500;

    let TURN = 0;
    let PLAYERS = [];
    let SHOTS = [];
    let TURNS_QUEUE = [];

    const PLAYER_SIZE_LAND_COMPENSATE = 0.15;

    onMounted(async () => {
        _screenElement = document.getElementById("screen");
        _application = new Application({
            resizeTo: _screenElement,
            autoDensity: false,
            antialias: false
        });
        _tileWidth = _screenElement.clientWidth/gameStore.gridSize;
        _screenElement.appendChild(_application.view);
        loadImages();
    });
        
    async function loadImages() {
        _application.loader.baseUrl = "/img/sprites";
        _application.loader.add("Grass", "Grass.png");
        _application.loader.add("Water", "Water.png");
        _application.loader.add("Character", "Character.png");
        _application.loader.add("WaterObjects", "WaterObjects.png");
        _application.loader.add("Objects", "Objects.png");
        _application.loader.add("Trees", "Trees.png");
        _application.loader.add("Fruits", "Fruits.png");
        _application.loader.add("Basic", "Basic.png");
        _application.loader.onProgress.add(loadingProgress);
        _application.loader.onComplete.add(loadingDone);
        _application.loader.onError.add(loadingError);
        _application.loader.load();
    }
    function loadingProgress(e) {} //console.log(`Loading Assets: ${e.progress}%`); }
    function loadingError(e) { console.log(`Loading Assets ERROR: ${e.message}`); }
    function loadingDone(e) {
        console.log(`Loading Finished!`);

        let grassSheet = new BaseTexture.from(_application.loader.resources["Grass"].url);
        let waterSheet = new BaseTexture.from(_application.loader.resources["Water"].url);
        let objectsSheet = new BaseTexture.from(_application.loader.resources["Objects"].url);
        let waterObjectsSheet = new BaseTexture.from(_application.loader.resources["WaterObjects"].url);
        let treesSheet = new BaseTexture.from(_application.loader.resources["Trees"].url);
        let fruitsSheet = new BaseTexture.from(_application.loader.resources["Fruits"].url);
        let basicSheet = new BaseTexture.from(_application.loader.resources["Basic"].url);
        let characterSheet = new BaseTexture.from(_application.loader.resources["Character"].url);

        _sprites = {
            grassLand: {
                "SPOT": new Texture(grassSheet, new Rectangle(3*16, 2*16, 16, 16)),
                "CENTER": new Texture(grassSheet, new Rectangle(2*16, 4*16, 16, 16)),

                "TOP": new Texture(grassSheet, new Rectangle(2*16, 3*16, 16, 16)),
                "LEFT": new Texture(grassSheet, new Rectangle(1*16, 4*16, 16, 16)),
                "RIGHT": new Texture(grassSheet, new Rectangle(3*16, 4*16, 16, 16)),
                "BOTTOM": new Texture(grassSheet, new Rectangle(2*16, 5*16, 16, 16)),

                "TOP_LEFT": new Texture(grassSheet, new Rectangle(1*16, 3*16, 16, 16)),
                "TOP_RIGHT": new Texture(grassSheet, new Rectangle(3*16, 3*16, 16, 16)),
                "BOTTOM_LEFT": new Texture(grassSheet, new Rectangle(1*16, 5*16, 16, 16)),
                "BOTTOM_RIGHT": new Texture(grassSheet, new Rectangle(3*16, 5*16, 16, 16)),

                "CORNER_WITH_WATER_TOP_LEFT": new Texture(grassSheet, new Rectangle(5*16, 5*16, 16, 16)),
                "CORNER_WITH_WATER_TOP_RIGHT": new Texture(grassSheet, new Rectangle(4*16, 5*16, 16, 16)),
                "CORNER_WITH_WATER_BOTTOM_LEFT": new Texture(grassSheet, new Rectangle(5*16, 4*16, 16, 16)),
                "CORNER_WITH_WATER_BOTTOM_RIGHT": new Texture(grassSheet, new Rectangle(4*16, 4*16, 16, 16)),
                "CORNER_WITH_WATER_TOP_RIGHT_AND_BOTTOM_LEFT": new Texture(grassSheet, new Rectangle(2*16, 7*16, 16, 16)),
                "CORNER_WITH_WATER_TOP_LEFT_AND_BOTTOM_RIGHT": new Texture(grassSheet, new Rectangle(3*16, 7*16, 16, 16)),
                "CORNER_WITH_WATER_TOP_RIGHT_AND_TOP_LEFT_AND_BOTTOM_LEFT": new Texture(grassSheet, new Rectangle(6*16, 2*16, 16, 16)),
                "CORNER_WITH_WATER_TOP_RIGHT_AND_TOP_LEFT_AND_BOTTOM_RIGHT": new Texture(grassSheet, new Rectangle(7*16, 2*16, 16, 16)),

                "SINGLE_TOP": new Texture(grassSheet, new Rectangle(0*16, 2*16, 16, 16)),
                "SINGLE_BOTTOM": new Texture(grassSheet, new Rectangle(0*16, 5*16, 16, 16)),
                "SINGLE_RIGHT": new Texture(grassSheet, new Rectangle(3*16, 6*16, 16, 16)),
                "SINGLE_LEFT": new Texture(grassSheet, new Rectangle(0*16, 6*16, 16, 16)),
                
                "TOP_WITH_SINGLE_TOP": new Texture(grassSheet, new Rectangle(7*16, 6*16, 16, 16)),
                "TOP_WITH_SINGLE_BOTTOM": new Texture(grassSheet, new Rectangle(8*16, 3*16, 16, 16)),
                "BOTTOM_WITH_SINGLE_TOP": new Texture(grassSheet, new Rectangle(9*16, 2*16, 16, 16)),
                "BOTTOM_WITH_SINGLE_BOTTOM": new Texture(grassSheet, new Rectangle(6*16, 7*16, 16, 16)),
                "RIGHT_WITH_SINGLE_RIGHT": new Texture(grassSheet, new Rectangle(7*16, 7*16, 16, 16)),
                "LEFT_WITH_SINGLE_RIGHT": new Texture(grassSheet, new Rectangle(9*16, 3*16, 16, 16)),
                "LEFT_WITH_SINGLE_LEFT": new Texture(grassSheet, new Rectangle(6*16, 6*16, 16, 16)),
                "RIGHT_WITH_SINGLE_LEFT": new Texture(grassSheet, new Rectangle(8*16, 2*16, 16, 16)),

                "V_BRIDGE": new Texture(grassSheet, new Rectangle(0*16, 3*16, 16, 16)),
                "H_BRIDGE": new Texture(grassSheet, new Rectangle(1*16, 6*16, 16, 16)),
                
                "RIGHT_AND_BOTTOM_WITH_BOTTOM_BRIDGE": new Texture(grassSheet, new Rectangle(7*16, 5*16, 16, 16)),
                "LEFT_AND_BOTTOM_WITH_BOTTOM_BRIDGE": new Texture(grassSheet, new Rectangle(8*16, 5*16, 16, 16)),
                "RIGHT_AND_TOP_WITH_RIGHT_BRIDGE": new Texture(grassSheet, new Rectangle(7*16, 4*16, 16, 16)),
                "TOP_WITH_LEFT_BRIDGE": new Texture(grassSheet, new Rectangle(8*16, 4*16, 16, 16)),
                
                "BRIDGE_BOTTOM_LEFT": new Texture(grassSheet, new Rectangle(4*16, 7*16, 16, 16)),
                "BRIDGE_BOTTOM_RIGHT": new Texture(grassSheet, new Rectangle(5*16, 7*16, 16, 16)),
                "BRIDGE_TOP_LEFT": new Texture(grassSheet, new Rectangle(4*16, 6*16, 16, 16)),
                "BRIDGE_TOP_RIGHT": new Texture(grassSheet, new Rectangle(5*16, 6*16, 16, 16)),
                "BRIDGE_IN_ALL_DIRECTIONS": new Texture(grassSheet, new Rectangle(0*16, 7*16, 16, 16)),

                "RIGHT_WITH_TOP_LEFT_CORNER": new Texture(grassSheet, new Rectangle(9*16, 4*16, 16, 16)),
                "BOTTOM_WITH_TOP_LEFT_CORNER": new Texture(grassSheet, new Rectangle(6*16, 5*16, 16, 16)),
                "BOTTOM_WITH_TOP_RIGHT_CORNER": new Texture(grassSheet, new Rectangle(9*16, 5*16, 16, 16)),
                "BOTTOM_WITH_TOP_LEFT_AND_TOP_RIGHT_CORNERS": new Texture(grassSheet, new Rectangle(9*16, 2*16, 16, 16)),
                "TOP_WITH_BOTTOM_LEFT_AND_RIGHT_CORNERS": new Texture(grassSheet, new Rectangle(8*16, 3*16, 16, 16)),
                "TOP_LEFT_AND_BOTTOM_LEFT_AND_BOTTOM_RIGHT_CORNERS": new Texture(grassSheet, new Rectangle(6*16, 3*16, 16, 16)),
                "TOP_RIGHT_AND_BOTTOM_LEFT_AND_BOTTOM_RIGHT_CORNERS": new Texture(grassSheet, new Rectangle(7*16, 3*16, 16, 16)),
                "LEFT_WITH_TOP_RIGHT_CORNER": new Texture(grassSheet, new Rectangle(6*16, 4*16, 16, 16)),
            },

            animatedWaterSheet: [
                new Texture(waterSheet, new Rectangle(0, 0, 16, 16)),
                new Texture(waterSheet, new Rectangle(16, 0, 16, 16)),
                new Texture(waterSheet, new Rectangle(32, 0, 16, 16)),
                new Texture(waterSheet, new Rectangle(48, 0, 16, 16)),
            ],

            grass: [
                new Texture(grassSheet, new Rectangle(0*16, 0*16, 16, 16)),
                new Texture(grassSheet, new Rectangle(0*16, 1*16, 16, 16)),
                new Texture(grassSheet, new Rectangle(1*16, 0*16, 16, 16)),
                new Texture(grassSheet, new Rectangle(1*16, 1*16, 16, 16))
            ],

            rocks: [
                new Texture(objectsSheet, new Rectangle(4*16, 1*16, 16, 16)),
                new Texture(objectsSheet, new Rectangle(5*16, 1*16, 16, 16))
            ],

            stumps: [
                new Texture(treesSheet, new Rectangle(0*16, 6*16, 16, 16)),
                new Texture(treesSheet, new Rectangle(1*16, 6*16, 16, 16))
            ],

            trees: [
                new Texture(treesSheet, new Rectangle(0*16, 0*16, 16, 32)),
                new Texture(treesSheet, new Rectangle(1*16, 0*16, 32, 32)),
                new Texture(treesSheet, new Rectangle(9*16, 3*16, 48, 48))
            ],

            start: [
                new Texture(basicSheet, new Rectangle(1*16, 5*16, 16, 16)),
                new Texture(basicSheet, new Rectangle(2*16, 5*16, 16, 16))
            ],

            fruits: [
                new Texture(fruitsSheet, new Rectangle(0*16, 0*16, 16, 16)),
                new Texture(fruitsSheet, new Rectangle(1*16, 0*16, 16, 16)),
                new Texture(fruitsSheet, new Rectangle(2*16, 0*16, 16, 16))
            ],

            waterRocks: [
                new Texture(waterObjectsSheet, new Rectangle(0*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(1*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(2*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(3*16, 0*16, 16, 16))
            ],

            waterPlants: [
                new Texture(waterObjectsSheet, new Rectangle(6*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(7*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(8*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(9*16, 0*16, 16, 16)),
                new Texture(waterObjectsSheet, new Rectangle(10*16, 0*16, 16, 16)),
                 new Texture(waterObjectsSheet, new Rectangle(10*16, 0*16, 16, 16))
            ],

            characterAnimations: {
                idleSouth: [new Texture(characterSheet, new Rectangle(1*16, 1*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 1*16, 16, 16))],
                idleNorth: [new Texture(characterSheet, new Rectangle(1*16, 4*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 4*16, 16, 16))],
                idleWest: [new Texture(characterSheet, new Rectangle(1*16, 7*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 7*16, 16, 16))],
                idleEast: [new Texture(characterSheet, new Rectangle(1*16, 10*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 10*16, 16, 16))],
                walkingSouth: [new Texture(characterSheet, new Rectangle(7*16, 1*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 1*16, 16, 16))],
                walkingNorth: [new Texture(characterSheet, new Rectangle(7*16, 4*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 4*16, 16, 16))],
                walkingWest: [new Texture(characterSheet, new Rectangle(7*16, 7*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 7*16, 16, 16))],
                walkingEast: [new Texture(characterSheet, new Rectangle(7*16, 10*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 10*16, 16, 16))]
            }
        };

        drawMap();

        _application.ticker.add(gameLoop);
        _application.start();
    }

    function drawMap() {
        _application.stage.sortableChildren = true;

        TURN = gameStore.turn;

        while (_application.stage.children.length > 0) {
            _application.stage.removeChild(_application.stage.children[0]);
        }

        for (let i=0; i<gameStore.totalPlayers; i++) {
            PLAYERS.push({
                x: gameStore.players[i].x,
                y: gameStore.players[i].y,
                currentAnimation: "idle" + DIRECTIONS[gameStore.players[i].orientation],
            });

            const compensateCharacter = compensateLand(PLAYERS[i].x,PLAYERS[i].y,PLAYER_SIZE_LAND_COMPENSATE);

            PLAYERS[i].sprite = addAnimatedSprite(_sprites.characterAnimations[PLAYERS[i].currentAnimation], compensateCharacter[0], compensateCharacter[1]-0.25, 4+PLAYERS[i].y, 0.1);
            let tint = 0xFFAAAA;
            if (i == 1) { tint = 0xAAAAFF; }
            PLAYERS[i].sprite.tint = tint;
        }

        let countGrass = 0;

        for (let i=0; i<gameStore.map.length; i++) {
            const x = i%gameStore.gridSize;
            const y = Math.floor(i/gameStore.gridSize);
            const value = gameStore.map[i];

            addAnimatedSprite(_sprites.animatedWaterSheet, x, y, 0);

            if (value >= 2) {
                let index = landSurroundingsIndex(gameStore.map, i);
                let label = textureLabelFromIndex(index);
                
                addStaticSprite(_sprites.grassLand[label], x, y, 1);
            
                if (index == 255 && value == 3) {
                    let grassId = ((Math.floor(countGrass*x/(y+1)))%_sprites.grass.length);
                    addStaticSprite(_sprites.grass[grassId], x, y, 2);
                    countGrass++;
                } else if (value == 4) {
                    if (i%3 == 0) {
                        let rockId = ((Math.floor(countGrass*x/(y+1)))%_sprites.rocks.length);
                        addStaticSprite(_sprites.rocks[rockId], x, y, 4+y);
                    } else if (i%3 == 1) {
                        let stumpId = ((Math.floor(countGrass*x/(y+1)))%_sprites.stumps.length);
                        addStaticSprite(_sprites.stumps[stumpId], x, y, 4+y);
                    } else {
                        let treeId = ((Math.floor(countGrass*x/(y+1)))%_sprites.trees.length);
                        if (treeId == 0) { addStaticSprite(_sprites.trees[treeId], x, y-1, 4+y); }
                        else if (treeId == 1) { addStaticSprite(_sprites.trees[treeId], x-0.5, y-1, 4+y); }
                        else if (treeId == 2) { addStaticSprite(_sprites.trees[treeId], x-1, y-2, 4+y); }
                    }
                } else if (value > 4) {
                    const playerId = value - 5;
                    const compensateRug = compensateLand(x,y,0.25);
                    addStaticSprite(_sprites.start[playerId], compensateRug[0], compensateRug[1], 3);
                }
            } else {
                if (value == 1) {
                    if (i%2 == 0) {
                        let waterRockId = ((Math.floor(countGrass*x/(y+1)))%_sprites.waterRocks.length);
                        addStaticSprite(_sprites.waterRocks[waterRockId], x, y, 2);
                    }
                    else {
                        let waterPlantId = ((Math.floor(countGrass*x/(y+1)))%_sprites.waterPlants.length);
                        addStaticSprite(_sprites.waterPlants[waterPlantId], x, y, 2);
                    }
                }
            }
        }

        for (let i=0; i<gameStore.shots.length; i++) {
            SHOTS.push(JSON.parse(JSON.stringify(gameStore.shots[i])));
            SHOTS[i].sprite = addStaticSprite(
                _sprites.fruits[SHOTS[i].type],
                SHOTS[i].current.x,
                SHOTS[i].current.y-0.25,
                4 + SHOTS[i].current.y
            );
        }
    }

    function gameLoop() {
        if (TURN != gameStore.turn) {
            if (TURNS_QUEUE.length == 0 || TURNS_QUEUE[TURNS_QUEUE.length-1].state.turn < gameStore.turn) {
                TURNS_QUEUE.push({
                    player: gameStore.playerInTurn(gameStore.turn - 1),
                    state: JSON.parse(JSON.stringify(gameStore.currentState)),
                    start: 0
                });
                TURNS_QUEUE[0].prevPlayerPosition = { x: PLAYERS[TURNS_QUEUE[0].player].x, y: PLAYERS[TURNS_QUEUE[0].player].y };
                animating.value = true;
            }
        }

        if (TURNS_QUEUE.length > 0) {
            let ANIMATING_TURN = TURNS_QUEUE[0];

            let currentTs = Date.now();
            if (ANIMATING_TURN.start == 0) {
                ANIMATING_TURN.start = currentTs;

                console.log(SHOTS);

                let newShots = ANIMATING_TURN.state.shots;

                for (let i=0; i<newShots.length; i++) {
                    let idx = SHOTS.findIndex((s) => s.id == newShots[i].id);
                    if (idx >= 0) {
                        SHOTS[idx].start = newShots[i].start;
                        SHOTS[idx].current = JSON.parse(JSON.stringify(newShots[i].current));
                        SHOTS[idx].hit = newShots[i].hit;
                        SHOTS[idx].destroy = newShots[i].destroy;
                        SHOTS[idx].sprite.x = newShots[i].current.x * _tileWidth;
                        SHOTS[idx].sprite.y = (newShots[i].current.y-0.25) * _tileWidth;
                    } else {
                        SHOTS.push(JSON.parse(JSON.stringify(newShots[i])));
                        SHOTS[SHOTS.length-1].sprite = addStaticSprite(
                            _sprites.fruits[SHOTS[SHOTS.length-1].type],
                            SHOTS[SHOTS.length-1].current.x,
                            SHOTS[SHOTS.length-1].current.y-0.25,
                            4 + SHOTS[SHOTS.length-1].current.y
                        );
                    }
                }

                for (let i=SHOTS.length-1; i>=0; i--) {
                    let idx = newShots.findIndex((s) => s.id == SHOTS[i].id);
                    if (idx < 0) {
                        //TODO: Delete Sprite
                        SHOTS[i].sprite.destroy();
                        SHOTS.splice(i,1);
                    }
                }

                console.log(SHOTS);
            } else {
                const pct = (currentTs - ANIMATING_TURN.start)/TURN_ANIMATION_LENGTH;

                if (pct < 1) {
                    let start = { x: ANIMATING_TURN.prevPlayerPosition.x, y: ANIMATING_TURN.prevPlayerPosition.y };
                    const compensateStart = compensateLand(start.x, start.y, PLAYER_SIZE_LAND_COMPENSATE);

                    let target = { x: ANIMATING_TURN.state.players[ANIMATING_TURN.player].x, y: ANIMATING_TURN.state.players[ANIMATING_TURN.player].y };
                    const compensateTarget = compensateLand(target.x, target.y, PLAYER_SIZE_LAND_COMPENSATE);
                    
                    let current_x = ((compensateTarget[0] - compensateStart[0])*pct) + compensateStart[0];
                    let current_y = ((compensateTarget[1] - compensateStart[1])*pct) + compensateStart[1];

                    PLAYERS[ANIMATING_TURN.player].sprite.x = current_x * _tileWidth;
                    PLAYERS[ANIMATING_TURN.player].sprite.y = (current_y-0.25) * _tileWidth;
                    PLAYERS[ANIMATING_TURN.player].sprite.z = 4 + PLAYERS[ANIMATING_TURN.player].sprite.y;

                    let _walkAnimation = "walking" + DIRECTIONS[ANIMATING_TURN.state.players[ANIMATING_TURN.player].orientation];
                    if (PLAYERS[ANIMATING_TURN.player].currentAnimation != _walkAnimation) {
                        PLAYERS[ANIMATING_TURN.player].currentAnimation = _walkAnimation;
                        PLAYERS[ANIMATING_TURN.player].sprite.loop = true;
                        PLAYERS[ANIMATING_TURN.player].sprite.textures = _sprites.characterAnimations[PLAYERS[ANIMATING_TURN.player].currentAnimation];
                        PLAYERS[ANIMATING_TURN.player].sprite.play();
                    }

                    for (let i=SHOTS.length-1; i>=0; i--) {

                        let current_x = (SHOTS[i].start.x + (SHOTS[i].current.x - SHOTS[i].start.x)* pct);
                        let current_y = (SHOTS[i].start.y + (SHOTS[i].current.y - SHOTS[i].start.y)* pct) - 0.25;

                        SHOTS[i].sprite.x = current_x * _tileWidth;
                        SHOTS[i].sprite.y = current_y * _tileWidth;
                        SHOTS[i].sprite.z = 4 + SHOTS[i].sprite.y;

                        if (SHOTS[i].destroy != null) {
                            let round_x = Math.round(current_x);
                            let round_y = Math.round(current_y);
                            if (SHOTS[i].destroy.x == round_x && SHOTS[i].destroy.y == round_y) {
                                //TODO: Delete Sprite
                                SHOTS[i].sprite.destroy();
                                SHOTS.splice(i,1);
                            }
                        }
                    }
                } else {
                    PLAYERS[ANIMATING_TURN.player].x = ANIMATING_TURN.state.players[ANIMATING_TURN.player].x;
                    PLAYERS[ANIMATING_TURN.player].y = ANIMATING_TURN.state.players[ANIMATING_TURN.player].y;
                    PLAYERS[ANIMATING_TURN.player].currentAnimation = "idle" + DIRECTIONS[ANIMATING_TURN.state.players[ANIMATING_TURN.player].orientation];

                    const compensateCharacter = compensateLand(PLAYERS[ANIMATING_TURN.player].x, PLAYERS[ANIMATING_TURN.player].y, PLAYER_SIZE_LAND_COMPENSATE);
                    PLAYERS[ANIMATING_TURN.player].sprite.x = compensateCharacter[0] * _tileWidth;
                    PLAYERS[ANIMATING_TURN.player].sprite.y = (compensateCharacter[1]-0.25) * _tileWidth;
                    PLAYERS[ANIMATING_TURN.player].sprite.z = 4 + PLAYERS[ANIMATING_TURN.player].sprite.y;
                    PLAYERS[ANIMATING_TURN.player].sprite.loop = true;
                    PLAYERS[ANIMATING_TURN.player].sprite.textures = _sprites.characterAnimations[PLAYERS[ANIMATING_TURN.player].currentAnimation];
                    PLAYERS[ANIMATING_TURN.player].sprite.play();

                    //At the end of the turn, delete all temp shots from this component and recreate them from state, avoiding any difference
                    
                    for (let i=0; i<SHOTS.length; i++) {
                        let idx = ANIMATING_TURN.state.shots.findIndex((s) => s.id == SHOTS[i].id);
                        if (idx > 0) {
                            SHOTS[i].sprite.x = ANIMATING_TURN.state.shots[idx].current.x * _tileWidth;
                            SHOTS[i].sprite.y = (ANIMATING_TURN.state.shots[idx].current.y - 0.25) * _tileWidth;
                            SHOTS[i].sprite.z = 4 + ANIMATING_TURN.state.shots[idx].current.y;
                        }
                    }

                    TURN = ANIMATING_TURN.state.turn;

                    TURNS_QUEUE.shift();

                    animating.value = (TURNS_QUEUE.length > 0);
                }
            }
        }
    }

    function addAnimatedSprite(sheet, x, y, z, speed= 0.05, mult_size_base_16=2) {
        let animatedSprite = new AnimatedSprite(sheet);
        animatedSprite.loop = true;
        animatedSprite.animationSpeed = speed;
        animatedSprite.scale.x = mult_size_base_16*(_tileWidth/32);
        animatedSprite.scale.y = mult_size_base_16*(_tileWidth/32);
        animatedSprite.x = x*_tileWidth;
        animatedSprite.y = y*_tileWidth;
        animatedSprite.zIndex = z;
        _application.stage.addChild(animatedSprite);
        animatedSprite.play();
        return animatedSprite;
    }

    function addStaticSprite(texture, x, y, z, mult_size_base_16=2) {
        let tile = Sprite.from(texture);
        tile.scale.x = mult_size_base_16*(_tileWidth/32);
        tile.scale.y = mult_size_base_16*(_tileWidth/32);
        tile.x = x*_tileWidth;
        tile.y = y*_tileWidth;
        tile.zIndex = z;
        _application.stage.addChild(tile);
        return tile;
    }

    function compensateLand(x,y, size) {
        const absCoord = Math.round(y)*gameStore.gridSize + Math.round(x);
        const index = landSurroundingsIndex(gameStore.map, absCoord);
        const label = textureLabelFromIndex(index);
        
        //console.log(label);

        if (label == "SPOT") { return [x,y]; }
        if (label == "CENTER") { return [x,y]; }

        if (label == "TOP") { return [x,y+size]; }
        if (label == "LEFT") { return [x+size,y]; }
        if (label == "RIGHT") { return [x-size,y]; }
        if (label == "BOTTOM") { return [x,y-size]; }
        
        if (label == "TOP_LEFT") { return [x+size,y+size]; }
        if (label == "TOP_RIGHT") { return [x-size,y+size]; }
        if (label == "BOTTOM_LEFT") { return [x+size,y-size]; }
        if (label == "BOTTOM_RIGHT") { return [x-size,y-size]; }

        if (label == "SINGLE_RIGHT") { return [x-size,y-size]; }
        if (label == "SINGLE_LEFT") { return [x+size,y-size]; }
        if (label == "SINGLE_TOP") { return [x,y+size]; }
        if (label == "SINGLE_BOTTOM") { return [x,y-size]; }

        if (label == "BRIDGE_TOP_RIGHT") { return [x,y]; }
        if (label == "RIGHT_WITH_SINGLE_RIGHT") {return [x,y-size]; }

        if (label == "CORNER_WITH_WATER_TOP_LEFT") { return [x+size, y+size]; }
        if (label == "CORNER_WITH_WATER_BOTTOM_RIGHT") { return [x-size,y-size]; }
        if (label == "CORNER_WITH_WATER_BOTTOM_LEFT") { return [x+size,y]; }
        
        return [x,y];
    }

    function textureLabelFromIndex(index) {
        if ([0,1,4,5,32,33,36,37,128,129,132,133,160,161,164,165].includes(index)) { return "SPOT"; }
        if ([255].includes(index)) { return "CENTER"; }

        if ([31,63,159,191].includes(index)) { return "TOP"; }
        if ([107,111,235,239].includes(index)) { return "LEFT"; }
        if ([214,215,246,247].includes(index)) { return "RIGHT"; }
        if ([248,249,252,253].includes(index)) { return "BOTTOM"; }

        if ([11,15,43,47,139,143,171,175].includes(index)) { return "TOP_LEFT"; }
        if ([22,23,54,55,150,151,182,183].includes(index)) { return "TOP_RIGHT"; }
        if ([208,209,212,213,240,241,244,245].includes(index)) { return "BOTTOM_RIGHT"; }
        if ([104,105,108,109,232,233,236,237].includes(index)) { return "BOTTOM_LEFT"; }

        if ([66,67,70,71,98,99,102,103,194,195,198,199,226,227,230,231].includes(index)) { return "V_BRIDGE"; }
        if ([24,25,28,29,56,57,60,61,152,153,156,157,184,185,188,189].includes(index)) { return "H_BRIDGE"; }

        if ([2,3,6,7,34,35,38,39,130,131,134,135,162,163,166,167].includes(index)) { return "SINGLE_TOP"; }
        if ([64,65,68,69,96,97,100,101,192,193,196,197,224,225,228,229].includes(index)) { return "SINGLE_BOTTOM"; }
        if ([16,17,20,21,48,49,52,53,144,145,148,149,176,177,180,181].includes(index)) { return "SINGLE_RIGHT"; }
        if ([8,9,12,13,40,41,44,45,136,137,140,141,168,169,172,173].includes(index)) { return "SINGLE_LEFT"; }

        if ([80,81,84,85,112,113,116,117].includes(index)) { return "BRIDGE_BOTTOM_RIGHT"; }
        if ([72,73,76,77,200,201,204,205].includes(index)) { return "BRIDGE_BOTTOM_LEFT"; }
        if ([10,14,42,46,138,142,170,174].includes(index)) { return "BRIDGE_TOP_LEFT"; }
        if ([18,19,50,51,146,147,178,179].includes(index)) { return "BRIDGE_TOP_RIGHT"; }
        if ([90].includes(index)) { return "BRIDGE_IN_ALL_DIRECTIONS"; }

        if ([127].includes(index)) { return "CORNER_WITH_WATER_TOP_LEFT"; }
        if ([223].includes(index)) { return "CORNER_WITH_WATER_TOP_RIGHT"; }
        if ([254].includes(index)) { return "CORNER_WITH_WATER_BOTTOM_RIGHT"; }
        if ([251].includes(index)) { return "CORNER_WITH_WATER_BOTTOM_LEFT"; }
        
        if ([91].includes(index)) { return "CORNER_WITH_WATER_TOP_RIGHT_AND_TOP_LEFT_AND_BOTTOM_LEFT"; }
        if ([94].includes(index)) { return "CORNER_WITH_WATER_TOP_RIGHT_AND_TOP_LEFT_AND_BOTTOM_RIGHT"; }
        if ([219].includes(index)) { return "CORNER_WITH_WATER_TOP_RIGHT_AND_BOTTOM_LEFT"; }
        if ([126].includes(index)) { return "CORNER_WITH_WATER_TOP_LEFT_AND_BOTTOM_RIGHT"; }

        if ([210,211,242,243].includes(index)) { return "RIGHT_AND_BOTTOM_WITH_BOTTOM_BRIDGE"; }
        if ([106,110,234,238].includes(index)) { return "LEFT_AND_BOTTOM_WITH_BOTTOM_BRIDGE"; }
        if ([30,62,158,190].includes(index)) { return "RIGHT_AND_TOP_WITH_RIGHT_BRIDGE"; }
        if ([27,59,155,187].includes(index)) { return "TOP_WITH_LEFT_BRIDGE"; }

        if ([250].includes(index)) { return "BOTTOM_WITH_SINGLE_BOTTOM"; }
        if ([88,92,93].includes(index)) { return "BOTTOM_WITH_SINGLE_TOP"; }
        if ([95].includes(index)) { return "TOP_WITH_SINGLE_TOP"; }
        if ([26,154,186].includes(index)) { return "TOP_WITH_SINGLE_BOTTOM"; }
        if ([123].includes(index)) { return "LEFT_WITH_SINGLE_LEFT"; }
        if ([74,78,202,206].includes(index)) { return "LEFT_WITH_SINGLE_RIGHT"; }
        if ([222].includes(index)) { return "RIGHT_WITH_SINGLE_RIGHT"; }
        if ([82,83,114,115].includes(index)) { return "RIGHT_WITH_SINGLE_LEFT"; }

        if ([86,87,118,119].includes(index)) { return "RIGHT_WITH_TOP_LEFT_CORNER"; }       
        if ([217,216,220,221].includes(index)) { return "BOTTOM_WITH_TOP_RIGHT_CORNER"; }
        if ([120,121,124,125].includes(index)) { return "BOTTOM_WITH_TOP_LEFT_CORNER"; }
        if ([75,79,203,207].includes(index)) { return "LEFT_WITH_TOP_RIGHT_CORNER"; }

        if ([89].includes(index)) { return "BOTTOM_WITH_TOP_LEFT_AND_TOP_RIGHT_CORNERS"; }
        if ([58].includes(index)) { return "TOP_WITH_BOTTOM_LEFT_AND_RIGHT_CORNERS"; }
        if ([122].includes(index)) { return "TOP_LEFT_AND_BOTTOM_LEFT_AND_BOTTOM_RIGHT_CORNERS"; }
        if ([218].includes(index)) { return "TOP_RIGHT_AND_BOTTOM_LEFT_AND_BOTTOM_RIGHT_CORNERS"; }
        
        return null;
    }

    function landSurroundingsIndex(map, i) {
        const topLeft = isWater(map, i - gameStore.gridSize - 1);
        const top = isWater(map, i - gameStore.gridSize);
        const topRight = isWater(map, i - gameStore.gridSize + 1);
        const left = isWater(map, i - 1);
        const right = isWater(map, i + 1);
        const bottomLeft = isWater(map, i + gameStore.gridSize - 1);
        const bottom = isWater(map, i + gameStore.gridSize);
        const bottomRight = isWater(map, i + gameStore.gridSize + 1);
        const bin = `${topLeft?'0':'1'}${top?'0':'1'}${topRight?'0':'1'}${left?'0':'1'}${right?'0':'1'}${bottomLeft?'0':'1'}${bottom?'0':'1'}${bottomRight?'0':'1'}`;
        let id = parseInt(bin, 2);
        return id;
    }

    function isWater(m, i) { if (i<0 || i>=m.length) { return false; } return (m[i]<2); }

    defineExpose({
        animating
    });
</script>

<template>
    <div id="gameUI" class="flex column flex-center" v-show="gameStore.finished">
        <div id="finishMessage" class="pixelated">{{(gameStore.winner == tuxitStore.playerNumber)?'YOU WIN':'YOU LOSE'}}</div>
    </div>
    <div id="screen" :class="{'finished': gameStore.finished}">
    </div>
</template>

<style scoped>
    #gameUI {
        position: absolute;
        z-index: 100;
        width: 100%;
        height: 100%;
        transition-duration: 1s;
        transition-delay: 500ms;
    }

    #finishMessage {
        font-size: 32px;
    }

    #screen {
        width: 100%;
        height: 100%;
        transition-duration: 1s;
        transition-delay: 500ms;
    }

    .finished {
        opacity: 0.2;
    }
</style>
