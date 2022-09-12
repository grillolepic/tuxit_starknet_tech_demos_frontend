<script setup>
  import { useTuxitStore } from '@/stores/tuxit';
  import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
  import { ref, onMounted, onUnmounted, defineProps } from '@vue/runtime-core';
  import LoadingSpinner from '@/components/LoadingSpinner.vue';

  const props = defineProps(['roomId']);
  const tuxitStore = useTuxitStore();
  const router = useRouter();
  const route = useRoute();

  const roomFilled = ref(false);
  const joiningWhileUnfinished = ref(false);
  const timeLeft = ref(0);

  let _startInterval = false;
  let _timeoutInterval;
  let _intervalCount = 0;
  const _secondsToUpdateRoomStatus = 10;

  onMounted(async () => {
    tuxitStore.reset();
    await updateRoomStatus();

    if (_startInterval) {
      updateTimeLeft();
      _timeoutInterval = setInterval(async () => {
        _intervalCount++;
        updateTimeLeft();
        if (_intervalCount == _secondsToUpdateRoomStatus) {
          _intervalCount = 0;
          await updateRoomStatus(true);
        }
      }, 1000);
    }
  });

  async function updateRoomStatus(checkBlock = false) {
    await tuxitStore.loadRoom(props.roomId, checkBlock);
    if (tuxitStore.gameId == null) { return await router.push({ name: "Home" }); }
    if (tuxitStore.roomId == null) { return await router.push({ name: "CreateRoom", params: { gameId: tuxitStore.gameId }}); }
    if (tuxitStore.roomJoined) {
      if (tuxitStore.roomStatus > 0) { return await router.push({ name: "Game", params: { roomId: tuxitStore.roomId }}); }
      else { _startInterval = true; }
    } else {
      if (tuxitStore.unfinishedRoomId != null) {
        joiningWhileUnfinished.value = true;
      } else {
        if (tuxitStore.roomStatus == 0) {
          _startInterval = true;
        } else {
          roomFilled.value = true;
        }
      }
    }
  }

  async function updateTimeLeft() {
    if (tuxitStore.roomId == null) { return; }
    const currentTs = Math.floor(Date.now()/1000);
    let deadlineTs = tuxitStore.roomDeadline;
    if (currentTs > deadlineTs) { return await router.push({ name: "CreateRoom", params: { gameId: tuxitStore.gameId }}); }
    timeLeft.value = new Date((deadlineTs - currentTs) * 1000).toISOString().substring(11,19);
  }

  async function closeRoom() {
    await tuxitStore.closeRoom(props.roomId);
    if (tuxitStore.gameId == null) { return await router.push({ name: "Home" }); }
  }

  async function joinRoom() {
    await tuxitStore.joinRoom();
    if (tuxitStore.roomStatus > 0) { return await router.push({ name: "Game", params: { roomId: tuxitStore.roomId }}); }
  }

  async function activeRoom() {
    await router.push({ name: "GameRoom", params: { roomId: tuxitStore.unfinishedRoomId }});
    location.reload();
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
    if (_timeoutInterval != null) {
      clearInterval(_timeoutInterval);
    }
    next();
  });

  onUnmounted(()=>{
    if (_timeoutInterval != null) {
      clearInterval(_timeoutInterval);
    }
  });
</script>

<template>
    <div class="flex column flex-center" v-if="tuxitStore.loadingRoom || tuxitStore.joiningRoom || tuxitStore.closingRoom">
      <LoadingSpinner/>
      <div id="loadingMessage" v-if="tuxitStore.loadingRoom">Loading Game Room #{{props.roomId}}</div>
      <div id="loadingMessage" v-if="tuxitStore.closingRoom">Closing Game Room #{{props.roomId}}</div>
      <div id="loadingMessage" v-if="tuxitStore.joiningRoom">Joining Game Room #{{props.roomId}}</div>
    </div>
    <div class="flex column flex-center" v-else-if="joiningWhileUnfinished">
      <div class="title red">Unfinished Game</div>
      <div class="description">You can't join a new Game Room while playing in another Game Room.</div>
      <div id="closeButton" class="button">Go to my active Game Room</div>
    </div>
    <div class="flex column flex-center" v-else-if="roomFilled">
      <div class="title red">Game Started</div>
      <div class="description">You can't join this Game Room, as it has already started and is being played.</div>
      <router-link :to="{ name: 'Home' }"><div id="closeButton" class="button">Go to Home</div></router-link>
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
</template>

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