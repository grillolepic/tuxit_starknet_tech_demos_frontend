<script setup>
    import { defineProps } from '@vue/runtime-core';
    const props = defineProps([]);
</script>

<template>
    <div class="spinner containNoRepeat"></div>
</template>

<style scoped>
    .spinner {
        width: 50px;
        height: 50px;
        margin: 20px;
    }
</style>