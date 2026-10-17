<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { api } from '../cloud/api'
import { loadTurnstile, type TurnstileApi } from '../cloud/turnstile'

const visible = ref(false), waiting = ref(false), message = ref('')
const container = ref<HTMLElement>()
let turnstile: TurnstileApi | undefined, widget: string | undefined
let generation = 0
let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | undefined
function remove() {
  if (widget !== undefined) { turnstile?.remove(widget); widget = undefined }
}
function cancel() {
  generation++
  const previous = pending; pending = undefined
  waiting.value = false; visible.value = false
  remove()
  previous?.reject(new Error('验证已取消。你的设计仍然保留，可以稍后继续。'))
}
function fail(id: number, error: Error) {
  if (id !== generation || !pending) return
  const previous = pending; pending = undefined
  waiting.value = false; message.value = '验证未完成，重新提交即可再试。'
  remove(); previous.reject(error)
}
async function start(id: number) {
  const config = await api<{ siteKey: string }>('auth/registration-config')
  if (id !== generation) return
  turnstile = await loadTurnstile()
  if (id !== generation) return
  await nextTick()
  if (id !== generation || !container.value) return
  const failed = () => fail(id, new Error('验证未完成，请重新提交。你的设计会保留。'))
  widget = turnstile.render(container.value, {
    sitekey: config.siteKey, action: 'register', execution: 'execute', appearance: 'execute',
    theme: 'light', size: container.value.getBoundingClientRect().width < 300 ? 'compact' : 'flexible', language: 'zh-CN', retry: 'never',
    'refresh-expired': 'manual', 'refresh-timeout': 'manual', 'response-field': false,
    callback: token => {
      if (id !== generation || !pending) return
      const previous = pending; pending = undefined
      waiting.value = false; message.value = '验证已完成，正在创建账号…'
      previous.resolve(token)
    },
    'error-callback': failed, 'expired-callback': failed,
    'timeout-callback': failed, 'unsupported-callback': failed,
  })
  if (id === generation && pending) turnstile.execute(widget)
}
function verify(): Promise<string> {
  cancel()
  const id = ++generation
  visible.value = true; waiting.value = true; message.value = '正在进行安全验证，请按提示完成。'
  return new Promise((resolve, reject) => {
    pending = { resolve, reject }
    void start(id).catch(error => fail(id, error instanceof Error ? error : new Error('验证暂不可用，请稍后重试。')))
  })
}
onBeforeUnmount(cancel)
defineExpose({ verify, clear: cancel })
</script>
<template>
  <section v-show="visible" class="registration-verification" aria-label="注册安全验证">
    <p role="status" aria-live="polite">{{ message }}</p>
    <div ref="container" class="registration-widget"></div>
    <button v-if="waiting" type="button" class="text-link verification-cancel" @click="cancel">取消验证，稍后继续</button>
  </section>
</template>
