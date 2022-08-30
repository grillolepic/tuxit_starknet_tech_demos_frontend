import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/createRoom/:gameId',
      name: 'CreateRoom',
      component: () => import('../views/CreateRoom.vue'),
      props: true
    },
    {
      path: '/room/:gameId/:roomId',
      name: 'GameRoom',
      component: () => import('../views/GameRoom.vue'),
      props: true
    }
  ]
})

export default router
