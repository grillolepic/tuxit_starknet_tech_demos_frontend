import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(), //import.meta.env.BASE_URL
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomeView
    },
    {
      path: '/createRoom/:gameId',
      name: 'CreateRoom',
      component: () => import('../views/CreateRoom.vue'),
      props: true
    },
    {
      path: '/room/:roomId',
      name: 'GameRoom',
      component: () => import('../views/GameRoom.vue'),
      props: true
    },
    {
      path: '/game/:roomId',
      name: 'Game',
      component: () => import('../views/Game.vue'),
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
    },
  ]
})

export default router
