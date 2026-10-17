<script setup lang="ts">
import { computed } from 'vue'
import type { Draft } from '../domain/profile'
import { defaultFrame } from '../domain/framing'
import type { FrameDevice } from '../domain/framing'
import FramedImage from '../renderer/FramedImage.vue'
const props = defineProps<{ draft: Draft; src: string; device: FrameDevice; ratios: Record<FrameDevice, number> }>()
const emit = defineEmits<{ 'update:device': [device: FrameDevice] }>()
const frame = computed({ get: () => props.draft.heroFrames[props.device], set: value => { props.draft.heroFrames[props.device] = value } })
const zoom = computed({ get: () => Math.round(frame.value.zoom * 100), set: value => { frame.value.zoom = value / 100 } })
const offset = computed({ get: () => props.device === 'mobile' ? props.draft.layout.heroMobileOffset : props.draft.layout.heroOffset, set: value => { if (props.device === 'mobile') props.draft.layout.heroMobileOffset = value; else props.draft.layout.heroOffset = value } })
const scale = computed({ get: () => props.device === 'mobile' ? props.draft.layout.heroMobileScale : props.draft.layout.heroScale, set: value => { if (props.device === 'mobile') props.draft.layout.heroMobileScale = value; else props.draft.layout.heroScale = value } })
const stageStyle = computed(() => ({ aspectRatio: props.ratios[props.device], width: `min(100%, ${340 * props.ratios[props.device]}px)` }))
function reset() { frame.value = { ...defaultFrame(), y: props.draft.heroMode === 'photo' ? 50 : 100 }; offset.value = 0; scale.value = 100 }
</script>
<template>
  <div class="hero-image-editor">
    <div class="framing-toolbar"><span>主图构图</span><div class="segmented"><button :class="{ active: device === 'desktop' }" @click="emit('update:device', 'desktop')">桌面</button><button :class="{ active: device === 'mobile' }" @click="emit('update:device', 'mobile')">手机</button></div></div>
    <p class="field-help">在下方图片框中拖动，或选中后用方向键微调。两种设备分别保存。</p>
    <label v-if="draft.heroMode === 'photo'" class="field-label">照片框比例<select v-model="frame.aspect"><option value="original">随照片比例</option><option value="template">模板默认</option><option value="portrait">竖幅 · 3:4</option><option value="square">方形 · 1:1</option><option value="landscape">横幅 · 4:3</option></select></label>
    <div v-if="draft.heroMode === 'photo'" class="segmented framing-fit"><button :class="{ active: frame.fit === 'contain' }" @click="frame.fit = 'contain'">完整显示</button><button :class="{ active: frame.fit === 'cover' }" @click="frame.fit = 'cover'">填满裁切</button></div>
    <div class="framing-stage-wrap"><FramedImage v-model:frame="frame" :src="src" :alt="device === 'mobile' ? '手机主图构图' : '桌面主图构图'" editable eager class="framing-stage" :style="stageStyle" /></div>
    <label class="field-label range-label">框内缩放 <span>{{ zoom }}%</span><input v-model.number="zoom" type="range" min="100" max="300" aria-label="主图框内缩放" /></label>
    <label class="field-label range-label">{{ device === 'mobile' ? '手机' : '桌面' }}主图左右偏移 <span>{{ offset }}%</span><input v-model.number="offset" type="range" :min="device === 'mobile' ? -20 : -8" :max="device === 'mobile' ? 20 : 8" :aria-label="device === 'mobile' ? '手机主图左右偏移' : '桌面主图左右偏移'" /></label>
    <label class="field-label range-label">{{ device === 'mobile' ? '手机' : '桌面' }}主图大小 <span>{{ scale }}%</span><input v-model.number="scale" type="range" min="80" max="115" /></label>
    <p class="field-help">完整显示有留白时，可沿留白方向移动；放大后可调整裁切。裁切只改变展示，原图保留。</p>
    <button class="quiet-button" @click="reset">恢复{{ device === 'mobile' ? '手机' : '桌面' }}默认构图</button>
  </div>
</template>
