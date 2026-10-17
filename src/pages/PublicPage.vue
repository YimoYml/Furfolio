<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../cloud/api'
import { hydrateDraft } from '../domain/normalize'
import type { Draft } from '../domain/profile'
import ProfileRenderer from '../renderer/ProfileRenderer.vue'
import { remoteMediaMap } from '../domain/media'
const route = useRoute(), profile = ref<Draft>(), media = ref<Record<string, string>>({}), error = ref(''), loading = ref(true)
let version = 0
watch(() => route.params.slug, async address => {
  const current = ++version; loading.value = true; error.value = ''; profile.value = undefined
  try {
    const result = await api<{ config: { schemaVersion: number; profile: Draft; media: Record<string,string> } }>('public/' + encodeURIComponent(String(address)))
    if (version !== current) return
    if (result.config?.schemaVersion !== 1) throw new Error('这份主页暂时无法读取。')
    profile.value = hydrateDraft(JSON.stringify(result.config.profile))
    media.value = remoteMediaMap(result.config.media)
    document.title = profile.value.name + ' · Furfolio'
  } catch (e) { if (version === current) error.value = (e as Error).message } finally { if (version === current) loading.value = false }
}, { immediate: true })
onBeforeUnmount(() => { version++ })
</script>
<template><ProfileRenderer v-if="profile" :profile="profile" :media="media" readonly /><main v-else class="public-message"><RouterLink to="/" class="brand">FURFOLIO<span>.</span></RouterLink><h1>{{ loading ? '正在遇见一个新的世界。' : '这张名片，暂时不在这里。' }}</h1><p v-if="error">{{ error }}</p><RouterLink to="/" class="text-link">去制作自己的主页 ↗</RouterLink></main></template>
