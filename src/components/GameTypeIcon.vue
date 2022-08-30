<script setup>
    import { defineProps, computed } from '@vue/runtime-core';
    const props = defineProps(['icon', 'hideLabel']);

    const iconLabel = computed(() => {
        if (props.icon == 'manual') { return "Manual Turns"; }
        if (props.icon == 'auto') { return "Automatic Turns"; }
        if (props.icon == 'p2p') { return "Fully P2P"; }
        if (props.icon == 'complete') { return "Complete Information"; }
        if (props.icon == 'incomplete') { return "Incomplete Information"; }
    });

    const iconSelect = computed(() => { return {
        'icon_manual': (props.icon == 'manual'),
        'icon_auto': (props.icon == 'auto'),
        'icon_p2p': (props.icon == 'p2p'),
        'icon_complete': (props.icon == 'complete'),
        'icon_incomplete': (props.icon == 'incomplete')
    }});
</script>

<template>
    <div class="iconContainer flex column">
        <div class="typeIcon containNoRepeatCenter" :class="iconSelect"></div>
        <div class="iconLabel" v-if="!props.hideLabel">{{iconLabel}}</div>
    </div>
</template>

<style scoped>
    .iconContainer {
        align-items: center;
        justify-content: center;
        align-content: center;
    }

    .typeIcon {
        width: 100px;
        height: 62.5px;
        margin-bottom: 5px;
        background-position: center;
    }

    .iconLabel {
        font-weight: 800;
        max-width: 150px;
        font-size: 10px;
        text-align: center;
    }

  .icon_manual { background-image: url('/img/icons/manual_turns.png'); }
  .icon_auto { background-image: url('/img/icons/auto_turns.png'); }
  .icon_p2p { background-image: url('/img/icons/webRTC.png'); }
  .icon_complete { background-image: url('/img/icons/complete_state.png'); }
  .icon_incomplete { background-image: url('/img/icons/incomplete_state.png'); }

@media only screen and (max-width: 549px) {
    .iconLabel {
        height: 15px;
        max-width: 20vw;
    }
    .typeIcon {
        width: 20vw;
    }

    .iconContainer {
        margin-bottom: 10px;
    }
}
</style>



  