<script setup>
  import { useTuxitStore } from '@/stores/tuxit';
  import { useGameStore } from '@/stores/game';
  import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
  import { ref, onMounted, onUnmounted, defineProps } from '@vue/runtime-core';
  import LoadingSpinner from '@/components/LoadingSpinner.vue';
  import ManualCompleteGame  from '../components/ManualCompleteGame.vue';

  const game = ref(null);

  const tuxitStore = useTuxitStore();
  const gameStore = useGameStore();
  const router = useRouter();
  
  onMounted(async () => {
    await tuxitStore.startGame();
    if (tuxitStore.gameStatus == -1) {
      if (tuxitStore.unfinishedRoomId != null) {
        return await router.push({ name: "GameRoom", params: { roomId: tuxitStore.unfinishedRoomId }});
      } else {
        return await router.push({ name: "Home" });
      }
    }
    document.addEventListener("keydown", keyDown);
  });
  
  function keyDown(e) {
    if (tuxitStore.gameStatus == 6) {
      if (game.value != null && !game.value.animating && gameStore.playerTurn == tuxitStore.playerNumber && !tuxitStore.gameRequireCheckpoint) {
        let encodedTurn = gameStore.encodeAction(e, tuxitStore.playerNumber);
        if (encodedTurn != null) {
          tuxitStore.signAndSendAction(encodedTurn);
        }
      }
    }
  }

  function exit() {
    tuxitStore.leave();
    document.removeEventListener("keydown", keyDown);
  }

  onBeforeRouteLeave((to, from, next) => { exit(); next(); });
  onUnmounted((to, from, next) => { exit(); });
</script>


