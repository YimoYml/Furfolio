<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
const props = defineProps<{ src: string; alt: string; atlasIndex?: number; eager?: boolean; preserveRatio?: boolean; contain?: boolean }>()
const element = ref<HTMLElement>()
const width = ref(0), height = ref(0), imageWidth = ref(0), imageHeight = ref(0)
const tileStyle = computed(() => {
  if (!props.contain || !imageWidth.value || !imageHeight.value) return undefined
  const ratio = imageWidth.value / 3 / imageHeight.value
  const drawnWidth = Math.min(width.value, height.value * ratio)
  return { width: drawnWidth + 'px', height: drawnWidth / ratio + 'px' }
})
function loaded(event: Event) {
  const image = event.target as HTMLImageElement
  imageWidth.value = image.naturalWidth; imageHeight.value = image.naturalHeight
}
let observer: ResizeObserver | undefined
let measureFrame = 0
onMounted(() => {
  if (!props.contain || props.atlasIndex === undefined) return
  const measure = () => { width.value = element.value?.clientWidth || 0; height.value = element.value?.clientHeight || 0 }
  measure()
  observer = new ResizeObserver(() => { cancelAnimationFrame(measureFrame); measureFrame = requestAnimationFrame(measure) })
  if (element.value) observer.observe(element.value)
})
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(measureFrame) })
</script>
<template>
  <div ref="element" class="media-art" :class="{ 'atlas-art': atlasIndex !== undefined, 'natural-art': preserveRatio, 'contain-art': contain }">
    <div v-if="atlasIndex !== undefined" class="atlas-tile" :style="tileStyle">
      <img :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'" decoding="async" @load="loaded" :style="{ left: -(atlasIndex * 100) + '%' }" />
    </div>
    <img v-else :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'" decoding="async" />
  </div>
</template>
