<script setup lang="ts">
import { watchEffect } from 'vue'
import type { Draft } from '../domain/profile'
import { copyBlock, copyLabels } from '../domain/copy'
import type { CopyKey } from '../domain/copy'
import { textFonts } from '../domain/fonts'
import type { TextFont } from '../domain/fonts'
import { loadTextFontStyles } from '../domain/fontLoader'
const props = defineProps<{ draft: Draft; fields: CopyKey[] }>()
function text(key: CopyKey, event: Event) { props.draft.copy[key] = { ...copyBlock(props.draft, key), text: (event.target as HTMLTextAreaElement).value } }
function font(key: CopyKey, event: Event) { props.draft.copy[key] = { ...copyBlock(props.draft, key), font: (event.target as HTMLSelectElement).value as TextFont } }
watchEffect(() => { void loadTextFontStyles(props.fields.map(key => copyBlock(props.draft, key).font)).catch(() => undefined) })
</script>
<template>
  <details class="copy-controls"><summary>栏目文案与字体 <span>＋</span></summary><p class="field-help">这些文字也属于你。可换行、单独选字体，也能恢复模板文案。短句留空可隐藏；栏目标题留空时采用默认标题。</p>
    <div v-for="key in fields" :key="key" class="copy-control">
      <label class="field-label">{{ copyLabels[key] }}<textarea :value="copyBlock(draft, key).text" maxlength="180" rows="2" @input="text(key, $event)"></textarea></label>
      <label class="field-label">{{ copyLabels[key] }}字体<select :value="copyBlock(draft, key).font" @change="font(key, $event)"><option v-for="option in textFonts" :key="option.id" :value="option.id">{{ option.label }}</option></select></label>
      <button class="quiet-button" :disabled="!draft.copy[key]" @click="delete draft.copy[key]">恢复模板文案与字体</button>
    </div>
  </details>
</template>
