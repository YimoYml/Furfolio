<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, type HomeResult, type Homepage } from '../cloud/api'
import { rememberHomepage } from '../cloud/context'
import { useAuthStore } from '../stores/auth'
import { useEditorStore } from '../stores/editor'
import { getTemplate } from '../templates/registry'
import RecoverySheet from '../components/RecoverySheet.vue'
import QrCodeDialog from '../components/QrCodeDialog.vue'
const router = useRouter(), auth = useAuthStore()
const result = ref<HomeResult | null>(null), loading = ref(true), busy = ref(false), error = ref(''), confirmWithdraw = ref(false)
const password = ref(''), code = ref(''), recoveryOpen = ref(false)
const qrOpen = ref(false)
const visibilityBusy = ref(false), visibilityStatus = ref('')
async function setVisibility(event: Event) {
  const input = event.target as HTMLInputElement
  const page = result.value?.homepage, published = result.value?.published
  if (!page || !published || !auth.user || visibilityBusy.value) return
  const previous = published.show_in_showcase ?? true, visible = input.checked
  visibilityBusy.value = true; error.value = ''; visibilityStatus.value = ''
  try {
    const changed = await api<{homepage: Pick<Homepage, 'id'|'slug'|'version'|'updated_at'|'show_in_showcase'>}>('showcase/visibility', {id:page.id,visible})
    Object.assign(page,changed.homepage)
    published.show_in_showcase = visible
    rememberHomepage(auth.user.id,page)
    visibilityStatus.value = visible ? '已加入作品广场。' : '已退出作品广场，专属链接仍可正常访问。'
  } catch(e) { input.checked = previous; error.value = (e as Error).message }
  finally { visibilityBusy.value = false }
}
async function load() {
  loading.value = true; error.value = ''
  try { await auth.refresh(); if (!auth.user) { await router.replace('/login'); return }; result.value = await api<HomeResult>('homepage') }
  catch (e) { error.value = (e as Error).message } finally { loading.value = false }
}
async function edit() {
  if (!result.value?.homepage || !auth.user || visibilityBusy.value) return
  const store = useEditorStore()
  store.loadCloud(result.value.homepage.draft, Object.fromEntries(result.value.assets.map(asset => [asset.id, asset.secure_url])))
  rememberHomepage(auth.user.id, result.value.homepage)
  await router.push('/editor')
}
async function withdraw() {
  if (visibilityBusy.value) return
  busy.value = true; error.value = ''
  try { await api('unpublish', { id: result.value?.homepage?.id }); confirmWithdraw.value = false; await load() }
  catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}
async function logout() { try { await auth.logout(); await router.push('/') } catch (e) { error.value = (e as Error).message } }
async function newCode() {
  busy.value = true; error.value = ''
  try { code.value = (await api<{ recoveryCode: string }>('auth/recovery-code', { password: password.value })).recoveryCode }
  catch (e) { error.value = (e as Error).message } finally { busy.value = false; password.value = '' }
}
onMounted(load)
</script>
<template>
  <main class="dashboard-page"><div class="dashboard-heading"><div><p class="account-eyebrow">IN YOUR OWN COLORS</p><h1>你好，{{ auth.user?.username || '朋友' }}。</h1><p>你的主页，你来续写。</p></div><button class="text-link" @click="logout">退出登录 ↗</button></div>
    <p v-if="loading" role="status" class="dashboard-loading">正在载入你的主页…</p><div v-if="error" class="account-error" role="alert">{{ error }} <button class="text-link" @click="load">重新载入</button></div>
    <section v-if="!loading && result?.homepage" class="dashboard-home">
      <div class="dashboard-cover" :style="{ background: result.homepage.draft.theme.acid, color: result.homepage.draft.theme.blue }"><small>{{ getTemplate(result.homepage.draft.templateId).chinese }}</small><strong>{{ result.homepage.draft.englishName }}</strong><span>{{ result.homepage.draft.name }}</span></div>
      <div class="dashboard-details"><span class="homepage-state">{{ result.published ? '已发布' : '云端草稿' }}</span><h2>{{ result.homepage.draft.name }}的主页</h2><p class="dashboard-path">/u/{{ result.homepage.slug }}</p><p class="account-description">最近保存于 {{ new Date(result.homepage.updated_at).toLocaleString('zh-CN') }}。<br />编辑并保存草稿后，点击发布才会更新公开主页。</p><div class="account-actions"><button class="button button-dark" @click="edit">载入云端草稿，编辑 ↗</button><RouterLink v-if="result.published" :to="'/u/' + result.published.slug" target="_blank" class="text-link">查看公开主页 ↗</RouterLink><button v-if="result.published" class="text-link" @click="qrOpen = true">生成二维码 ↗</button></div><p class="field-help">载入会替换当前编辑内容，并在浏览器保留一份上一版文字配置。</p>
        <div v-if="result.published" class="withdraw-area"><template v-if="confirmWithdraw"><p>撤下后，分享链接将暂时无法查看。云端草稿仍可继续编辑。</p><button class="text-link" :disabled="busy" @click="withdraw">确认撤下</button><button class="text-link" @click="confirmWithdraw = false">取消</button></template><button v-else class="text-link" @click="confirmWithdraw = true">暂时撤下公开主页</button></div>
        <template v-if="result.published"><label class="showcase-switch"><span><strong>允许展示在作品广场</strong><small>让更多人通过名字与配色，发现你的主页。</small></span><input type="checkbox" role="switch" :checked="result.published.show_in_showcase ?? true" :disabled="visibilityBusy || busy" @change="setVisibility" /></label><p v-if="visibilityStatus" class="showcase-visibility-status" role="status">{{ visibilityStatus }}</p></template>
      </div>
    </section>
    <section v-else-if="!loading && result" class="dashboard-empty"><h2>你的第一张名片，<br />从这里开始。</h2><p>选一种风格，放上喜欢的自己。</p><RouterLink to="/editor" class="button button-dark">继续本地设计 ↗</RouterLink><RouterLink to="/templates" class="text-link">看看所有风格 →</RouterLink></section>
    <section v-if="!loading && result" class="dashboard-account"><div><h2>账号恢复</h2><p>恢复码丢失时，可以用当前密码生成一份新的。旧恢复码会立即失效。</p></div><div><RecoverySheet v-if="code" :code="code" @done="code = ''; recoveryOpen = false" /><form v-else-if="recoveryOpen" @submit.prevent="newCode"><label class="field-label">当前密码<input v-model="password" type="password" autocomplete="current-password" required minlength="8" /></label><button class="button button-dark" :disabled="busy">生成并保存新恢复码</button><button type="button" class="text-link" @click="recoveryOpen = false; password = ''">取消</button></form><button v-else class="text-link" @click="recoveryOpen = true">重新生成恢复码 ↗</button></div></section>
    <QrCodeDialog v-if="qrOpen && result?.published" :slug="result.published.slug" @close="qrOpen = false" />
  </main>
</template>
