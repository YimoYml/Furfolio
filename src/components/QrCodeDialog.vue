<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDialog } from '../composables/useDialog'
import QrCodePanel from './QrCodePanel.vue'
defineProps<{ slug: string }>()
const emit = defineEmits<{ close: [] }>()
const open = ref(false)
const close = () => emit('close')
useDialog(open, '.qr-dialog', close)
onMounted(() => { open.value = true })
</script>
<template>
  <Teleport to="body">
    <div class="publish-dialog qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-title" @click.self="close">
      <section class="publish-panel qr-dialog-panel">
        <button class="modal-close" aria-label="关闭二维码窗口" @click="close">×</button>
        <h2 id="qr-title">把你的主页，带在身边。</h2>
        <p>扫一扫，就能认识你的另一面。</p>
        <QrCodePanel :slug="slug" />
      </section>
    </div>
  </Teleport>
</template>
