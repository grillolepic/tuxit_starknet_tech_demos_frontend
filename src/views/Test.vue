<script setup>
  import TuxitGame  from '../components/ManualCompleteGame.vue';
</script>

<template>
    <TuxitGame id="GameScreen" :userTurn="yourTurn" ref="game" @finishedLoading="initializeGame" @localTurn="localTurn"/>
</template>

<script>
export default {
  name: 'Test',
  data() { return {}},

  mounted() {},

  methods: {
    initializeGame() {
      this.$refs.game.initialize(2, 0, 383821472972);
    }
  },
}
</script>

<style scoped>
  #GameScreen {
    width: 512px;
    height: 512px;
    max-width: 80vw;
    max-height: 80vw;
  }
</style>