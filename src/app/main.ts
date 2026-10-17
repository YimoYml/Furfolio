import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomePage from '../pages/HomePage.vue'
import TemplatesPage from '../pages/TemplatesPage.vue'
import EditorPage from '../pages/EditorPage.vue'
import PreviewPage from '../pages/PreviewPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import PublicPage from '../pages/PublicPage.vue'
import './style.css'
import './templates.css'
import './typography.css'
import './account.css'
import './editing.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/templates', component: TemplatesPage },
    { path: '/editor', component: EditorPage },
    { path: '/preview', component: PreviewPage },
    { path: '/login', component: LoginPage },
    { path: '/dashboard', component: DashboardPage },
    { path: '/showcase', component: () => import('../pages/ShowcasePage.vue') },
    { path: '/u/:slug', component: PublicPage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.afterEach(to => {
  const titles: Record<string, string> = { '/': 'Furfolio · 主页制作所', '/templates': '选择你的风格 · Furfolio', '/editor': '制作你的主页 · Furfolio', '/preview': '主页预览 · Furfolio', '/showcase':'作品广场 · Furfolio' }
  document.title = titles[to.path] || (to.path === '/login' ? '登录与注册 · Furfolio' : to.path === '/dashboard' ? '我的主页 · Furfolio' : titles['/']!)
})
createApp(App).use(createPinia()).use(router).mount('#app')
