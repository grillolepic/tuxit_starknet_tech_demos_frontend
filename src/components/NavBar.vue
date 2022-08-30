<script setup>
    import { useStarkNetStore } from '@/stores/starknet';
    import { computed, ref } from '@vue/runtime-core';
    import useBreakpoints from '@/helpers/useBreakpoints';
    import { RouterView, useRoute } from 'vue-router';
    import ConnectButton from '@/components/ConnectButton.vue';
    import TuxitLogo from '@/components/TuxitLogo.vue';

    const { width, type } = useBreakpoints();
    const starkNetStore = useStarkNetStore();

    const currentPath = computed(() => { return useRoute().path; });
    const menu = ref(false);

    function menuDisconnect() {
        this.showMenu(false);
        starkNetStore.logout();
    }

    function showMenu(b) {
        this.menu = b;
    }
    
    function swipeHandler(event) {
        this.showMenu(false);
	}
</script>

<template>
    <div class="flex row" id="Navbar">
        <TuxitLogo :hideText="true" :size='75' v-if="type!='xs'"/>
        <ConnectButton v-if="type!='xs'"/>
    
        <div id="MenuButton" class="phoneIcon" @click="showMenu(true)" v-if="type=='xs'"></div>

        <div id="Menu" :class="{ 'show-menu': menu }" v-if="type=='xs'" v-touch:swipe.right="swipeHandler">
            <div id="closeMenu" class="phoneIcon" @click="showMenu(false)"></div>

            <TuxitLogo :hideText="true" :size='150' :dark="true"/>
            <div id="menuAddress">{{starkNetStore.shortAddress(14)}}</div>
            <div id="menuDisconnect" class="flex flex-center" @click="menuDisconnect()">Disconnect</div>
        </div>

        <div id="GreyBg" :class="{ 'show-menu-bg': menu }" v-if="type=='xs'" @click="showMenu(false)" v-touch:swipe.right="swipeHandler"></div>
    </div>  
</template>

<style scoped>
    .tuxitLogo {
        width: 75px;
        height: 32px;
    }

    #Navbar {
        position: static;
        z-index: 100;
        height: 60px;
        width: 100%;
        justify-content: space-between;
        align-items: center;
    }

    .phoneIcon {
        height: 40px;
        width: 40px;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
    }

    #MenuButton {
        background-image: url('/public/img/menu.png');
    }

    #Menu {
        position: fixed;
        width: 100vw;
        height: 100vh;
        right: 0px;
        top: 0px;
        background-color: var(--yellow);
        transform: translateX(110vw);
        transition: ease-in-out 0.2s;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        justify-content: center;
        align-content: flex-start;
        align-items: center;
        box-shadow: 0px 0px 20px #000000AA;
    }

    #closeMenu {
        background-image: url('/public/img/close.png');
        position: absolute;
        right: 20px;
        top: 20px;
    }

    .show-menu {
        transform: translateX(0px) !important;
    }

    #GreyBg {
        z-index: 500;
        background-color: rgba(0, 0, 0, 0);
        transition: ease-in-out 0.5s;
        position: fixed;
        top:0px;
        left: 0px;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
    }

    .show-menu-bg {
        pointer-events: all !important;
        background-color: rgba(0, 0, 0, 0.4) !important;
    }

    #menuAddress {
        margin: 20px;
        color: black;
    }

    #menuDisconnect {
        width: 300px;
        height: 40px;
        border: 3px solid white;
        border-radius: 100px;
        cursor: pointer;
        background-color: var(--very-dark-blue);
    }

    #menuDisconnect:hover {
        background-color: var(--red-highlight);
    }

@media only screen and (max-width: 549px) {
    #Navbar {
        justify-content: flex-end;
        width: 95vw;
    }
}
</style>