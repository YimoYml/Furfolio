<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api, type ShowcaseEntry, type ShowcaseResult } from '../cloud/api'
import { contrastText, validHex } from '../domain/profile'
import '../app/showcase.css'

const entries = ref<ShowcaseEntry[]>([]), cursor = ref<string | null>(null)
const loading = ref(false), ready = ref(false), error = ref('')
let active = true
async function load(more = false) {
  if (loading.value || more && !cursor.value) return
  loading.value = true; error.value = ''
  try {
    const result = await api<ShowcaseResult>('showcase' + (more ? '?cursor=' + encodeURIComponent(cursor.value!) : ''))
    if (!active) return
    const existing = more ? entries.value : []
    const seen = new Set(existing.map(item => item.slug))
    entries.value = [...existing, ...result.items.filter(item => { if (seen.has(item.slug)) return false; seen.add(item.slug); return true })]
    cursor.value = result.nextCursor; ready.value = true
  } catch(e) { if (active) error.value = (e as Error).message }
  finally { if (active) loading.value = false }
}
function palette(entry: ShowcaseEntry) {
  const background = validHex(entry.theme.acid, '#d5ec42'), accent = validHex(entry.theme.blue, '#2949dd')
  return {'--showcase-color':background, '--showcase-accent':accent, '--showcase-text':contrastText(background)}
}
onMounted(() => load())
onBeforeUnmount(() => { active = false })
</script>
<template>
  <main class="showcase-page">
    <RouterLink to="/" class="text-link showcase-back">← 回到首页</RouterLink>
    <div class="showcase-heading"><h1>作品广场。</h1><p>每一张主页，都有自己的颜色。</p></div>
    <div v-if="error" class="showcase-error" role="alert"><p>{{ error }}</p><button class="text-link" @click="load(ready && !!cursor)">重新载入 ↗</button></div>
    <div v-if="!ready && loading" class="showcase-loading" role="status"><span>正在遇见更多颜色…</span><div aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <section v-if="entries.length" class="showcase-grid" aria-label="社区已发布的个人主页">
      <RouterLink v-for="entry in entries" :key="entry.slug" :to="'/u/' + entry.slug" target="_blank" rel="noopener" class="showcase-entry" :style="palette(entry)" :aria-label="`打开${entry.name}的主页（新窗口）`">
        <div class="showcase-cover" aria-hidden="true"><strong>{{ entry.englishName || entry.name }}</strong><span class="showcase-swatch"></span></div>
        <div class="showcase-caption"><h2>{{ entry.name }}的主页</h2><span aria-hidden="true">↗</span></div>
      </RouterLink>
    </section>
    <section v-else-if="ready && !error" class="showcase-empty"><h2>第一种颜色，<br />等你来。</h2><p>发布主页时，开启“允许展示在作品广场”，<br />就能在这里遇见更多朋友。</p><RouterLink to="/editor" class="button button-dark">做一张自己的主页 ↗</RouterLink></section>
    <div v-if="ready && entries.length" class="showcase-more"><p v-if="loading" role="status">正在遇见更多颜色…</p><button v-else-if="cursor" class="button button-dark" @click="load(true)">再看看更多 <span aria-hidden="true">↓</span></button><p v-else>这些颜色，组成我们的世界。</p></div>
    <footer class="showcase-footer"><p>下一个被发现的，也许就是你。</p><RouterLink to="/editor" class="text-link">开始我的主页 ↗</RouterLink></footer>
  </main>
</template>