<template>
    <div class="flex column flex-center" v-if="tuxitStore.gameStatus >= 0 && tuxitStore.gameStatus < 6">
      <LoadingSpinner />
      <div id="loadingMessage" v-if="tuxitStore.gameStatus == 0">Loading stored data</div>
      <div id="loadingMessage" v-if="tuxitStore.gameStatus == 1">Waiting for peers</div>
      <div id="loadingMessage" v-if="tuxitStore.gameStatus >= 2 && tuxitStore.gameStatus < 5">Syncing</div>
      <div id="loadingMessage" v-if="tuxitStore.gameStatus == 5">Initializing</div>
    </div>
    <div class="flex row flex-center" v-if="tuxitStore.gameStatus >= 6">

      <div class="flex column flex-center sideContainer">
        <div class="sideTitle pixelated">CRYPTO</div>

        <div class="cryptoContainer">
          <div class="cryptoTitle pixelated">FIXED DATA</div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Hash: </span><span class="cryptoData">{{tuxitStore.gameFixed.hash}}</span></div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Signature Player 1: </span><span class="cryptoData">{{tuxitStore.gameFixed.signatures[0]}}</span></div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Signature Player 2: </span><span class="cryptoData">{{tuxitStore.gameFixed.signatures[1]}}</span></div>
        </div>

        <div class="cryptoContainer">
          <div class="cryptoTitle pixelated">LAST CHECKPOINT</div>
          <div class="cryptoTurnNumber pixelated">{{(tuxitStore.gameCheckpoint.turn > 0)?`Turn ${tuxitStore.gameCheckpoint.turn}`:'Initial State'}}</div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Hash: </span><span class="cryptoData">{{tuxitStore.gameCheckpoint.hash}}</span></div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Signature Player 1: </span><span class="cryptoData">{{tuxitStore.gameCheckpoint.signatures[0]}}</span></div>
          <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Signature Player 2: </span><span class="cryptoData">{{tuxitStore.gameCheckpoint.signatures[1]}}</span></div>
        </div>

        <div class="cryptoContainer">
          <div class="cryptoTitle pixelated">ACTIONS DATA</div>
          <div class="cryptoTurnNumber pixelated" v-if="tuxitStore.gameActions.length >0">Last action (out of {{tuxitStore.gameActions.length}}):</div>
          <div class="cryptoTurnNumber pixelated" v-else>No recorded actions</div>
          <div class="flex column" v-if="tuxitStore.gameActions.length > 0">
            <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Hash: </span><span class="cryptoData">{{tuxitStore.gameActions[tuxitStore.gameActions.length-1].hash}}</span></div>
            <div class="cryptoDataContainer flex column"><span class="cryptoSubtitle pixelated">Signature: </span><span class="cryptoData">{{tuxitStore.gameActions[tuxitStore.gameActions.length-1].signature}}</span></div>
          </div>
        </div>
      </div>

      <div class="flex column flex-center">
        <div id="playersInfoContainer" class="flex row flex-center">

          <div class="flex column flex-center PlayerContainer">
            <div class="playerName pixelated" :class="{'blink': (gameStore.playerTurn == 0)}">Player 1</div>
            <div class="flex row playerInsideContainer" :class="{ 'player1turn': (gameStore.playerTurn == 0)}">
              <div id="characterPicture" class="containNoRepeatCenter" :style="{'background-image': `url(img/sprites/character_0.gif)`}"></div>
                <div class="flex row fruitsRow">
                  <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon appleIcon"></div><span>{{gameStore.players[0].apples}}</span></div>
                  <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon orangeIcon"></div><span>{{gameStore.players[0].oranges}}</span></div>
                  <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon pearIcon"></div><span>{{gameStore.players[0].pears}}</span></div>
                </div>
              </div>
            </div>
            <div class="flex column flex-center PlayerContainer">
              <div class="playerName pixelated" :class="{'blink': (gameStore.playerTurn == 1)}">Player 2</div>
              <div class="flex row playerInsideContainer" :class="{ 'player2turn': (gameStore.playerTurn == 1)}">
                  <div class="flex row fruitsRow">
                    <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon appleIcon"></div><span>{{gameStore.players[1].apples}}</span></div>
                    <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon orangeIcon"></div><span>{{gameStore.players[1].oranges}}</span></div>
                    <div class="flex row fruitInfo pixelated"><div class="containNoRepeatCenter itemIcon pearIcon"></div><span>{{gameStore.players[1].pears}}</span></div>
                  </div>
                  <div id="characterPicture" class="containNoRepeatCenter" :style="{'background-image': `url(img/sprites/character_1.gif)`}"></div>
                </div>
              </div>
        </div>
        <div id="ScreenContainer">
            <ManualCompleteGame ref="game"/>
        </div>
        <div class="flex column flex-center" v-if="tuxitStore.gameRequireCheckpoint">
          <div id="TurnStatus" class="pixelated blink">SYNCING CHECKPOINT</div>
          <div id="TurnLabel" class="pixelated">TURN {{gameStore.turn}}</div>
        </div>
        <div class="flex column flex-center" v-else>
          <div id="TurnStatus" class="pixelated" :class="{'blink': (gameStore.playerTurn == tuxitStore.playerNumber)}">{{(gameStore.playerTurn == tuxitStore.playerNumber)?"YOUR TURN TO PLAY":`WAITING FOR PLAYER ${gameStore.playerTurn + 1}`}}</div>
          <div id="TurnLabel" class="pixelated">TURN {{gameStore.turn}}</div>
        </div>
        <div class="artLink">
          Art by <a href="https://cupnooble.itch.io/">Cup Noodle</a>
        </div>
      </div>

      <div class="flex column flex-center sideContainer" id="InstructionsContainer">
        <div class="sideTitle pixelated">INSTRUCTIONS</div>
        <div class="sideText">Reach the other player's starting position without getting hit by fruit.</div>

        <div class="sideTitle pixelated">CONTROLS</div>

        <div class="containNoRepeatCenter arrowsImg"></div>
        <div class="sideSubtitle pixelated" style="width:100%">Move around</div>
        
        <div class="flex row flex-center">
          <div class="flex column flex-center">
            <div class="keyImg containNoRepeatCenter" style="background-image: url('/img/KeyZ.png');"></div>
            <div class="sideSubtitle pixelated">Shoot Apple</div>
          </div>
          <div class="flex column flex-center">
            <div class="keyImg containNoRepeatCenter" style="background-image: url('/img/KeyX.png');"></div>
            <div class="sideSubtitle pixelated">Shoot Orange</div>
          </div>
          <div class="flex column flex-center">
            <div class="keyImg containNoRepeatCenter" style="background-image: url('/img/KeyC.png');"></div>
            <div class="sideSubtitle pixelated">Shoot Pear</div>
          </div>
        </div>

        <div class="flex column flex-center" style="margin-top:20px">
          <div class="flex row flex-center">
            <div class="colFruit containNoRepeatCenter itemIconBig appleIcon"></div>
            <div class="colSpeed fruitSpeedText pixelated">2 tiles/turn</div>
          </div>
          <div class="flex row flex-center">
            <div class="colFruit containNoRepeatCenter itemIconBig orangeIcon"></div>
            <div class="colSpeed fruitSpeedText pixelated">3 tiles/turn</div>
          </div>
          <div class="flex row flex-center">
            <div class="colFruit containNoRepeatCenter itemIconBig pearIcon"></div>
            <div class="colSpeed fruitSpeedText pixelated">4 tiles/turn</div>
          </div>
        </div>

      </div>

    </div>
