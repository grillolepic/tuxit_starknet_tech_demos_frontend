<script setup>
  import TuxitLogo from '@/components/TuxitLogo.vue';
</script>

<template>
  <TuxitLogo :size="250" :hideText="true" id="tuxitLogo"/>
  <div class="flex column flex-center">
    <div class="subtitle">Route not Found</div>
    <router-link :to="{ name: 'Home' }" id="backButton">Go Back</router-link>
  </div>
</template>

<style scoped>
  #tuxitLogo {
    margin-top: 50px;
  }

  .subtitle {
    margin-top: 10px;
  }

@media only screen and (max-width: 549px) {
  #tuxitLogo {
    margin-top: 100px;
  }
}
</style>