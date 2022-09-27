<script setup>
    import { useStarkNetStore } from '@/stores/starknet';
    import { computed, ref } from '@vue/runtime-core';

    const starkNetStore = useStarkNetStore();
    const hovering = ref(false);

    const label = computed(() => {
        if (starkNetStore.networkOk) {
            if (hovering.value) { return "Disconnect"; }
            return `${starkNetStore.shortAddress(14)}`;
        } else {
            if (starkNetStore.connected) {
                return `Change Network to ${starkNetStore.defaultNetworkName}`;
            } else {
                if (starkNetStore.connecting) {
                    return ". . .";
                } else {
                    return "Connect";
                }
            }
        }
    });

    function action() {
        console.log("action()");
        if (starkNetStore.networkOk) {
            starkNetStore.logout();
        } else {
            if (starkNetStore.connected) {
                //Change network not implemented yet?
            } else {
                if (!starkNetStore.connecting) {
                    starkNetStore.connect();
                }
            }
        }
    }
</script>

<template>
    <div>
        <div class="flex flex-center noSelect button" id="connectButton" @click="action" @mouseover="hovering = true" @mouseleave="hovering = false" v-if="!(starkNetStore.connected && !starkNetStore.networkOk)">{{label}}</div>
        <div class="flex flex-center" id="changeNotification" v-else>Please, manually change your Network to "{{starkNetStore.defaultNetworkName}}" to continue</div>
    </div>
</template>

<style scoped>
    #changeNotification {
        margin-top: 20px;
        width: 350px;
        max-width: 90vw;
        text-align: center;
        color: var(--yellow);
    }

    #connectButton {
        width: 300px;
        height: 40px;
        margin: 20px;
    }
</style>
