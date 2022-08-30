<script setup>
  import { useStarkNetStore } from '@/stores/starknet';
  import { useTuxitStore } from '@/stores/tuxit';

  import LoadingSpinner from '@/components/LoadingSpinner.vue';

  import { useRouter } from 'vue-router';
  import { ref, onMounted, defineProps, computed } from '@vue/runtime-core';
  import GameTypeIcon from '@/components/GameTypeIcon.vue';

  const props = defineProps(['gameId']);
  const starkNetStore = useStarkNetStore();
  const tuxitStore = useTuxitStore();
  const router = useRouter();

  console.log(router);

  const loadingPreviousRooms = ref(true);
  const gameType = ref('');
  const gameDescription = ref('');
  const roomName = ref('');
  const turnMode = computed(() => { return (["manualComplete"].includes(props.gameId))?'manual':'auto' });

  onMounted(async () => {

    console.log(props.gameId)
    const gameInfo = tuxitStore.getGameTypeInfo(props.gameId);
    if (gameInfo == null) { return router.push({ name: "Home" }); }
    gameType.value = gameInfo.type;
    gameDescription.value = gameInfo.description;

    let lastRoomId = await tuxitStore.getLastRoomId()
    if (lastRoomId != null) {
      if (!await tuxitStore.isRoomFinished(lastRoomId)) {
        router.push({ name: "GameRoom ", params: { gameId: props.gameId, roomId: lastRoomId.toString() }});
      } else { loadingPreviousRooms.value = false; }
    } else { loadingPreviousRooms.value = false; }
  });

  async function create() {
    let roomId = await tuxitStore.createRoom(0);
    if (roomId != null) {
      router.push({ name: "GameRoom ", params: { gameId: props.gameId, roomId: lastRoomId.toString() }});
    }
  }
</script>

<template>
  <div id="createRoomContainer" class="flex column">
    <div class="title">{{gameType}}</div>

    <div class="flex column flex-center" v-if="!tuxitStore.creatingRoom && !loadingPreviousRooms">
      <div id="gameTypeIconsContainer" class="flex row" >
        <GameTypeIcon :icon="turnMode" />
        <GameTypeIcon :icon="'p2p'"/>
        <GameTypeIcon :icon="'complete'"/>
      </div>
      <div class="description">{{gameDescription}}</div>

      <div id="createButton" class="button" @click="create()">Start New Game</div>
      <router-link :to="{ name: 'Home' }" id="backButton">Go Back</router-link>
    </div>
    <div id="loadingContainer" class="flex column flex-center" v-else>
      <LoadingSpinner/>
      <div id="loadingMessage" v-if="tuxitStore.creatingRoom">Creating Game Room on {{starkNetStore.networkName}}</div>
      <div id="loadingMessage" v-else>Checking for unfinished Games</div>
    </div>
  </div>
</template>

<style scoped>
  .title {
    max-width: 380px;
  }

  #gameTypeIconsContainer {
    width: 100%;
    justify-content: space-around;
    margin: 20px 0px;
  }

  .description {
    width: 380px;
    max-width: 80vw;
    font-size: 14px;
    font-weight: 200;
    text-align: justify;
  }

  #backButton {
    font-weight: 800;
    text-decoration: none;
    margin-top: 20px;
  }

  #createButton {
    margin: 20px;
    width: 380px;
    max-width: 80vw;
    height: 40px;
  }

  #createRoomContainer {
    min-height: 400px;
  }

  #loadingContainer {
    height: 100%;
    width: 100%;
    max-width: 380px;
    text-align: center;
  }

  #loadingMessage {
    width: 75%;
    margin-bottom: 100px;
  }
</style>