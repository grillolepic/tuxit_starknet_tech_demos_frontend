<script setup>
  import TuxitLogo from '@/components/TuxitLogo.vue';
  import GameTypeButton from '../components/GameTypeButton.vue';
</script>

<template>
  <TuxitLogo :size="250" id="tuxitLogo"/>
  <div class="flex column flex-center">
    <div class="subtitle">Tech-Demos:</div>
    <div class="flex flex-center row" id="gameTypeContainer">
      <router-link to="/createRoom/manualComplete"><GameTypeButton :label="'Manual Turns with Complete Information'"/></router-link>
      <GameTypeButton :label="'Manual Turns with Secret Randomness'" :disabled="true"/>
      <GameTypeButton :label="'Automatic Turns with Complete Information'" :disabled="true"/>
      <GameTypeButton :label="'Manual Proof-of-History Turns'" :disabled="true"/>
      <GameTypeButton :label="'Automatic Proof-of-History Sync'" :disabled="true"/>
      <GameTypeButton :label="'Fog of war?'" :disabled="true"/>
    </div>
  </div>
</template>

<style scoped>
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

@media only screen and (max-width: 549px) {
  #tuxitLogo {
    margin-top: 100px;
  }

  #gameTypeContainer {
    margin-bottom: 30px;
  }
}
</style>