</template>

<script>
</script>

<style scoped>
  .artLink {
    font-size: 10px;
    margin-top: 20px;
  }

  .artLink a {
    text-decoration: underline;
  }

  .sideContainer {
    border: 5px solid var(--light-purple);
    border-radius: 25px;
    height: 640px;
    width: 300px;
    margin: 20px 20px 0px 20px;
    justify-content: flex-start;
  }

  .sideTitle {
    margin-top: 20px;
    margin-top: 10px;
    color: var(--lighter-purple);
    font-size: 21px;
  }

  .sideText {
    text-align: center;
    font-size: 16px;
    margin: 15px 15px;
  }

  .sideSubtitle {
    margin-top: 10px;
    margin-bottom: 10px;
    font-size: 12px;
    width: 90px;
    text-align: center;
  }

  .colFruit {
    text-align: center;
    color: var(--lighter-purple);
    width: 50px !important;
  }

  .colSpeed {
    text-align: center;
    color: var(--lighter-purple);
    width: 180px !important;
  }

  .arrowsImg {
    width: 150px;
    height: 100px;
    margin-top: 10px;
    background-image: url('img/Arrows.png');
  }

  .keyImg {
    width: 50px;
    height: 50px;
  }

  .itemIconBig {
    width: 32px;
    height: 32px;
    margin: 5px;
    image-rendering: pixelated;
  }

  .fruitSpeedText {
    color: var(--lighter-purple);
    font-size: 14px;
    position: relative;
    top: 3px;
    text-align: center;
  }




  .cryptoContainer {
    border: 1px solid var(--lighter-purple);
    border-radius: 10px;
    width: 260px;
    padding: 5px;
    margin-top: 10px;
  }
  .cryptoTitle {
    font-size: 10px;
    text-align: center;
    margin: 2px;
    color: var(--lighter-purple);
  }
  .cryptoDataContainer {
    margin: 5px;
    overflow: hidden;
    word-break: break-all;
  }
  .cryptoSubtitle {
    color: var(--lighter-purple);
    font-size: 8px;
  }
  .cryptoData {
    color: var(--lighter-purple);
    font-size: 7.8px;
  }
  .cryptoTurnNumber {
    color: var(--lighter-purple);
    text-align: center;
    font-size: 8px;
  }









  .itemIcon {
    width: 36px;
    height: 36px;
    image-rendering: pixelated;
  }
  
  #loadingMessage {
    width: 100%;
    margin-bottom: 100px;
    text-align: center;
  }

  #ScreenContainer {
    width: 640px;
    height: 640px;
    border-radius: 25px;
    overflow: hidden;
    background-color: black;
  }

  #ScreenBorder {
    border: blue 3px solid;
  }

  #playersInfoContainer {
    justify-content: space-between;
    width: 640px;
  }
  .PlayerContainer {
    margin-bottom: 10px;
  }

  .playerInsideContainer {
    border-radius: 10px;
    border: 5px solid #aaaaaa;
    background-color: #cfcfcf;
    transition-duration: 300ms;
    color: #999999;
  }

  .player1turn {
    border: 5px solid #ff7b70;
    background-color: #ffcfba;
    color: #ff7b70;
  }

  .player2turn {
    border: 5px solid #9b85f2;
    background-color: #ccc7e4;
    color: #9b85f2;
  }

  .playerName {
    font-size: 12px;
  }

  #TurnStatus {
    font-size: 16px;
    margin-top: 10px;
  }
  #TurnLabel{
    font-size: 12px;
    margin-top: 4px;
    color: #847e93;
  }
  #TurnNumber {
    font-size: 32px;
    font-weight: 800;
    position: relative;
    bottom: 8px;
  }

  #characterPicture {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    margin: 5px 10px;
  }

  .itemIcon {
    width: 28px;
    height: 28px;
    margin: 0px 5px;
    image-rendering: pixelated;
  }

  .fruitsRow {
    align-items: center;
    justify-items: center;
  }

  .fruitInfo {
    align-items: center;
    margin: 0px 6px;
    font-weight: 800;
    font-size: 21px;
  }

  .fruitInfo span {
    position: relative;
    top: 2px;
    margin-left: 2px;
  }

  .appleIcon {
    background-image: url('/img/sprites/apple.png');
  }

  .orangeIcon {
    background-image: url('/img/sprites/orange.png');
  }

  .pearIcon {
    background-image: url('/img/sprites/pear.png');
  }

  @keyframes blink {
    50% {
      opacity: 0.0;
    }
  }
  .blink {
    animation: blink 1s step-start 0s infinite;
  }
</style>