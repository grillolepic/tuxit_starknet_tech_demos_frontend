<script setup>
    import { defineProps } from '@vue/runtime-core';
    const props = defineProps(['hideText', 'size', 'dark']);
</script>

<template>
    <div id="homeLogo" class="flex column flex-center">
        <div class="tuxitLogo containNoRepeat" :class="{ 'darkLogo': props.dark }" :style="{ 'width': `${props.size}px`, 'height': `${props.size*(64/150)}px` }"></div>
        <div class="subtitle" v-if="!props.hideText">Trustless Social Gaming</div>
        <div class="flex row flex-center" v-if="!props.hideText">
            <div id="onText">on</div>
            <div id="inlineStarkNet" class="starkNetLogo containNoRepeat"></div>
        </div>
  </div>
</template>

<style scoped>
    .tuxitLogo {
        width: 150px;
        height: 64px;
        margin: 10px;
    }

    .darkLogo {
        background-image: url(/img/tuxit_logo_black.png);
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
</style>



  