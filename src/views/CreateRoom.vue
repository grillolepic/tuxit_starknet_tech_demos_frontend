<script setup>
  import { useStarkNetStore } from '@/stores/starknet';
  import { useTuxitStore } from '@/stores/tuxit';
  import { useRouter } from 'vue-router';
  import { onMounted, defineProps } from '@vue/runtime-core';

  import LoadingSpinner from '@/components/LoadingSpinner.vue';
  import GameTypeIcon from '@/components/GameTypeIcon.vue';

  const props = defineProps(['gameId']);
  const starkNetStore = useStarkNetStore();
  const tuxitStore = useTuxitStore();
  const router = useRouter();

  onMounted(async () => {
    tuxitStore.reset();
    await tuxitStore.loadGame(parseInt(props.gameId));
    if (tuxitStore.gameId == null) { return router.push({ name: "Home" }); }
    if (tuxitStore.unfinishedRoomId != null) {
      router.push({ name: "GameRoom", params: { roomId: tuxitStore.unfinishedRoomId.toString() }});
    }
  });

  async function create() {
    await tuxitStore.createRoom(parseInt(props.gameId));
    if (tuxitStore.unfinishedRoomId != null) {
      router.push({ name: "GameRoom", params: { roomId: tuxitStore.unfinishedRoomId.toString() }});
    }
  }
</script>

<template>
  <div id="createRoomContainer" class="flex column flex-center">
    <div class="title">{{tuxitStore.gameName}}</div>

    <div class="flex column flex-center" v-if="!tuxitStore.creatingRoom && !tuxitStore.loadingPreviousRooms && tuxitStore.unfinishedRoomId == null">
      <div id="gameTypeIconsContainer" class="flex row" >
        <GameTypeIcon :icon="tuxitStore.turnMode" />
        <GameTypeIcon :icon="'p2p'"/>
        <GameTypeIcon :icon="'complete'"/>
      </div>
      <div class="description">{{tuxitStore.gameDescription}}</div>

      <div id="createButton" class="button" @click="create()">Create New Game Room</div>
      <router-link :to="{ name: 'Home' }" id="backButton">Go Back</router-link>
    </div>
    <div id="loadingContainer" class="flex column flex-center" v-else>
      <LoadingSpinner/>
      <div id="loadingMessage" v-if="tuxitStore.creatingRoom">Creating Game Room on {{starkNetStore.networkName}}</div>
      <div id="loadingMessage" v-if="(tuxitStore.loadingPreviousRooms || tuxitStore.unfinishedRoomId != null)">Loading...</div>
    </div>
  </div>
  <div id="contractAddress" class="flex column flex-center" v-if="!tuxitStore.creatingRoom && !tuxitStore.loadingPreviousRooms && tuxitStore.unfinishedRoomId == null">
    <div>Game Contract:</div>
    <a :href="`https://goerli.voyager.online/contract/${tuxitStore.gameContract}`">{{tuxitStore.gameContract}}</a>
  </div>
</template>

<style scoped>
  #contractAddress {
    display: flex;
    position: absolute;
    font-size: 12px;
    bottom: 20px;
    width: 100vw;
    color: #555064 !important;
  }

  #contractAddress a {
    color: #555064 !important;
    text-decoration: underline;
  }

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