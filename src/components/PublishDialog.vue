<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '../stores/editor'
import { useAuthStore } from '../stores/auth'
import { useDialog } from '../composables/useDialog'
import { api, CloudError, uploadPicture, type HomeResult, type Homepage } from '../cloud/api'
import { cloudContext, rememberHomepage } from '../cloud/context'
import { getAsset } from '../persistence/assets'
import type { Draft } from '../domain/profile'
import { referencedAssetIds } from '../domain/profile'
import QrCodePanel from './QrCodePanel.vue'
const emit = defineEmits<{ close: [] }>()
const router = useRouter(), store = useEditorStore(), auth = useAuthStore()
const address = ref(''), error = ref(''), progress = ref(''), busy = ref(false), loading = ref(true), success = ref(''), savedOnly = ref(false)
const home = ref<HomeResult | null>(null)
const showInShowcase = ref(true)
const showQr = ref(false), publishedSlug = ref('')
const qrTrigger = ref<HTMLButtonElement | null>(null), qrBack = ref<HTMLButtonElement | null>(null)
async function openQr() { showQr.value = true; await nextTick(); qrBack.value?.focus({ preventScroll: true }) }
async function backFromQr() { showQr.value = false; await nextTick(); qrTrigger.value?.focus({ preventScroll: true }) }
const valid = computed(() => /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(address.value))
const fullUrl = computed(() => window.location.origin + '/u/' + address.value)
function close() { if (!busy.value) emit('close') }
const open = ref(false)
useDialog(open, '.publish-dialog', close)
onMounted(async () => {
  open.value = true
  try {
    await auth.refresh()
    if (auth.user) {
      home.value = await api<HomeResult>('homepage')
      showInShowcase.value = home.value.homepage?.show_in_showcase ?? true
      address.value = cloudContext(auth.user.id)?.slug || home.value.homepage?.slug || store.draft.handle.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0,32)
    }
  } catch (e) { error.value = (e as Error).message } finally { loading.value = false }
})
function authenticate(mode: 'register' | 'login') { store.saveNow(); void router.push('/login?next=publish&mode=' + mode) }
async function submit(onlySave: boolean) {
  if (!auth.user || !valid.value || busy.value) return
  busy.value = true; error.value = ''
  store.saveNow()
  const snapshot: Draft = JSON.parse(JSON.stringify(store.draft))
  const visibility = showInShowcase.value
  try {
    // Freeze this version throughout the upload and publish sequence.
    const ids = referencedAssetIds(snapshot)
    const owned = new Set(home.value?.assets.map(item => item.id))
    const uploads = ids.filter(id => !owned.has(id))
    for (const [index, id] of uploads.entries()) {
      progress.value = `正在上传图片 ${index + 1} / ${uploads.length}…`
      const blob = await getAsset(id)
      if (!blob) throw new Error('有图片不在此浏览器或不属于当前账号，请重新选择后发布。')
      const asset = await uploadPicture(id, blob)
      owned.add(id)
      home.value?.assets.push(asset)
      store.rememberMedia({ [asset.id]: asset.secure_url })
    }
    progress.value = '正在保存云端草稿…'
    const previous = cloudContext(auth.user.id) || home.value?.homepage
    const result = await api<{ homepage: Homepage }>('homepage', { id: previous?.id, version: previous?.version, slug: address.value, draft: snapshot, showInShowcase:visibility })
    rememberHomepage(auth.user.id, result.homepage)
    if (home.value) home.value.homepage = result.homepage
    if (onlySave) { savedOnly.value = true; success.value = '云端草稿已保存'; return }
    progress.value = '正在生成你的主页链接…'
    const published = await api<{ url: string; slug: string }>('publish', { id: result.homepage.id, version: result.homepage.version })
    publishedSlug.value = published.slug
    success.value = published.url
  } catch (e) {
    error.value = (e as Error).message
    if (e instanceof CloudError && e.status === 401) auth.user = null
  } finally { busy.value = false; progress.value = '' }
}
async function copy() { try { await navigator.clipboard.writeText(success.value); progress.value = '链接已复制。' } catch { progress.value = '可以选中上方链接复制。' } }
</script>
<template>
  <Teleport to="body">
    <div class="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title" @click.self="close">
      <section class="publish-panel"><button class="modal-close" :disabled="busy" aria-label="关闭发布窗口" @click="close">×</button>
        <template v-if="success">
          <template v-if="showQr && !savedOnly">
            <h2 id="publish-title">把你的主页，带在身边。</h2><p>扫一扫，就能认识你的另一面。</p>
            <QrCodePanel :slug="publishedSlug" />
            <button ref="qrBack" class="text-link qr-back" @click="backFromQr">← 返回发布结果</button>
          </template>
          <template v-else><span class="publish-success-mark" aria-hidden="true">↗</span><h2 id="publish-title">{{ savedOnly ? '设计，已妥善保存。' : '你的世界，上线了。' }}</h2><p>{{ savedOnly ? '云端草稿可从后台继续编辑，公开主页会在点击发布后更新。' : '把这个链接分享出去，让大家认识你的另一面。' }}</p><a v-if="!savedOnly" :href="success" target="_blank" class="published-url">{{ success }}</a><div class="account-actions"><button v-if="!savedOnly" class="button button-dark" @click="copy">复制链接 ↗</button><button v-if="!savedOnly" ref="qrTrigger" class="text-link" @click="openQr">生成二维码 ↗</button><RouterLink to="/dashboard" class="text-link">管理我的主页 →</RouterLink></div></template>
        </template>
        <template v-else>
          <h2 id="publish-title">让大家，遇见你。</h2>
          <p v-if="loading">正在连接你的账号…</p>
          <template v-else-if="!auth.user"><p>你的设计已经保存在此浏览器。创建一个账号，就能发布专属链接；登录后会接着当前设计继续。</p><div class="account-actions"><button class="button button-dark" @click="authenticate('register')">注册并继续发布 ↗</button><button class="text-link" @click="authenticate('login')">已有账号，登录 →</button></div></template>
          <form v-else @submit.prevent="submit(false)"><p>以 <strong>{{ auth.user.username }}</strong> 发布。{{ home?.homepage ? '本次将更新你的主页；保存草稿不会改变已发布内容。' : '选一个好记的地址，让大家找到你。' }}</p>
            <label class="field-label">主页地址<span class="slug-field"><span>/u/</span><input v-model.trim="address" autocomplete="off" maxlength="32" required pattern="[a-z0-9][a-z0-9-]{1,30}[a-z0-9]" :disabled="busy" placeholder="your-name" /></span></label><p class="field-help">3～32 位小写字母、数字或连字符。{{ valid ? fullUrl : '' }}</p>
            <p class="publish-note">此步骤会上传所选图片并保存到云端。图片自动压缩，透明背景会保留。</p>
            <label class="showcase-switch"><span><strong>允许展示在作品广场</strong><small>展示名字与配色，让大家发现你的主页。</small></span><input v-model="showInShowcase" type="checkbox" role="switch" :disabled="busy" /></label>
            <button class="button button-dark account-submit" :disabled="busy || !valid || !!error && !home">{{ busy ? '正在处理…' : '确认发布 ↗' }}</button>
            <button type="button" class="text-link account-secondary" :disabled="busy || !valid || !home" @click="submit(true)">仅保存云端草稿</button>
          </form>
        </template>
        <p v-if="progress" role="status" aria-live="polite" class="publish-progress">{{ progress }}</p><p v-if="error" role="alert" class="account-error">{{ error }}</p>
      </section>
    </div>
  </Teleport>
</template>
