<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { HomepageQr } from '../qr/generate'

const props = defineProps<{ slug: string }>()
const qr = ref<HomepageQr | null>(null), error = ref(''), loading = ref(false)
const downloadUrl = ref('')
let generation = 0
function releaseDownload() {
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
  downloadUrl.value = ''
}
async function generate() {
  const current = ++generation
  releaseDownload()
  loading.value = true; error.value = ''; qr.value = null
  try {
    // Both the encoder and artwork load only after “生成二维码” is clicked.
    const { generateHomepageQr } = await import('../qr/generate')
    const result = await generateHomepageQr(props.slug)
    if (current === generation) { qr.value = result; downloadUrl.value = URL.createObjectURL(result.png) }
  } catch (e) {
    if (current === generation) error.value = (e as Error).message
  } finally { if (current === generation) loading.value = false }
}
watch(() => props.slug, generate, { immediate: true })
onBeforeUnmount(() => { generation++; releaseDownload() })
</script>
<template>
  <div class="qr-code-panel" :aria-busy="loading">
    <div class="qr-preview">
      <img v-if="qr" :src="qr.dataUrl" :alt="`主页 /u/${slug} 的二维码`" width="300" height="300" />
      <p v-else-if="loading" role="status">正在生成你的二维码…</p>
      <div v-else-if="error"><p role="alert">{{ error }}</p><button class="text-link" @click="generate">重新生成 ↗</button></div>
    </div>
    <template v-if="qr">
      <a :href="qr.url" target="_blank" rel="noopener" class="qr-address">{{ qr.url }}</a>
      <a :href="downloadUrl" :download="`furfolio-${slug}-qr.png`" class="button button-dark qr-download">下载高清 PNG <span aria-hidden="true">↓</span></a>
      <p class="qr-resolution">{{ qr.width }} × {{ qr.width }} px · 适合名片、贴纸与印刷</p>
      <p class="qr-hint">更新主页内容可继续使用；更换地址后请重新生成。<br />手机上也可以长按二维码图片保存。</p>
    </template>
  </div>
</template>
