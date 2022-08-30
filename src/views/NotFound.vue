<script setup>
  import TuxitLogo from '@/components/TuxitLogo.vue';
</script>

<template>
  <div class="image404 containNoRepeatCenter"></div>
  <div class="flex column flex-center">
    <div class="subtitle red">Route not Found</div>
    <router-link :to="{ name: 'Home' }" id="backButton">Go Back</router-link>
  </div>
</template>

<style scoped>
  .image404 {
    width: 250px;
    height: 100px;
    margin-top: 50px;
    margin-right: 12px;
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