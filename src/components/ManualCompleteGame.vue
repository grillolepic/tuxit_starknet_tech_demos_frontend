<script setup>
    
</script>

<template>
    <div>
        <div id="screen"></div>
    </div>
</template>

<script>
import { Application, Texture, Rectangle, Sprite, BaseTexture, AnimatedSprite, utils } from 'pixi.js';

let screenElement;
let application;
let map;
let animatedCharacterSheets, localPlayer;

let keys = {};
let directions = { "37":"West", "38":"North", "39":"East", "40":"South" }

let currentAnimation = [];
let characterSprites = [];

let currentMovement = null;

let tileWidth = 32;

export default {
    name: 'ManualCompleteGame',
    props: ['userTurn'],
    data() { return {

    }},
    mounted() {
        screenElement = document.getElementById("screen");

        application = new Application({
            resizeTo: screenElement,
            autoDensity: true,
            antialias: false
        });

        tileWidth = screenElement.clientWidth/16;

        screenElement.appendChild(application.view);

        application.loader.baseUrl = "/img/sprites";
        application.loader.add("Grass", "Grass.png");
        application.loader.add("Dirt", "Dirt.png");
        application.loader.add("Hills", "Hills.png");
        application.loader.add("Water", "Water.png");
        application.loader.add("Character", "Character.png");
        application.loader.onProgress.add(this.loadingProgress);
        application.loader.onComplete.add(this.loadingDone);
        application.loader.onError.add(this.loadingError);
        application.loader.load();
    },
    methods: {
        loadingProgress(e) { console.log(`Loading Assets: ${e.progress}%`); },
        loadingError(e) { console.log(`Loading Assets ERROR: ${e.message}`); },
        loadingDone(e) {
            console.log(`Loading Finished!`);
            let characterSheet = new BaseTexture.from(application.loader.resources["Character"].url);
            animatedCharacterSheets = {
                idleSouth: [new Texture(characterSheet, new Rectangle(1*16, 1*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 1*16, 16, 16))],
                idleNorth: [new Texture(characterSheet, new Rectangle(1*16, 4*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 4*16, 16, 16))],
                idleWest: [new Texture(characterSheet, new Rectangle(1*16, 7*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 7*16, 16, 16))],
                idleEast: [new Texture(characterSheet, new Rectangle(1*16, 10*16, 16, 16)), new Texture(characterSheet, new Rectangle(4*16, 10*16, 16, 16))],
                walkingSouth: [new Texture(characterSheet, new Rectangle(7*16, 1*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 1*16, 16, 16))],
                walkingNorth: [new Texture(characterSheet, new Rectangle(7*16, 4*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 4*16, 16, 16))],
                walkingWest: [new Texture(characterSheet, new Rectangle(7*16, 7*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 7*16, 16, 16))],
                walkingEast: [new Texture(characterSheet, new Rectangle(7*16, 10*16, 16, 16)), new Texture(characterSheet, new Rectangle(10*16, 10*16, 16, 16))]
            };
            this.$emit("finishedLoading");
        },


        /*
            This function calls setupGame(), which sets up the initial game state and must be reproduced in Cairo.
        */
        initialize(numberOfPlayers, localPlayerNumber, randomSeed) {
            console.log(`Initializing game...`);

            this.setupGame(numberOfPlayers, randomSeed);
            
            /*
            for (let i=0; i<players; i++) {
                let startingAnimation = "idleSouth";
                if (i == 1) { startingAnimation = "idleNorth"; }
                if (i == 2) { startingAnimation = "idleWest"; }
                if (i == 3) { startingAnimation = "idleEast"; }

                currentAnimation.push(startingAnimation);
                characterSprites.push(new AnimatedSprite(animatedCharacterSheets[startingAnimation]));

                characterSprites[i].loop = true;
                characterSprites[i].anchor.set(0.7);
                characterSprites[i].animationSpeed = 0.1;
                characterSprites[i].scale.x = 2*(tileWidth/32);
                characterSprites[i].scale.y = 2*(tileWidth/32);

                let tint = 0xFFAAAA;
                if (i == 1) { tint = 0xAAAAFF; }
                if (i == 2) { tint = 0xAAFFAA; }
                if (i == 3) { tint = 0xAAFFFF; }
                characterSprites[i].tint = tint;

                if (i==0 || i==4) {
                    characterSprites[i].x = 2*tileWidth;
                } else {
                    characterSprites[i].x = 14*tileWidth;
                }

                if (i==0 || i==2) {
                    characterSprites[i].y = 2*tileWidth;
                } else {
                    characterSprites[i].y = 14*tileWidth;
                }

                application.stage.addChild(characterSprites[i]);
                characterSprites[i].play();
            }

            localPlayer = local;

            window.addEventListener("keydown", this.keyDown);
            window.addEventListener("keyup", this.keyUp);

            application.ticker.add(this.gameLoop);
            application.start();
            */
        },

        setupGame(numberOfPlayers, randomSeed) {
            if (numberOfPlayers <2 || numberOfPlayers > 4) { throw Error("Wrong player amount"); }

                                    
            let MAX_INT64 = BigInt("18446744073709551615")

            function loadSeed(seed) {
                let s0 = splitMix64(seed)
                let s1 = splitMix64(s0)
                console.log(seed);
                console.log(s0);
                console.log(s1);
                return [s0, s1];
            }

            function splitMix64(x) {
                let z = BigInt.asUintN(64, BigInt(x) + BigInt("11400714819323198485"));
                z = BigInt.asUintN(64,(z ^ (z >> BigInt(30))) * BigInt("13787848793156543929"));
                z = BigInt.asUintN(64, (z ^ (z >> BigInt(27))) * BigInt("10723151780598845931"));
                return BigInt.asUintN(64, z ^ (z >> BigInt(31)));
            }

            function rotl(x, k) { return BigInt.asUintN(64, ((x << k) | (x >> (BigInt(64) - k)))); }

            function next(last) {
                last[0] = BigInt(last[0]);
                last[1] = BigInt(last[1]);

                let result = BigInt.asUintN(64, rotl(BigInt(last[0]) * BigInt(5), BigInt(7)) * BigInt(9));
                console.log(`Random number: ${result}`);
                console.log(`Random number FLOAT: ${Number(result * 100000000n / MAX_INT64) / 100000000}`);


                last[1] ^= last[0];
                let new0 = BigInt.asUintN(64, rotl(last[0], BigInt(24)) ^ last[1] ^ (last[1] << BigInt(16)));
                let new1 = rotl(last[1], BigInt(37));

                console.log(new0);
                console.log(new1);

                let newSeed = [new0,new1];
                return { result, newSeed };
            }

            let lastSeed = loadSeed(200n);


            let heightTerrain = [];
            let terrain = [];
            
            let gridSize = 2; //less is more smooth
            let resolution = 16;

            perlin.seed();
            for (let y=0; y<gridSize; y+=(gridSize/resolution)) {
                let row = [];
                for (let x=0; x<gridSize; x+=(gridSize/resolution)) {
                    let v = parseInt(perlin.get(x, y) * 2);
                    row.push(v);
                }
                heightTerrain.push(row);
            }

            for (let y=0; y<resolution; y++) {
                let row = [];
                for (let x=0; x<resolution; x++) {
                    let nx = 2*x/(resolution-1);
                    let ny = 2*y/(resolution-1);
                    let distance = 1 - (1 - nx**2) * (1 - ny**2);
                    heightTerrain[x][y] = (heightTerrain[x][y] + (1-distance)) / 2;
                    console.log(`[${x},${y}] => ${distance} => ${heightTerrain[x][y]}`);
                    row.push((heightTerrain[x][y]<0.2)?1:0);
                }
                terrain.push(row);
            }

            console.log(terrain);

            map = terrain;
            /*
            [
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,2,9,9,9,9,9,9,9,9,9,9,9,9,8,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,10,7,0],
                [0,3,1,12,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,10,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,12,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,1,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,3,1,10,1,1,1,1,1,1,1,1,1,1,7,0],
                [0,4,5,5,5,5,5,5,5,5,5,5,5,5,6,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ];
            */

            let waterSheet = new BaseTexture.from(application.loader.resources["Water"].url);
            let animatedWaterSheet = [];
            for (let i=0; i<4; i++) {
                animatedWaterSheet.push(new Texture(waterSheet, new Rectangle(16*i, 0, 16, 16)));
            }
            
            let grassSheet = new BaseTexture.from(application.loader.resources["Grass"].url);
            const grassTextures = [
                null,
                new Texture(grassSheet, new Rectangle(2*16, 4*16, 16, 16)), //CENTER
                new Texture(grassSheet, new Rectangle(1*16, 3*16, 16, 16)), //TOP LEFT
                new Texture(grassSheet, new Rectangle(1*16, 4*16, 16, 16)), //LEFT
                new Texture(grassSheet, new Rectangle(1*16, 5*16, 16, 16)), //BOTTOM LEFT
                new Texture(grassSheet, new Rectangle(2*16, 5*16, 16, 16)), //BOTTOM
                new Texture(grassSheet, new Rectangle(3*16, 5*16, 16, 16)), //BOTTOM RIGHT
                new Texture(grassSheet, new Rectangle(3*16, 4*16, 16, 16)), //RIGHT
                new Texture(grassSheet, new Rectangle(3*16, 3*16, 16, 16)), //TOP RIGHT
                new Texture(grassSheet, new Rectangle(2*16, 3*16, 16, 16)), //TOP
                new Texture(grassSheet, new Rectangle(0*16, 0*16, 16, 16)), //GRASS TEXTURE 1
                new Texture(grassSheet, new Rectangle(0*16, 1*16, 16, 16)), //GRASS TEXTURE 2
                new Texture(grassSheet, new Rectangle(1*16, 0*16, 16, 16)), //GRASS TEXTURE 3
                new Texture(grassSheet, new Rectangle(1*16, 1*16, 16, 16)), //GRASS TEXTURE 4
            ];

            for (let x=0; x<16; x++) {
                for (let y=0; y<16; y++) {
                    let terrainTile = map[y][x];

                    if  (terrainTile != 1 && terrainTile < 10) {
                        let animatedWaterSprite = new AnimatedSprite(animatedWaterSheet);
                        animatedWaterSprite.loop = true;
                        animatedWaterSprite.animationSpeed = 0.05;
                        animatedWaterSprite.scale.x = 2*(tileWidth/32);
                        animatedWaterSprite.scale.y = 2*(tileWidth/32);
                        animatedWaterSprite.x = x*tileWidth;
                        animatedWaterSprite.y = y*tileWidth;
                        application.stage.addChild(animatedWaterSprite);
                        animatedWaterSprite.play();
                    }
                    
                    if (terrainTile > 0) {
                        let grassTile = Sprite.from(grassTextures[terrainTile]);
                        grassTile.scale.x = 2*(tileWidth/32);
                        grassTile.scale.y = 2*(tileWidth/32);
                        grassTile.x = x*tileWidth;
                        grassTile.y = y*tileWidth;
                        application.stage.addChild(grassTile);
                    }
                }
            }
        },

        swipeHandler(e) {
            if (e == "top") {
                this.keyDown({keyCode:38});
            } else if (e == "bottom") {
                this.keyDown({keyCode:40});
            } else if (e == "left") {
                this.keyDown({keyCode:37});
            } else if (e == "right") {
                this.keyDown({keyCode:39});
            }
        },

        keyDown(e) {
            if (e.keyCode > 36 && e.keyCode < 41 && this.userTurn && currentMovement == null) {

                let from = [characterSprites[localPlayer].x, characterSprites[localPlayer].y];
                let to = [0,0];
                if (e.keyCode == 37 && characterSprites[localPlayer].x > 2*tileWidth) {
                    to = [characterSprites[localPlayer].x - tileWidth, characterSprites[localPlayer].y];
                    this.$emit("localTurn", { player: localPlayer, from, to });
                }
                if (e.keyCode == 39 && characterSprites[localPlayer].x < 14*tileWidth) {
                    to = [characterSprites[localPlayer].x + tileWidth, characterSprites[localPlayer].y];
                    this.$emit("localTurn", { player: localPlayer, from, to });
                }
                if (e.keyCode == 38 && characterSprites[localPlayer].y > 2*tileWidth) {
                    to = [characterSprites[localPlayer].x, characterSprites[localPlayer].y - tileWidth];
                    this.$emit("localTurn", { player: localPlayer, from, to });
                }
                if (e.keyCode == 40 && characterSprites[localPlayer].y < 14*tileWidth) {
                     to = [characterSprites[localPlayer].x, characterSprites[localPlayer].y + tileWidth];
                     this.$emit("localTurn", { player: localPlayer, from, to });
                }
            }
        },

        play(turn) {
            console.log(`Starting to animate turn #${turn.turn}`);

            let direction = "";
            if (characterSprites[turn.player].x == turn.to[0]) {
                if (characterSprites[turn.player].y > turn.to[1]) { direction = "North";
                } else { direction = "South"; }
            } else {
                if (characterSprites[turn.player].x > turn.to[0]) { direction = "West";
                } else { direction = "East"; }
            }

            currentMovement = { ...turn, direction };

            console.log(currentMovement);

            currentAnimation[currentMovement.player] = `walking${direction}`;
            characterSprites[currentMovement.player].loop = true;
            characterSprites[currentMovement.player].textures = animatedCharacterSheets[currentAnimation[currentMovement.player]];
            characterSprites[currentMovement.player].play();
        },

        gameLoop() {
            let speed = 1;
            if (currentMovement != null) {
                console.log(`Animating turn #${currentMovement.turn}`);

                let finishedMovement = false;
                if (currentMovement.direction == "North") {
                    if (characterSprites[currentMovement.player].y <= currentMovement.to[1]) {
                        characterSprites[currentMovement.player].y = currentMovement.to[1];
                        finishedMovement = true;    
                    } else {
                        characterSprites[currentMovement.player].y -= speed;
                    }
                } else if (currentMovement.direction == "South") {
                    if (characterSprites[currentMovement.player].y >= currentMovement.to[1]) {
                        characterSprites[currentMovement.player].y = currentMovement.to[1];
                        finishedMovement = true;    
                    } else {
                        characterSprites[currentMovement.player].y += speed;
                    }
                } else if (currentMovement.direction == "West") {
                    if (characterSprites[currentMovement.player].x <= currentMovement.to[0]) {
                        characterSprites[currentMovement.player].x = currentMovement.to[0];
                        finishedMovement = true;    
                    } else {
                        characterSprites[currentMovement.player].x -= speed;
                    }
                } else if (currentMovement.direction == "East") {
                    if (characterSprites[currentMovement.player].x >= currentMovement.to[0]) {
                        characterSprites[currentMovement.player].x = currentMovement.to[0];
                        finishedMovement = true;    
                    } else {
                        characterSprites[currentMovement.player].x += speed;
                    } 
                }

                if (finishedMovement) {
                    this.$emit("finishedAnimation", currentMovement.turn);
                    currentAnimation[currentMovement.player] = currentAnimation[currentMovement.player].replace("walking", "idle");
                    characterSprites[currentMovement.player].loop = true;
                    characterSprites[currentMovement.player].textures = animatedCharacterSheets[currentAnimation[currentMovement.player]];
                    characterSprites[currentMovement.player].play();
                    currentMovement = null;
                }
            }
        }
    },
}





const perlin = {
    rand_vect: function(){
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },
    dot_prod_grid: function(x, y, vx, vy){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if (this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function(x){
        return 6*x**5 - 15*x**4 + 10*x**3;
    },
    interp: function(x, a, b){
        return a + this.smootherstep(x) * (b-a);
    },
    seed: function(){
        this.gradients = {};
        this.memory = {};
    },
    get: function(x, y) {
        if (this.memory.hasOwnProperty([x,y]))
            return this.memory[[x,y]];
        let xf = Math.floor(x);
        let yf = Math.floor(y);
        //interpolate
        let tl = this.dot_prod_grid(x, y, xf,   yf);
        let tr = this.dot_prod_grid(x, y, xf+1, yf);
        let bl = this.dot_prod_grid(x, y, xf,   yf+1);
        let br = this.dot_prod_grid(x, y, xf+1, yf+1);
        let xt = this.interp(x-xf, tl, tr);
        let xb = this.interp(x-xf, bl, br);
        let v = this.interp(y-yf, xt, xb);
        this.memory[[x,y]] = v;
        return v;
    }
}
</script>

<style scoped>
    #screen {
        width: 100%;
        height: 100%;
    }
</style>
