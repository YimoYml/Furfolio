<script setup lang="ts">
import { computed } from 'vue'
import type { Draft } from '../domain/profile'
import { defaultAvatarFrame } from '../domain/framing'
import FramedImage from '../renderer/FramedImage.vue'
const props = defineProps<{ draft: Draft; src: string }>()
const frame = computed({ get: () => props.draft.aboutFrame, set: value => { props.draft.aboutFrame = value } })
const zoom = computed({ get: () => Math.round(frame.value.zoom * 100), set: value => { frame.value.zoom = value / 100 } })
</script>
<template>
  <div class="avatar-image-editor">
    <p class="field-help">拖动下方头像调整裁剪，也可用方向键微调。桌面与手机使用相同的方形构图。</p>
    <div class="framing-stage-wrap"><FramedImage v-model:frame="frame" :src="src" alt="关于我的头像裁剪" editable eager class="framing-stage avatar-crop-stage" /></div>
    <label class="field-label range-label">头像缩放 <span>{{ zoom }}%</span><input v-model.number="zoom" type="range" min="100" max="300" aria-label="头像缩放" /></label>
    <button class="quiet-button" @click="frame = defaultAvatarFrame()">恢复头像默认裁剪</button>
  </div>
</template>
