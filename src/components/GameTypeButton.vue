<script setup>
    import { useStarkNetStore } from '@/stores/starknet';
    import { computed, ref } from '@vue/runtime-core';
    import { defineProps } from '@vue/runtime-core';
    const props = defineProps(['label', 'disabled']);
    const starkNetStore = useStarkNetStore();
</script>

<template>
    <div class="flex flex-center noSelect gameTypeButton disabled" v-if="props.disabled">{{props.label}}</div>
    <div class="flex flex-center noSelect gameTypeButton active" v-if="!props.disabled">{{props.label}}</div>
</template>

<style scoped>
    .gameTypeButton {
        width: 200px;
        height: 80px;
        padding: 20px 5px;
        margin: 10px;
        border-radius: 20px;
        background-color: var(--very-dark-blue);
        text-align: center;
    }

    .active {
        border: 3px solid white;
        color: var(--white);
        cursor: pointer;
    }

    .active:hover {
        background-color: var(--red-highlight);
    }

    .disabled {
        border: 3px solid var(--grey);
        color: var(--grey);
    }

@media only screen and (max-width: 549px) {
    .gameTypeButton {
        width: 80vw;
    }
}
</style>
