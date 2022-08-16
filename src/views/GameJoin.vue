<script setup>
</script>

<template>
  <div id="homeLogo" class="flex column flex-center">
    <div class="tuxitLogo containNoRepeat"></div>
    <div class="subtitle">{{gameType}}</div>
    <div class="description">{{gameDescription}}</div>
  </div>

  <div class="flex column flex-center">
    <div class="subtitle">Join a Room:</div>
    <div class="flex row flex-center">
        <input id="roomInput" v-model="roomName"/>
        <div id="randomButton" class="noSelect" @click="createRandomRoom()">🎇</div>
    </div>
    <div id="joinButton" :class="{ 'disabled': (roomName.length < 5)}" @click="joinRoom()">
        Join!
    </div>
    <router-link to="/" id="backButton">Go Back</router-link>
  </div>
</template>


<script>
export default {
    name: 'JoinGame',
    props: ['gameId'],
    data() { return {
        gameType: "",
        gameDescription: "",
        roomName: ""
    }},
    mounted() {
        if (this.gameId == "manualComplete") {
            this.gameType = "Manual Turns with Complete Information";
            this.gameDescription = "Our most basic game-type. Players interact in turns, by signing their actions and sending them to each other via WebRTC (fully P2P). The complete game state is available to all players and can be publicly verified  by anyone by executing the complete chain of signed turns from the initial state.";
        } else {

        }
        this.createRandomRoom();
    },
    methods: {
        createRandomRoom() {
            this.roomName = generateId();
        },
        joinRoom() {
            if (this.roomName.length >= 5) {
                window.location.href = `/game/${this.gameId}/${this.roomName}`;
            }
        }
    }
}

function dec2hex (dec) {
  return dec.toString(16).padStart(2, "0")
}

function generateId (len) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}
</script>



<style scoped>
  #homeLogo {
    margin-bottom: 20px;
  }

  .tuxitLogo {
    width: 150px;
    height: 64px;
    margin: 10px;
  }

  .subtitle {
    font-size: 18px;
    font-weight: 800;
    text-align: center;
  }

  .description {
    max-width: 380px;
    font-size: 14px;
    font-weight: 200;
    text-align: justify;
  }

  #onText {
    font-size: 16px;
    margin-right: 5px;
  }

  #inlineStarkNet {
    display: inline-block;
    height: 20px;
    width: 100px;
  }

  a {
    margin: 5px;
    text-align: center;
    color: var(--white);
  }

  a:hover {
    color: var(--redHighlight);
  }

    input {
        width: 200px;
        height: 32px;
        padding: 8px;
        font-family: 'Comfortaa', cursive;
        border-radius: 15px;
        border: 0px solid;
        margin-left: 26px;
    }

    #randomButton {
        margin-left: 5px;
        cursor: pointer;
        font-size: 21px;
        transition-duration: 100ms;
    }

    #randomButton:hover {
        transform: scale(1.05);
    }

  #backButton {
    font-weight: 800;
    text-decoration: none;
    margin-top: 100px;
  }

    #joinButton {
      margin-top: 5px;
      cursor: pointer;
      color: var(--yellow);
      font-weight: 800;
      font-size: 21px;
    }

  .disabled {
    color: var(--grey);
    cursor: default !important;
  }
</style>