<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProfileRenderer from '../renderer/ProfileRenderer.vue'
import type { MotionPreset } from '../domain/profile'
import { useEditorStore } from '../stores/editor'
import { getTemplate, isTemplateId, templates } from '../templates/registry'
import type { FrameMeasure } from '../domain/framing'
const route = useRoute()
const router = useRouter()
const store = useEditorStore()
const sample = computed(() => route.query.sample === '1')
const embedded = computed(() => route.query.embedded === '1')
const sampleMotion = ref<MotionPreset>('light')
const templateId = computed(() => sample.value && isTemplateId(route.query.template) ? route.query.template : sample.value ? 'y2k' : store.draft.templateId)
const meta = computed(() => getTemplate(templateId.value))
const sampleTemplate = computed({ get: () => templateId.value, set: value => { void router.replace({ query: { ...route.query, template: value } }) } })
watchEffect(() => { document.title = sample.value ? meta.value.letter + ' · ' + meta.value.shortName + ' 示例主页' : '你的主页预览 · Furfolio' })
function editStep(step: number) {
  if (embedded.value) window.parent.postMessage({ type: 'fursona-step', step }, window.location.origin)
  else void router.push('/editor?step=' + step + '&template=' + templateId.value)
}
function frameMeasure(value: FrameMeasure) {
  if (embedded.value) window.parent.postMessage({ type: 'furfolio-frame', ...value, templateId: store.draft.templateId, mode: store.draft.heroMode }, window.location.origin)
}
</script>
<template>
  <header v-if="!embedded" class="preview-bar">
    <RouterLink to="/" class="preview-back">← 主页制作所</RouterLink>
    <div class="preview-bar-middle"><select v-if="sample" v-model="sampleTemplate" aria-label="示例风格"><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.letter }} · {{ template.shortName }}</option></select><span v-else>你的主页预览</span><select v-if="sample" v-model="sampleMotion" aria-label="示例动效"><option value="off">静态</option><option value="light">轻盈动效</option><option value="immersive">沉浸动效</option></select></div>
    <RouterLink :to="sample ? '/editor?template=' + templateId : '/editor'" class="button button-dark">{{ sample ? '制作我的主页' : '继续编辑' }} ↗</RouterLink>
  </header>
  <div v-if="sample && !embedded" class="sample-notice">角色插画仅为演示素材，创建主页时使用你自己的图片。</div>
  <ProfileRenderer :sample="sample" :template="templateId" :motion="sample ? sampleMotion : undefined" @edit-hero="editStep(1)" @edit-contact="editStep(5)" @frame-measure="frameMeasure" />
</template>
