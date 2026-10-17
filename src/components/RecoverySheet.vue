<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ code: string }>()
const emit = defineEmits<{ done: [] }>()
const saved = ref(false), message = ref('')
async function copy() {
  try { await navigator.clipboard.writeText(props.code); message.value = '已复制，请保存在安全的地方。' }
  catch { message.value = '可以长按或选中上方恢复码复制。' }
}
function download() {
  const url = URL.createObjectURL(new Blob(['Furfolio 账号恢复码\n\n' + props.code + '\n\n请保存在安全的地方。不要分享给其他人；使用后会生成新的恢复码。'], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'furfolio-recovery-code.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>
<template>
  <section class="recovery-sheet">
    <h2>给账号，留一把钥匙。</h2><p>无需绑定邮箱。忘记密码时，可以用这份一次性恢复码找回账号。请现在保存，关闭后无法再次查看。</p>
    <code class="recovery-code">{{ code }}</code>
    <div class="account-actions"><button class="text-link" @click="copy">复制恢复码 ↗</button><button class="text-link" @click="download">下载保存 ↓</button></div>
    <p v-if="message" role="status" class="field-help">{{ message }}</p>
    <label class="account-check"><input v-model="saved" type="checkbox" />我已妥善保存恢复码</label>
    <button class="button button-dark account-submit" :disabled="!saved" @click="emit('done')">继续 ↗</button>
  </section>
</template>
