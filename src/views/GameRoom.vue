<script setup>
  import { useStarkNetStore } from '@/stores/starknet';
  import { useTuxitStore } from '@/stores/tuxit';
  import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
  import { ref, onMounted, defineProps } from '@vue/runtime-core';

  import LoadingSpinner from '@/components/LoadingSpinner.vue';
  import TuxitGame  from '../components/ManualCompleteGame.vue';

  const props = defineProps(['roomId']);
  const starkNetStore = useStarkNetStore();
  const tuxitStore = useTuxitStore();
  const router = useRouter();
  const route = useRoute();
  const timeLeft = ref(0);

  let _timeoutInterval;
  let _intervalCount = 0;

  onMounted(async () => {
    tuxitStore.reset();
    await updateRoomStatus();
    updateTimeLeft();

    _timeoutInterval = setInterval(() => {
      _intervalCount++;
      updateTimeLeft();
      if (_intervalCount == 10) {
        _intervalCount = 0;
        console.log("check StarkNet for update!");
      }
    }, 1000);
  });

  async function updateRoomStatus() {
    await tuxitStore.loadRoom(props.roomId);
    if (tuxitStore.gameId == null) { return router.push({ name: "Home" }); }
    if (tuxitStore.roomId == null) { return router.push({ name: "CreateRoom", params: { gameId: tuxitStore.gameId }}); }
    if (tuxitStore.roomStatus > 0) { return router.push({ name: "Game", params: { roomId: tuxitStore.roomId }}); }
  }

  function updateTimeLeft() {
    const currentTs = Math.floor(Date.now()/1000);
    let deadlineTs = tuxitStore.roomDeadline;
    if (currentTs > deadlineTs) { return router.push({ name: "CreateRoom", params: { gameId: tuxitStore.gameId }}); }
    timeLeft.value = new Date((deadlineTs - currentTs) * 1000).toISOString().substring(11,19);
  }

  async function closeRoom() {
    await tuxitStore.closeRoom(props.roomId);
    if (tuxitStore.gameId == null) { return router.push({ name: "Home" }); }
  }

  async function joinRoom() {
    await tuxitStore.joinRoom();
    if (tuxitStore.roomStatus > 0) { return router.push({ name: "Game", params: { roomId: tuxitStore.roomId }}); }
  }


  function copyUrl() {
      const splitUrl = window.location.href.split("/");
      const text =  `${splitUrl[0]}//${splitUrl[2]}${route.fullPath}`;
      navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!');
        document.getElementById('copied').className = 'copiedNotificationText';
        setTimeout(()=>{ document.getElementById('copied').className = 'hide'; }, 2000);
      }, function(err) {
        console.error('Async: Could not copy text: ', err);
      });
  }

  onBeforeRouteLeave((to, from, next) => {
    clearInterval(_timeoutInterval);
    next();
  });

</script>

<template>
    <div class="flex column flex-center" v-if="tuxitStore.loadingRoom || tuxitStore.closingRoom">
      <LoadingSpinner/>
      <div id="loadingMessage" v-if="tuxitStore.loadingRoom">Loading Game Room #{{props.roomId}}...</div>
      <div id="loadingMessage" v-if="tuxitStore.closingRoom">Closing Game Room #{{props.roomId}}...</div>
    </div>
    <div v-else>
      <div v-if="tuxitStore.roomStatus == 0">
        <div class="flex column flex-center" v-if="tuxitStore.roomCreator && tuxitStore.roomPrivateKeyLost">         
          <div class="title red">Private Key Lost!</div>
          <div class="description red">The private key for this match was not found. Close the room before someone joins in or you won't be able to play.</div>
          <div id="closeButton" class="button" @click="closeRoom">Close Room</div>
        </div>
        <div class="flex column flex-center" v-else>
          <div class="title">{{tuxitStore.gameName}}</div>

          <div class="description" v-if="tuxitStore.roomCreator">The game will start when another player joins the room. Please, share the link with a friend or join from another browser to try it out.</div>
          <div id="shareButton" @click="copyUrl()" v-if="tuxitStore.roomCreator">Copy Link</div>
          <div id="closeButton" class="button" @click="closeRoom" v-if="tuxitStore.roomCreator">Close Room</div>

          <div class="description align-center" v-if="!tuxitStore.roomJoined">Game is set and ready to begin. Join in!</div>
          <div id="closeButton" class="button" @click="joinRoom" v-if="!tuxitStore.roomJoined">Join Room</div>
          <div id="timeLeft">Time left to join: {{timeLeft}}</div>
        </div>        
      </div>
    </div>
    <div class='copiedNotification'>
      <h2 id="copied" class="hide">Copied</h2>
    </div>
  <!--div class="flex column flex-center" v-if="!settings.started">
    <div class="subtitle">Waiting for peers...</div>


    <router-link to="/" id="backButton">Go Back</router-link>
  </div>
  <div class="flex column flex-center" v-else>
    <div id="mobileTouchEventArea" v-touch:swipe="swipeHandler"></div>

    <TuxitGame id="GameScreen" :userTurn="yourTurn" ref="game" @finishedLoading="initializeGame" @localTurn="localTurn"/>
    <div id="settingsDisplay" class="flex row flex-center">
      <div id="turnNumber">Turn {{turn}}</div>
      <div id="turnNotification" :class="{ 'activeTurn': yourTurn }">{{yourTurn?'Your turn to play':'Wait for your turn'}}</div>
    </div>
  </div-->
