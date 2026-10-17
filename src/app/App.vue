<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const route = useRoute()
const auth = useAuthStore()
const showHeader = computed(() => !['/editor', '/preview'].includes(route.path) && !route.path.startsWith('/u/'))
onMounted(() => { if (!route.path.startsWith('/u/')) void auth.refresh().catch(() => undefined) })
</script>
<template>
  <header v-if="showHeader" class="site-header">
    <RouterLink to="/" class="brand">FURFOLIO<span>.</span></RouterLink>
    <nav aria-label="平台导航">
      <RouterLink to="/templates">选择风格</RouterLink>
      <RouterLink to="/preview?sample=1" class="header-example">示例主页 <span>↗</span></RouterLink>
      <RouterLink :to="auth.user ? '/dashboard' : '/login'" class="header-account">{{ auth.user ? '我的主页' : '登录' }}</RouterLink>
      <RouterLink to="/editor" class="button button-dark">开始制作 <span>↗</span></RouterLink>
    </nav>
  </header>
  <RouterView />
</template>
