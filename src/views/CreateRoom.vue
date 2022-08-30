<script setup>
  import { useStarkNetStore } from '@/stores/starknet';
  import { useTuxitStore } from '@/stores/tuxit';
  import LoadingSpinner from '@/components/LoadingSpinner.vue';

  import { ref, onMounted, defineProps, computed } from '@vue/runtime-core';
  import GameTypeIcon from '@/components/GameTypeIcon.vue';

  const props = defineProps(['gameId']);
  const starkNetStore = useStarkNetStore();
  const tuxitStore = useTuxitStore();

  const loadingPreviousRooms = ref(true);
  const gameType = ref('');
  const gameDescription = ref('');
  const roomName = ref('');
  const turnMode = computed(() => { return (["manualComplete"].includes(props.gameId))?'manual':'auto' });

  onMounted(async () => {
    const { type, description } = tuxitStore.getGameTypeInfo(props.gameId);
    gameType.value = type;
    gameDescription.value = description;

    let lastRoomId = await tuxitStore.getLastRoomId()
    if (lastRoomId != null) {
      if (!await tuxitStore.isRoomFinished(lastRoomId)) {
        window.location.href = `/room/${props.gameId}/${lastRoomId.toNumber()}`;
      } else { loadingPreviousRooms.value = false; }
    } else { loadingPreviousRooms.value = false; }
  });

  async function create() {
    let roomId = await tuxitStore.createRoom(0);
    if (roomId != null) {
      window.location.href = `/room/${props.gameId}/${roomId}`;
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
      <router-link to="/" id="backButton">Go Back</router-link>
    </div>
    <div id="loadingContainer" class="flex column flex-center" v-else>
      <LoadingSpinner/>
      <div id="loadingMessage" v-if="tuxitStore.creatingRoom">Creating new Game Room on {{starkNetStore.networkName}}...</div>
      <div id="loadingMessage" v-else>Checking if you have unfinished Game Rooms...</div>
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