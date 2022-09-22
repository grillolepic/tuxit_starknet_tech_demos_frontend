<script setup>
  import { RouterView, useRoute } from 'vue-router';
  import useBreakpoints from '@/helpers/useBreakpoints';
  import { useStarkNetStore } from '@/stores/starknet';
  import TuxitLogo from '@/components/TuxitLogo.vue';
  import ConnectButton from '@/components/ConnectButton.vue';
  import NavBar from '@/components/NavBar.vue';

  const { width, type } = useBreakpoints();
  const starkNetStore = useStarkNetStore();

</script>

<template>
  <NavBar v-if="starkNetStore.networkOk"/>
  <div id="routerViewContainer" class="flex flex-center column" v-if="starkNetStore.networkOk">
    <RouterView/>
  </div>
  <div v-else-if="starkNetStore.initialized">
    <TuxitLogo/>
    <ConnectButton/>
  </div>
</template>

<style scoped>
  #routerViewContainer {
    height: calc(100vh - 80px);
  }

  #connectionRow {
    height: 80px;
  }

  #networkName {
    width:  300px;
    margin-left: unset;
    margin-top: 20px;
    text-align: center;
    color: var(--yellow);
  }
</style>