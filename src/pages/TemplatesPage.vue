<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialog } from '../composables/useDialog'
import { templates as styles } from '../templates/registry'
const active = ref<typeof styles[number] | null>(null)
useDialog(computed(() => active.value !== null), '.reference-modal', () => { active.value = null })
const referenceDevice = ref<'desktop' | 'mobile'>('desktop')
function showReference(style: typeof styles[number]) { active.value = style; referenceDevice.value = 'desktop' }
</script>
<template>
  <main class="templates-page">
    <div class="templates-intro"><p>先找到，与你合拍的那一个。</p><h1>让风格，<br />替你说第一句话。</h1><span>示例仅供风格参考，实际主页图片使用你个人上传的图片。</span><span class="template-ready-note">四种网页范本现已可体验，先选风格，再放进真实的你。</span></div>
    <div class="template-grid">
      <article v-for="style in styles" :key="style.id" class="template-card">
        <button class="template-image" @click="showReference(style)" :aria-label="'查看 ' + style.name + ' 设计参考'"><img :src="'/references/' + style.letter.toLowerCase() + '-desktop.png'" :alt="style.name + ' 设计参考图'" loading="lazy" /><span class="template-image-label">查看桌面 / 手机参考 ↗</span></button>
        <div class="template-title"><span class="template-letter" :style="{ background: style.palettes[0]!.acid }">{{ style.letter }}</span><div><p>{{ style.name }}</p><h2>{{ style.chinese }}</h2></div></div>
        <p class="template-description">{{ style.description }}</p>
        <div class="template-bottom"><RouterLink :to="'/preview?sample=1&template=' + style.id" class="text-link">预览范本 ↗</RouterLink><RouterLink :to="'/editor?template=' + style.id" class="button button-dark">使用这个风格 ↗</RouterLink></div>
      </article>
    </div>
    <div class="template-reminder"><h2>不必一次决定所有细节。</h2><p>进入编辑器后，可以更换配色、添加图片、调整栏目。<br />新主页从你的素材开始，不会自带示例角色插画。</p></div>
    <Teleport to="body">
      <div v-if="active" class="reference-modal" role="dialog" aria-modal="true" :aria-label="active.name + ' 设计参考'" @click.self="active = null" @keydown.esc="active = null">
        <div class="reference-panel"><div class="reference-toolbar"><h2>{{ active.name }}</h2><div class="segmented"><button :class="{ active: referenceDevice === 'desktop' }" @click="referenceDevice = 'desktop'">桌面</button><button :class="{ active: referenceDevice === 'mobile' }" @click="referenceDevice = 'mobile'">手机</button></div><button @click="active = null" aria-label="关闭参考图">×</button></div><div class="reference-scroll"><img :src="'/references/' + active.letter.toLowerCase() + '-' + referenceDevice + '.png'" :alt="active.name + ' ' + referenceDevice + ' 设计参考'" :class="{ portrait: referenceDevice === 'mobile' }" /></div><p>示例仅供风格参考。实际主页图片使用你个人上传的图片。<RouterLink :to="'/preview?sample=1&template=' + active.id" @click="active = null" class="text-link">打开实际网页范本 ↗</RouterLink></p></div>
      </div>
    </Teleport>
  </main>
</template>
