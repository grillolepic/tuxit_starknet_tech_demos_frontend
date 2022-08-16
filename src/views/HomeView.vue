<template>
  <div id="homeLogo" class="flex column flex-center">
    <div class="tuxitLogo containNoRepeat"></div>
    <div class="subtitle">Trustless Social Gaming</div>
    <div class="flex row flex-center">
      <div id="onText">on</div>
      <div id="inlineStarkNet" class="starkNetLogo containNoRepeat"></div>
    </div>
  </div>

  <div class="flex column flex-center">
    <div class="subtitle">Tech-Demos:</div>
    <router-link to="/game/manualComplete">Manual Turns with Complete Information</router-link>
    <div class="notImplemented">Manual Turns with Secret Randomness</div>
    <div class="notImplemented">Interactive Turns with Complete Information</div>
    <div class="notImplemented">Dynamic Incomplete Information?</div>
    <div class="notImplemented">Full Real Time with trustless timestamps?</div>
  </div>
</template>

<style scoped>
  #homeLogo {
    margin-bottom: 20px;
  }

  .tuxitLogo {
    width: 150px;
    height: 64px;
    margin: 10px;
  }

  #onText {
    font-size: 16px;
    margin-right: 5px;
  }

  #inlineStarkNet {
    display: inline-block;
    height: 20px;
    width: 100px;
  }

  .notImplemented {
    margin: 5px;
    text-align: center;
    color: var(--grey);
  }
</style>