import { createApp } from 'vue';
import { createPinia } from 'pinia';

import Vue3TouchEvents from "vue3-touch-events";

import App from './App.vue';
import router from './router';

import './assets/main.css';

const app = createApp(App);

app.use(Vue3TouchEvents);
app.use(createPinia());
app.use(router);

app.mount('#app');
