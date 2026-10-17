<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { defaultFrame, imageGeometry, panFrame } from '../domain/framing'
import type { FrameDevice, ImageFrame, FrameMeasure } from '../domain/framing'
const props = defineProps<{ src: string; alt: string; frame?: ImageFrame; frames?: Record<FrameDevice, ImageFrame>; editable?: boolean; eager?: boolean }>()
const emit = defineEmits<{ 'update:frame': [frame: ImageFrame]; measure: [value: FrameMeasure] }>()
const element = ref<HTMLElement>(), image = ref<HTMLImageElement>()
const width = ref(0), height = ref(0), naturalWidth = ref(0), naturalHeight = ref(0), dragging = ref(false)
const mobileQuery = window.matchMedia('(max-width:700px)'), mobile = ref(mobileQuery.matches)
const device = computed<FrameDevice>(() => mobile.value ? 'mobile' : 'desktop')
const current = computed(() => props.frame || props.frames?.[device.value] || defaultFrame())
const geometry = computed(() => imageGeometry(width.value, height.value, naturalWidth.value, naturalHeight.value, current.value))
const imageStyle = computed(() => geometry.value ? { width: geometry.value.width + 'px', height: geometry.value.height + 'px', left: geometry.value.left + 'px', top: geometry.value.top + 'px' } : { width: '100%', height: '100%', objectFit: current.value.fit, objectPosition: `${current.value.x}% ${current.value.y}%` })
function measure() {
  width.value = element.value?.clientWidth || 0; height.value = element.value?.clientHeight || 0
  emit('measure', { width: width.value, height: height.value, device: device.value, imageRatio: naturalHeight.value ? naturalWidth.value / naturalHeight.value : 1 })
}
function loaded() { naturalWidth.value = image.value?.naturalWidth || 0; naturalHeight.value = image.value?.naturalHeight || 0; measure() }
let drag: { pointer: number; x: number; y: number; frame: ImageFrame; geometry: NonNullable<typeof geometry.value> } | undefined
function down(event: PointerEvent) {
  if (!props.editable || !geometry.value || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault(); element.value?.focus({ preventScroll: true }); element.value?.setPointerCapture(event.pointerId)
  drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, frame: { ...current.value }, geometry: geometry.value }; dragging.value = true
}
function move(event: PointerEvent) {
  if (!drag || drag.pointer !== event.pointerId) return
  emit('update:frame', panFrame(drag.frame, drag.geometry, event.clientX - drag.x, event.clientY - drag.y))
}
function stop(event?: PointerEvent) {
  if (event && drag && drag.pointer !== event.pointerId) return
  if (drag && element.value?.hasPointerCapture(drag.pointer)) element.value.releasePointerCapture(drag.pointer)
  drag = undefined; dragging.value = false
}
function key(event: KeyboardEvent) {
  if (!props.editable || !geometry.value || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const distance = event.shiftKey ? 24 : 8
  emit('update:frame', panFrame(current.value, geometry.value, event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0, event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0))
}
let observer: ResizeObserver | undefined
let measureFrame = 0
function scheduleMeasure() {
  cancelAnimationFrame(measureFrame)
  measureFrame = requestAnimationFrame(measure)
}
function changeDevice() { mobile.value = mobileQuery.matches; measure() }
watch(() => props.src, () => { stop(); naturalWidth.value = 0; naturalHeight.value = 0 })
watch([() => current.value.zoom, () => current.value.fit, () => current.value.aspect], () => stop())
onMounted(() => { observer = new ResizeObserver(scheduleMeasure); if (element.value) observer.observe(element.value); mobileQuery.addEventListener('change', changeDevice); if (image.value?.complete) loaded(); measure() })
onBeforeUnmount(() => { stop(); observer?.disconnect(); cancelAnimationFrame(measureFrame); mobileQuery.removeEventListener('change', changeDevice) })
</script>
<template>
  <div ref="element" class="framed-image" :class="{ 'is-editable': editable, 'is-dragging': dragging }" :tabindex="editable ? 0 : undefined" :role="editable ? 'group' : undefined" :aria-label="editable ? '图片构图：拖动或使用方向键调整位置' : undefined" @pointerdown="down" @pointermove="move" @pointerup="stop" @pointercancel="stop" @lostpointercapture="stop" @keydown="key">
    <img ref="image" :src="src" :alt="alt" :style="imageStyle" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'high' : undefined" decoding="async" draggable="false" @load="loaded" />
    <span v-if="editable" class="framing-grid" aria-hidden="true"></span>
  </div>
</template>