</template>

<script>
/*
    1) connect() is called on mount. The function allows players to share the 'settings' object via P2P and join the game by adding themselves to the 'settings.players' Array (ordered alphabetically).
    2) Once the final player joins, it sets 'started' to true, sets a random number and sends the settings to all other players.
    3) All this process will be done by the blockchain on the real version.
    4) Once 'settings.started' is true, the game begins to load assets. Once finished, the event 'finishedLoading' is received, and initializeGame() is called.
    5) initializeGame() sends to the game the number of players, the current player number (or -1 if just an spectator) and the random seed.
    6) 

  computed: {
    yourTurn(state) {
      let start = Math.floor(state.settings.random * 1000) % state.settings.playersToStart;
      let playerTurn = this.settings.players[(start + state.turn) % state.settings.playersToStart];
      return (playerTurn == selfId);
    }
  },

  methods: {

    connect() {
      console.log("Connecting...");

      const config = {appId: `tuxit-tech-demo-${this.gameId}`}
      room = joinRoom(config, this.gameRoom);

      const [sendSettings, getSettings] = room.makeAction('settings');
      [sendTurn, getTurn] = room.makeAction('turn');

      room.onPeerJoin((peerId) => {
        console.log(`${peerId} joined`);
        sendSettings(this.settings);
        this.peers = room.getPeers();
      });
      room.onPeerLeave((peerId) => {
        console.log(`${peerId} left`);
        this.peers = room.getPeers();
      });

      this.peers = room.getPeers();

      getSettings((data) => {
        if (!arraysEqual(data.players, this.settings.players)) {
          console.log(`Synchronyzing Players...`);
          this.settings.players = data.players;
        }

        if (data.started && !this.settings.started) {
          console.log(`Starting game...`);
          this.settings.started = data.started;
        }

        if (data.random != this.settings.random) {
          this.settings.random = Math.max(this.settings.random, data.random);
        }

        if (!this.settings.started) {
          if (this.settings.players.length < this.settings.playersToStart) {
            if (!this.settings.players.includes(selfId)) {
              console.log(`Joining game...`);
              this.settings.players.push(selfId);
              this.settings.players.sort();

              if (this.settings.players.length == this.settings.playersToStart) {
                console.log(`Max players reached`);
                if (this.settings.players[0] == selfId) {
                  console.log(`Setting randomness and starting game...`);
                  this.settings.random = Math.random();
                  this.settings.started = true;
                }
              }
              sendSettings(this.settings);
            }
          }
        }
      });

      getTurn((data) => {
        console.log(`Got turn #${data.turn}`);
        this.playTurn(data);
      });
    },



    initializeGame() {
      this.playerNumber = this.settings.players.indexOf(selfId);
      this.$refs.game.initialize(this.settings.playersToStart, this.playerNumber, this.random);
    },

    localTurn(turnByLocalPlayer) {
      sendTurn({... turnByLocalPlayer, turn: this.turn});
      this.playTurn({... turnByLocalPlayer, turn: this.turn});
    },

    playTurn(turn) {
      this.$refs.game.play(turn);
      this.turn++;
    }
  },

  beforeUnmount() {
    room?.leave();
  }
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
*/
</script>

<style scoped>
  #loadingMessage {
    width: 100%;
    margin-bottom: 100px;
    text-align: center;
  }

  .title {
    max-width: 380px;
    margin-bottom: 20px;
  }

  #closeButton {
    margin: 20px;
    width: 380px;
    max-width: 80vw;
    height: 40px;
  }

  .description {
    width: 380px;
    max-width: 80vw;
    font-size: 14px;
    font-weight: 200;
    text-align: justify;
  }

  #timeLeft {
    font-size: 12px;
  }

  .peerId {
    margin: 5px;
    font-size: 12px;
  }

  #GameScreen {
    width: 512px;
    height: 512px;
    max-width: 80vw;
    max-height: 80vw;
  }

  #shareButton {
    cursor: pointer;
    color: var(--yellow);
    font-weight: 800;
    text-decoration: none;
    margin-top: 20px;
    transition-duration: 100ms;
  }

  #settingsDisplay {
    margin-top: 20px;
  }

  #turnNumber {
    margin-right: 20px;
  }

  #turnNotification {
    color: var(--grey);
  }

  .activeTurn {
    color: var(--yellow) !important;


  }

  .copiedNotification {
    position: absolute;
    bottom: 0px;
    height: 4rem;
    overflow: hidden;
    padding: 0;
    margin-bottom: 16px;
    color: var(--yellow);
  }
  .copiedNotificationText {
    animation: 2s anim-lineUp ease-out infinite;
  }

  .hide {
    opacity: 0;
  }

  @keyframes anim-lineUp {
    0% {
      opacity: 0;
      transform: translateY(80%);
    }
    30% {
      opacity: 1;
      transform: translateY(0%);
    }
    80% {
      opacity: 1;
      transform: translateY(0%);
    }
    100% {
      opacity: 0;
      transform: translateY(0%);
    }
  }

</style>