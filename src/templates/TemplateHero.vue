<script setup lang="ts">
import type { Draft, SectionId } from '../domain/profile'
import FramedImage from '../renderer/FramedImage.vue'
import type { FrameMeasure } from '../domain/framing'
import { copyBlock } from '../domain/copy'
import type { CopyKey } from '../domain/copy'
import { fontFamily, textFonts } from '../domain/fonts'
const props = defineProps<{ profile: Draft; hero: string; firstSection?: SectionId; readonly?: boolean }>()
defineEmits<{ editHero: []; frameMeasure: [value: FrameMeasure] }>()
const text = (key: CopyKey) => copyBlock(props.profile, key).text
const style = (key: CopyKey) => ({ fontFamily: fontFamily(textFonts, copyBlock(props.profile, key).font) })
</script>
<template>
  <section id="hero" class="profile-hero variant-hero" :class="[profile.templateId + '-hero', { 'has-photo': profile.heroMode === 'photo' && hero }]">
    <div v-if="profile.layout.decoration" class="variant-ambient" :data-ambient="profile.templateId === 'cyber' ? '' : undefined" aria-hidden="true"><i></i><i></i><i></i></div>
    <h1 v-if="profile.templateId === 'editorial'" class="hero-lettering" :aria-label="profile.englishName"><span v-for="(letter, index) in (profile.englishName || 'YOURNAME')" :key="index" class="hero-letter" aria-hidden="true">{{ letter }}</span></h1>
    <div class="hero-copy">
      <p v-if="profile.templateId === 'minimal'" class="hero-native-name">{{ profile.name }}<span class="minimal-slash" aria-hidden="true"> /</span></p>
      <h1 v-if="profile.templateId !== 'editorial'" class="hero-lettering" :aria-label="profile.englishName"><span v-for="(letter, index) in (profile.englishName || 'YOURNAME')" :key="index" class="hero-letter" aria-hidden="true">{{ letter }}</span></h1>
      <p v-if="profile.templateId !== 'minimal'" class="hero-native-name">{{ profile.name }}</p>
      <p v-if="profile.templateId !== 'editorial'" class="hero-id">@{{ profile.handle }}</p>
      <p class="hero-tagline" :style="{ fontFamily: fontFamily(textFonts, profile.typography.tagline || 'template') }">{{ profile.tagline }}</p>
      <p v-if="profile.templateId === 'editorial'" class="hero-id">@{{ profile.handle }}</p>
      <a v-if="firstSection && text('scrollCue')" :href="'#' + firstSection" class="scroll-cue" :style="style('scrollCue')">{{ text('scrollCue') }} <span aria-hidden="true">↓</span></a>
    </div>
    <div v-if="hero" class="hero-visual" :class="'hero-' + profile.heroMode"><FramedImage :src="hero" :frames="profile.heroFrames" :alt="profile.name + '的角色主视觉'" eager @measure="$emit('frameMeasure', $event)" /></div>
    <div v-else-if="readonly" class="hero-placeholder public-placeholder" aria-hidden="true"><span class="placeholder-title">IN MY<br />COLORS.</span></div>
    <button v-else class="hero-placeholder" @click="$emit('editHero')"><span class="placeholder-title">YOUR<br />CHARACTER</span><span class="placeholder-upload">上传你的角色主图 ↗</span><span class="placeholder-note">透明立绘 / 兽装照片</span></button>
    <p v-if="text('heroNote') && profile.layout.decoration" :class="profile.templateId === 'editorial' ? 'editorial-handnote' : 'variant-handnote'" :style="style('heroNote')">{{ text('heroNote') }}</p>
  </section>
</template>
