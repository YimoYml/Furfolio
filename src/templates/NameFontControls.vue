<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Theme, TemplateId } from '../domain/profile'
import { chineseNameFonts, englishNameFonts, fontFamily } from '../domain/fonts'
import { loadFontStyles } from '../domain/fontLoader'

const props = defineProps<{ theme: Theme; name: string; englishName: string; templateId: TemplateId }>()
const englishFamily = computed(() => fontFamily(englishNameFonts, props.theme.nameFontEn) || (props.templateId === 'editorial' || props.theme.font === 'editorial' ? 'Georgia, serif' : 'Satoshi, sans-serif'))
const chineseFamily = computed(() => fontFamily(chineseNameFonts, props.theme.nameFontZh) || (props.templateId === 'cyber' ? 'Satoshi, "Microsoft YaHei", sans-serif' : 'KaiTi, STKaiti, "Noto Serif SC", serif'))
watch(() => [props.theme.font, props.theme.nameFontZh, props.theme.nameFontEn], () => { void loadFontStyles(props.theme).catch(() => undefined) }, { immediate: true })
</script>
<template>
  <div class="name-font-controls">
    <label class="field-label">中文名字字体<select v-model="theme.nameFontZh"><option v-for="font in chineseNameFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
    <label class="field-label">英文名字字体<select v-model="theme.nameFontEn"><option v-for="font in englishNameFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
    <div class="name-font-sample" aria-label="名字字体示例"><span :style="{ fontFamily: chineseFamily }">{{ name || '你的名字' }}</span><span :style="{ fontFamily: englishFamily }">{{ englishName || 'YOURNAME' }}</span></div>
    <p class="field-help">名字字体独立于内容字体。选“跟随模板”可以恢复原有风格。</p>
  </div>
</template>
