<script setup>
  import ManualCompleteGame  from '../components/ManualCompleteGame.vue';
  //import { joinRoom, selfId } from 'trystero';
</script>

<template>
  <div class="flex column flex-center" v-if="!settings.started">
    <div class="subtitle">Waiting for peers...</div>
    <!--div class="peerId">{{selfId}} (me)</div>
    <div v-for="(peer, index) in peers" :key="index" class="peerId">
      {{peer}}
    </div-->

    <div id="shareButton" @click="copyUrl()">{{shareUrlText}}</div>

    <router-link to="/" id="backButton">Go Back</router-link>
  </div>
  <div class="flex column flex-center" v-else>
    <div id="mobileTouchEventArea" v-touch:swipe="swipeHandler"></div>

    <TuxitGame id="GameScreen" :userTurn="yourTurn" ref="game" @finishedLoading="initializeGame" @localTurn="localTurn"/>
    <div id="settingsDisplay" class="flex row flex-center">
      <div id="turnNumber">Turn {{turn}}</div>
      <div id="turnNotification" :class="{ 'activeTurn': yourTurn }">{{yourTurn?'Your turn to play':'Wait for your turn'}}</div>
    </div>
  </div>
</template>

<script>
/*
    1) connect() is called on mount. The function allows players to share the 'settings' object via P2P and join the game by adding themselves to the 'settings.players' Array (ordered alphabetically).
    2) Once the final player joins, it sets 'started' to true, sets a random number and sends the settings to all other players.
    3) All this process will be done by the blockchain on the real version.
    4) Once 'settings.started' is true, the game begins to load assets. Once finished, the event 'finishedLoading' is received, and initializeGame() is called.
    5) initializeGame() sends to the game the number of players, the current player number (or -1 if just an spectator) and the random seed.
    6) 

*/

let room, sendTurn, getTurn;

export default {
  name: 'Game',
  props: ['gameId', 'gameRoom'],
  data() { return {
    gameType: "",
    peers: [],
    shareUrlText:"Share URL",
    settings: {
      players: [],
      playersToStart: 2,
      started: false,
      random: 0.0,
      finished: false
    },
    turn: 0,
    playerNumber: -1,
    playerTurn: ''
  }},

  mounted() {
    if (this.gameId == "manualComplete") {
        this.gameType = "Manual Turns with Complete Information";
    } else {

    }
    this.connect();
  },

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

    copyUrl() {
      var text = window.location.href;
      navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!');
      }, function(err) {
        console.error('Async: Could not copy text: ', err);
      });

      this.shareUrlText = "Copied!"
      setTimeout(() => {
        this.shareUrlText = "Share URL";
      }, 3000);
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

</script>



<style scoped>
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
    margin-top: 10px;
    transition-duration: 100ms;
  }

  #backButton {
    font-weight: 800;
    text-decoration: none;
    margin-top: 100px;
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
</style>