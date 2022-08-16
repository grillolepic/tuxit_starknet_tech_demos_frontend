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
      path: '/game/:gameId',
      name: 'gameJoin',
      component: () => import('../views/GameJoin.vue'),
      props: true
    },
    {
      path: '/game/:gameId/:gameRoom',
      name: 'gameRoom',
      component: () => import('../views/Game.vue'),
      props: true
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    }
  ]
})

export default router
