<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import { useAuthStore } from '../stores/auth'
import { api } from '../cloud/api'
import RecoverySheet from '../components/RecoverySheet.vue'
import RegistrationVerification from '../components/RegistrationVerification.vue'
const route = useRoute(), router = useRouter(), auth = useAuthStore()
const mode = ref<'login' | 'register' | 'recover'>(route.query.mode === 'register' ? 'register' : 'login')
const username = ref(''), password = ref(''), recovery = ref(''), code = ref(''), error = ref(''), busy = ref(false), showPassword = ref(false)
const root = ref<HTMLElement>()
const verification = ref<InstanceType<typeof RegistrationVerification>>()
const verifying = ref(false)
let disposed = false
const target = computed(() => route.query.next === 'publish' ? '/editor?publish=1' : '/dashboard')
const heading = computed(() => mode.value === 'register' ? '留下你的名字。' : mode.value === 'recover' ? '找回你的账号。' : '欢迎，再次回来。')
function change(value: typeof mode.value) { mode.value = value; error.value = ''; password.value = ''; showPassword.value = false }
async function submit() {
  if (busy.value) return
  busy.value = true; error.value = ''
  let sent = false
  try {
    if (mode.value === 'recover') {
      sent = true
      const result = await api<{ recoveryCode: string }>('auth/recover', { username: username.value, recoveryCode: recovery.value, newPassword: password.value })
      auth.user = null; code.value = result.recoveryCode
    } else {
      let turnstileToken: string | undefined
      if (mode.value === 'register') {
        verifying.value = true
        if (!verification.value) throw new Error('验证暂不可用，请稍后重试。')
        turnstileToken = await verification.value.verify()
        if (disposed) return
        verifying.value = false
      }
      sent = true
      const result = await auth.authenticate(mode.value, username.value, password.value, turnstileToken)
      if (result.recoveryCode) code.value = result.recoveryCode
      else await router.replace(target.value)
    }
  } catch (e) { verification.value?.clear(); error.value = (e as Error).message } finally { busy.value = false; verifying.value = false; if (sent) password.value = '' }
}
async function finish() {
  code.value = ''
  if (mode.value === 'recover') { change('login'); error.value = '密码已修改，请使用新密码登录。' }
  else await router.replace(target.value)
}
let animation: gsap.Context | undefined
onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animation = gsap.context(() => { gsap.from('.account-intro > *, .account-form-wrap', { y: 14, opacity: 0, duration: .55, stagger: .06, ease: 'power2.out' }) }, root.value)
})
onBeforeUnmount(() => { disposed = true; animation?.revert() })
</script>
<template>
  <main ref="root" class="account-page">
    <div class="account-intro"><p class="account-eyebrow">IN YOUR OWN COLORS</p><h1>你的世界，<br />值得被看见。</h1><p>名字、喜欢的事、每一个闪光的片段。<br />把它们放在一个属于你的地方。</p><div class="account-art" aria-hidden="true"><span>YOU<span>.</span></span><i></i></div><RouterLink to="/editor" class="text-link">回到我的设计 ←</RouterLink></div>
    <div class="account-form-wrap">
      <RecoverySheet v-if="code" :code="code" @done="finish" />
      <template v-else>
        <div v-if="mode !== 'recover'" class="account-tabs" aria-label="账号操作"><button :class="{ active: mode === 'login' }" :disabled="busy" @click="change('login')">登录</button><button :class="{ active: mode === 'register' }" :disabled="busy" @click="change('register')">注册</button></div>
        <h2>{{ heading }}</h2><p class="account-description">{{ mode === 'register' ? '只需用户名和密码。你的设计已经留在这里，注册后可以接着发布。' : mode === 'recover' ? '输入用户名与已保存的恢复码，设置一个新密码。' : '登录后，继续编辑和管理你的主页。' }}</p>
        <form :aria-busy="busy" @submit.prevent="submit">
          <label class="field-label">用户名<input v-model="username" name="username" autocomplete="username" minlength="3" maxlength="24" required placeholder="中文、字母、数字或下划线" :disabled="busy" /></label>
          <p v-if="mode === 'register'" class="field-help">3～24 位；这是登录名，角色名称可在主页中单独修改。</p>
          <label v-if="mode === 'recover'" class="field-label">恢复码<input v-model="recovery" name="recovery" autocomplete="off" required placeholder="FUR-…" :disabled="busy" /></label>
          <label class="field-label">{{ mode === 'recover' ? '新密码' : '密码' }}<span class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" name="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="8" required placeholder="至少 8 位" :disabled="busy" /><button type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button></span></label>
          <p v-if="error" role="alert" class="account-error">{{ error }}</p>
          <RegistrationVerification v-if="mode === 'register'" ref="verification" />
          <button class="button button-dark account-submit" :disabled="busy">{{ verifying ? '等待验证…' : busy ? '请稍候…' : mode === 'register' ? (route.query.next === 'publish' ? '注册并部署 ↗' : '创建账号，继续设计 ↗') : mode === 'recover' ? '设置新密码 ↗' : '登录，继续 ↗' }}</button>
        </form>
        <button class="text-link account-secondary" :disabled="busy" @click="change(mode === 'recover' ? 'login' : 'recover')">{{ mode === 'recover' ? '返回登录 ←' : '忘记密码？使用恢复码' }}</button>
        <p class="account-footnote">你的文字和图片会保留。发布前，随时可以返回编辑。<template v-if="mode === 'register'"><br />仅提交注册时进行安全验证，设计过程无需验证。</template></p>
      </template>
    </div>
  </main>
</template>
