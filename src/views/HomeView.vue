<script setup>
  import TuxitLogo from '@/components/TuxitLogo.vue';
  import GameTypeButton from '../components/GameTypeButton.vue';
  import LoadingSpinner from '@/components/LoadingSpinner.vue';

  import { useTuxitStore } from '@/stores/tuxit';
  const tuxitStore = useTuxitStore();
</script>

<template>
  <div v-if="!tuxitStore.loadingPreviousRooms">
    <div class="flex flex-center column" v-if="tuxitStore.unfinishedRoomId == null">
      <TuxitLogo :size="250" id="tuxitLogo"/>
      <div class="subtitle">Tech-Demos:</div>
      <div class="flex flex-center row" id="gameTypeContainer">
        <router-link :to="{ name: 'CreateRoom', params: { gameId: 0}}"><GameTypeButton :label="'Manual Turns with Complete Information'"/></router-link>
        <GameTypeButton :label="'Manual Turns with Secret Randomness'" :disabled="true"/>
        <GameTypeButton :label="'Automatic Turns with Complete Information'" :disabled="true"/>
        <GameTypeButton :label="'Manual Proof-of-History Turns'" :disabled="true"/>
        <GameTypeButton :label="'Automatic Proof-of-History Sync'" :disabled="true"/>
        <GameTypeButton :label="'Fog of war?'" :disabled="true"/>
      </div>
    </div>
    <div class="flex flex-center column" v-else>
      <TuxitLogo :size="250" id="tuxitLogo"/>
      <router-link :to="{ name: 'GameRoom', params: { roomId: tuxitStore.unfinishedRoomId}}"><div id="continueGameButton" class="button flex flex-center noSelect ">Continue Game #{{tuxitStore.unfinishedRoomId}}</div></router-link>
    </div>
  </div>
  <div class="flex column flex-center" v-else>
      <LoadingSpinner />
      <div id="loadingMessage" v-if="tuxitStore.gameStatus == 0">Loading...</div>
  </div>

  <div id="contractAddress" class="flex column flex-center" v-if="!tuxitStore.loadingPreviousRooms">
    <div>Tuxit Contract:</div>
    <a :href="`https://goerli.voyager.online/contract/${tuxitStore.tuxitContract}`">{{tuxitStore.tuxitContract}}</a>
  </div>

</template>

<style scoped>
  #continueGameButton {
    width: 400px;
    height: 80px;
    padding: 20px 5px;
    margin: 10px;
    border-radius: 20px;
    background-color: var(--very-dark-blue);
    text-align: center;
  }

  #continueGameButton:hover {
    background-color: var(--red-highlight);
  }

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

  #tuxitLogo {
    margin-top: 50px;
  }

  .subtitle {
    margin-top: 30px;
  }

  #gameTypeContainer {
    flex-wrap: wrap;
    width: 450px;
    max-width: 90vw;
    margin-bottom: 100px;
  }

  a .gameTypeButton {
    text-decoration: none !important;
  }

  #loadingMessage {
    width: 100%;
    margin-bottom: 100px;
    text-align: center;
  }

@media only screen and (max-width: 549px) {
  #tuxitLogo {
    margin-top: 100px;
  }

  #gameTypeContainer {
    margin-bottom: 30px;
  }
}
</style>