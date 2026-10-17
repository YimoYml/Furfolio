<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { sampleDraft, contrastText, safeLink } from '../domain/profile'
import { useEditorStore } from '../stores/editor'
import MediaArt from './MediaArt.vue'
import { useDialog } from '../composables/useDialog'
import TemplateHero from '../templates/TemplateHero.vue'
import type { Draft, GalleryItem, MotionPreset, SocialLink, TemplateId } from '../domain/profile'
import { chineseNameFonts, contentFonts, englishNameFonts, fontFamily } from '../domain/fonts'
import { loadFontStyles } from '../domain/fontLoader'
import { loadTextFontStyles } from '../domain/fontLoader'
import { textFonts } from '../domain/fonts'
import { copyBlock, sectionTitle } from '../domain/copy'
import type { CopyKey, TypographyKey } from '../domain/copy'
import FramedImage from './FramedImage.vue'
import { photoRatio } from '../domain/framing'
import type { FrameMeasure } from '../domain/framing'
import { displayImageSource } from '../domain/media'
import { copyText } from '../composables/copyText'

gsap.registerPlugin(ScrollTrigger, CustomEase)
const settleEase = CustomEase.create('furfolio-settle', '0.22, 1, 0.36, 1')
const props = defineProps<{ sample?: boolean; motion?: MotionPreset; template?: TemplateId; profile?: Draft; media?: Record<string,string>; readonly?: boolean }>()
const emit = defineEmits<{ editHero: []; editContact: []; frameMeasure: [value: FrameMeasure] }>()
const store = props.profile ? null : useEditorStore()
const profile = computed(() => props.profile || (props.sample ? sampleDraft(props.template || 'y2k') : store!.draft))
const motion = computed(() => props.motion || profile.value.motion)
const media = computed(() => props.media || store?.assetUrls || {})
const imageSource = (id?: string | null) => displayImageSource(media.value[id || ''])
const hero = computed(() => props.sample ? '/demo/che-cutout.png' : imageSource(profile.value.heroAssetId))
const text = (key: CopyKey) => copyBlock(profile.value, key).text
const copyStyle = (key: CopyKey) => ({ fontFamily: fontFamily(textFonts, copyBlock(profile.value, key).font) })
const typeStyle = (key: TypographyKey) => ({ fontFamily: fontFamily(textFonts, profile.value.typography[key] || 'template') })
const heroRatio = ref(1)
function measured(value: FrameMeasure) { heroRatio.value = value.imageRatio; emit('frameMeasure', value) }
const root = ref<HTMLElement>()
const menuOpen = ref(false)
const selectedImage = ref<number | null>(null)
const selectedInterest = ref<string | null>(null)
const pageVisible = ref(!document.hidden)
const marqueeDuration = ref('60s')
const copiedContact = ref('')
const contactMessage = ref('')
const manualContact = ref('')
let copyVersion = 0
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyContact(contact: SocialLink) {
  const value = contact.url.trim()
  if (!value) return
  const version = ++copyVersion
  clearTimeout(copyTimer)
  copiedContact.value = ''; contactMessage.value = ''; manualContact.value = ''
  try {
    await copyText(value)
    if (version !== copyVersion) return
    copiedContact.value = contact.id
    contactMessage.value = (contact.name || '联系方式') + '已复制。'
    copyTimer = setTimeout(() => { copiedContact.value = ''; contactMessage.value = '' }, 4000)
  } catch {
    if (version !== copyVersion) return
    contactMessage.value = '自动复制未完成，请选中下方内容复制。'
    manualContact.value = value
  }
}
const navSections = computed(() => profile.value.sectionOrder.filter(section => profile.value.visible[section]))
const styles = computed(() => ({
  '--acid': profile.value.theme.acid, '--blue': profile.value.theme.blue,
  '--on-acid': contrastText(profile.value.theme.acid), '--on-blue': contrastText(profile.value.theme.blue),
  '--hero-scale': profile.value.layout.heroScale / 100,
  '--hero-offset': profile.value.layout.heroOffset + '%',
  '--hero-mobile-scale': profile.value.layout.heroMobileScale / 100,
  '--hero-mobile-offset': profile.value.layout.heroMobileOffset + '%',
  '--photo-ratio-desktop': photoRatio(profile.value.heroFrames.desktop.aspect, heroRatio.value),
  '--photo-ratio-mobile': photoRatio(profile.value.heroFrames.mobile.aspect, heroRatio.value),
  '--section-space': profile.value.layout.spacing / 100,
  '--name-scale': Math.min(1, 4 / Math.max(4, profile.value.englishName.length)),
  '--native-scale': Math.min(1, 3 / Math.max(3, profile.value.name.length)),
  '--font-content': fontFamily(contentFonts, profile.value.theme.font),
  '--font-name-en': fontFamily(englishNameFonts, profile.value.theme.nameFontEn) || (profile.value.templateId === 'editorial' || profile.value.theme.font === 'editorial' ? 'Georgia, serif' : 'Satoshi, sans-serif'),
  '--font-name-zh': fontFamily(chineseNameFonts, profile.value.theme.nameFontZh),
}))
const gallerySource = (item: GalleryItem) => item.atlasIndex !== undefined && props.sample ? '/demo/che-gallery-triptych.png' : imageSource(item.assetId)
const portraitSource = computed(() => props.sample ? '/demo/che-gallery-triptych.png' : imageSource(profile.value.aboutAssetId))
const activeImage = computed(() => selectedImage.value === null ? null : profile.value.gallery[selectedImage.value] || null)
const activeInterest = computed(() => profile.value.interests.find(interest => interest.id === selectedInterest.value) || null)
const gallerySpans = computed(() => {
  let remaining = profile.value.gallery.length
  if (profile.value.templateId === 'y2k' && remaining === 3) return [6, 3, 3]
  const spans: number[] = []
  while (remaining) {
    const count = remaining === 4 ? 2 : Math.min(3, remaining)
    spans.push(...Array<number>(count).fill(12 / count))
    remaining -= count
  }
  return spans
})
useDialog(computed(() => activeImage.value !== null), '.lightbox', () => { selectedImage.value = null })
useDialog(computed(() => activeInterest.value !== null), '.interest-dialog', () => { selectedInterest.value = null })
function moveImage(direction: number) {
  if (selectedImage.value !== null) selectedImage.value = (selectedImage.value + direction + profile.value.gallery.length) % profile.value.gallery.length
}
function onKey(event: KeyboardEvent) {
  if (selectedImage.value === null) return
  if (event.key === 'ArrowRight') moveImage(1)
  if (event.key === 'ArrowLeft') moveImage(-1)
}
let animation: gsap.Context | undefined
let animationVersion = 0
let ambientObserver: IntersectionObserver | undefined
let stripObserver: ResizeObserver | undefined
let dialogAnimation: gsap.Context | undefined
let dialogVersion = 0
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
function clearAmbient() {
  ambientObserver?.disconnect(); stripObserver?.disconnect()
  root.value?.querySelectorAll('.ambient-in-view').forEach(element => element.classList.remove('ambient-in-view'))
}
function observeAmbient() {
  const targets = root.value!.querySelectorAll<HTMLElement>('[data-ambient]')
  if (typeof IntersectionObserver !== 'undefined') {
    ambientObserver = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('ambient-in-view', entry.isIntersecting)
    })
    targets.forEach(element => ambientObserver!.observe(element))
  } else targets.forEach(element => element.classList.add('ambient-in-view'))
  const group = root.value!.querySelector<HTMLElement>('.identity-group')
  if (group) {
    const measure = () => { marqueeDuration.value = Math.max(24, group.offsetWidth / 24).toFixed(3) + 's' }
    measure()
    if (typeof ResizeObserver !== 'undefined') { stripObserver = new ResizeObserver(measure); stripObserver.observe(group) }
  }
}
function visibilityChanged() { pageVisible.value = !document.hidden }
watch(() => [profile.value.theme.font, profile.value.theme.nameFontZh, profile.value.theme.nameFontEn], () => {
  void loadFontStyles(profile.value.theme).then(() => document.fonts.ready).then(() => { if (root.value?.isConnected) ScrollTrigger.refresh() }).catch(() => undefined)
}, { immediate: true })
watch(() => [...Object.values(profile.value.copy).map(block => block!.font), ...Object.values(profile.value.typography)], fonts => {
  void loadTextFontStyles(fonts).then(() => document.fonts.ready).then(() => { if (root.value?.isConnected) ScrollTrigger.refresh() }).catch(() => undefined)
}, { immediate: true })
async function animate() {
  const version = ++animationVersion
  animation?.revert()
  animation = undefined
  clearAmbient()
  await nextTick()
  if (version !== animationVersion || !root.value || motion.value === 'off' || reduced.matches) return
  observeAmbient()
  animation = gsap.context(() => {
    const letters = root.value!.querySelectorAll('.hero-letter')
    const visual = root.value!.querySelector('.hero-visual')
    if (letters.length) gsap.from(letters, { yPercent: 16, opacity: 0, rotate: -2, stagger: .055, duration: .9, ease: settleEase })
    if (visual) gsap.from(visual, { y: 18, opacity: 0, duration: 1.05, ease: settleEase })
    root.value!.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
      const delay = element.classList.contains('interest-row') ? Math.min(3, Array.from(element.parentElement!.children).indexOf(element)) * .045 : 0
      gsap.from(element, { y: 14, opacity: 0, duration: .85, delay, ease: settleEase, scrollTrigger: { trigger: element, start: 'top 96%', once: true } })
    })
    root.value!.querySelectorAll<HTMLElement>('.about-identity-card, .gallery-image > .media-art').forEach(element => {
      gsap.from(element, { clipPath: 'inset(0% 0% 12% 0%)', opacity: 0, duration: .95, ease: settleEase, scrollTrigger: { trigger: element, start: 'top 96%', once: true } })
    })
    const links = root.value!.querySelectorAll('.contact-links > a, .contact-links > button')
    if (links.length) gsap.from(links, { y: 10, opacity: 0, duration: .75, stagger: .055, ease: settleEase, scrollTrigger: { trigger: root.value!.querySelector('.contact-links'), start: 'top 96%', once: true } })
    if (motion.value === 'immersive') {
      root.value!.querySelectorAll<HTMLElement>('.gallery-image').forEach(element => {
        gsap.fromTo(element, { scale: .9 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: element, start: 'top bottom', end: 'top 35%', scrub: .7 } })
      })
      root.value!.querySelectorAll<HTMLElement>('.story-line').forEach(element => {
        gsap.fromTo(element, { opacity: .25 }, { opacity: 1, scrollTrigger: { trigger: element, start: 'top 92%', end: 'top 70%', scrub: .5 } })
      })
    }
  }, root.value)
}
async function animateDialog() {
  const version = ++dialogVersion
  dialogAnimation?.revert(); dialogAnimation = undefined
  await nextTick()
  if (version !== dialogVersion || motion.value === 'off' || reduced.matches) return
  const dialog = activeInterest.value ? document.querySelector<HTMLElement>('.interest-dialog') : activeImage.value ? document.querySelector<HTMLElement>('.lightbox') : null
  if (!dialog) return
  dialogAnimation = gsap.context(() => {
    gsap.from(dialog, { opacity: 0, duration: .3, ease: settleEase })
    const panel = dialog.querySelector(activeInterest.value ? '.interest-panel' : 'figure')
    if (panel) gsap.from(panel, { y: 16, scale: .985, opacity: 0, duration: .65, ease: settleEase })
  }, dialog)
}
function reducedChanged() { void animate(); void animateDialog() }
watch(() => [motion.value, props.sample, profile.value.templateId, profile.value.layout.decoration], () => { menuOpen.value = false; selectedInterest.value = null; selectedImage.value = null; void animate() })
watch([() => activeInterest.value !== null, () => activeImage.value !== null, motion], () => { void animateDialog() })
onMounted(() => { void animate(); document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', visibilityChanged); reduced.addEventListener('change', reducedChanged) })
onBeforeUnmount(() => { copyVersion++; clearTimeout(copyTimer); animationVersion++; dialogVersion++; animation?.revert(); dialogAnimation?.revert(); clearAmbient(); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', visibilityChanged); reduced.removeEventListener('change', reducedChanged) })
</script>
<template>
  <main ref="root" class="profile-page" :class="[{ 'no-decoration': !profile.layout.decoration, 'is-empty': !hero, 'is-sample': props.sample, 'motion-immersive': motion === 'immersive', 'motion-off': motion === 'off', 'motion-paused': !pageVisible, 'adaptive-photo-desktop': profile.heroMode === 'photo' && profile.heroFrames.desktop.aspect !== 'template', 'adaptive-photo-mobile': profile.heroMode === 'photo' && profile.heroFrames.mobile.aspect !== 'template' }, 'font-' + profile.theme.font, 'template-' + profile.templateId]" :style="styles" :data-name-font-zh="profile.theme.nameFontZh" :data-name-font-en="profile.theme.nameFontEn">
    <nav class="profile-nav" aria-label="个人主页导航">
      <a href="#hero" class="profile-mark">{{ profile.englishName || 'YOURNAME' }}</a>
      <div class="profile-nav-links"><a v-for="section in navSections" :key="section" :href="'#' + section">{{ sectionTitle(profile, section) }}</a></div>
      <span class="profile-handle">@{{ profile.handle }}</span>
      <button class="profile-menu" :aria-expanded="menuOpen" aria-controls="profile-mobile-menu" @click="menuOpen = !menuOpen">{{ menuOpen ? '关闭' : '菜单' }} <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span></button>
    </nav>
    <div v-if="menuOpen" id="profile-mobile-menu" class="profile-mobile-menu">
      <a v-for="section in navSections" :key="section" :href="'#' + section" @click="menuOpen = false">{{ sectionTitle(profile, section) }} <span>↗</span></a>
    </div>
    <section v-if="profile.templateId === 'y2k'" id="hero" class="profile-hero">
      <h1 class="hero-lettering" :aria-label="profile.englishName"><span v-for="(letter, index) in (profile.englishName || 'YOURNAME')" :key="index" class="hero-letter" aria-hidden="true">{{ letter }}</span></h1>
      <div v-if="profile.layout.decoration" class="hero-print" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="hero-native-name">{{ profile.name }}</p>
        <p class="hero-id">@{{ profile.handle }}</p>
        <p class="hero-tagline" :style="typeStyle('tagline')">{{ profile.tagline }}</p>
        <a v-if="navSections.length && text('scrollCue')" :href="'#' + navSections[0]" class="scroll-cue" :style="copyStyle('scrollCue')">{{ text('scrollCue') }} <span aria-hidden="true">↓</span></a>
      </div>
      <div v-if="hero" class="hero-visual" :class="'hero-' + profile.heroMode">
        <FramedImage :src="hero" :frames="profile.heroFrames" :alt="profile.name + '的角色主视觉'" eager @measure="measured" />
      </div>
      <div v-else-if="props.readonly" class="hero-placeholder public-placeholder" aria-hidden="true"><span class="placeholder-title">IN MY<br />COLORS.</span></div>
      <button v-else class="hero-placeholder" @click="emit('editHero')">
        <span class="placeholder-corner"></span><span class="placeholder-title">YOUR<br />CHARACTER</span>
        <span class="placeholder-upload">上传你的角色主图 <span>↗</span></span>
        <span class="placeholder-note">透明立绘 / 兽装照片</span>
      </button>
      <div v-if="profile.layout.decoration && text('heroNote')" class="hero-note" :style="copyStyle('heroNote')">{{ text('heroNote') }}</div>
    </section>
    <TemplateHero v-else :profile="profile" :hero="hero" :readonly="props.readonly" :first-section="navSections[0]" @edit-hero="emit('editHero')" @frame-measure="measured" />
    <div v-if="profile.layout.decoration && (profile.templateId === 'y2k' || profile.templateId === 'cyber')" class="identity-strip" data-ambient aria-hidden="true">
      <div class="identity-track" :style="{ ...copyStyle('identityText'), '--marquee-duration': marqueeDuration }"><div v-for="group in 2" :key="group" class="identity-group"><span v-for="i in 4" :key="i">{{ profile.englishName }} / {{ text('identityText') }} / </span></div></div>
    </div>
    <template v-for="section in profile.sectionOrder" :key="section">
      <section v-if="section === 'about' && profile.visible.about" id="about" class="profile-about paper-section">
        <div class="about-copy" data-reveal>
          <h2 v-if="text('aboutTitle')" :style="copyStyle('aboutTitle')">{{ text('aboutTitle') }} <span class="heading-rule"></span></h2>
          <p v-for="(line, index) in profile.bio.split('\n').filter(Boolean)" :key="index" class="story-line" :style="typeStyle('bio')" :class="{ 'story-lead': index === 0 }">{{ line }}</p>
          <div v-if="profile.keywords.length" class="keyword-list"><span v-for="word in profile.keywords" :key="word">{{ word }}</span></div>
        </div>
        <div class="about-portrait" data-reveal>
          <div class="about-identity-card">
            <div class="about-identity-copy"><strong>{{ profile.name }}</strong><p v-if="text('aboutEmpty')" :style="copyStyle('aboutEmpty')">{{ text('aboutEmpty') }}</p></div>
            <div v-if="portraitSource" class="about-avatar">
              <MediaArt v-if="props.sample" :src="portraitSource" :atlas-index="1" :alt="profile.name + '的头像'" />
              <FramedImage v-else :src="portraitSource" :frame="profile.aboutFrame" :alt="profile.name + '的头像'" />
            </div>
          </div>
        </div>
      </section>
      <section v-if="section === 'likes' && profile.visible.likes" id="likes" class="profile-likes">
        <h2 v-if="text('likesTitle')" :style="copyStyle('likesTitle')" data-reveal>{{ text('likesTitle') }} <span class="heading-rule"></span></h2>
        <div class="interest-rows">
          <button v-for="(interest, index) in profile.interests" :key="interest.id" class="interest-row" data-reveal @click="selectedInterest = interest.id" :aria-label="'了解喜好：' + interest.name" aria-haspopup="dialog">
            <span class="interest-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><h3 :style="typeStyle('interests')">{{ interest.name }}</h3><p :style="typeStyle('interests')">{{ interest.description }}</p></div>
            <span class="interest-arrow" aria-hidden="true">↗</span>
          </button>
          <p v-if="!profile.interests.length" class="empty-copy">喜欢的事，等你来写。</p>
        </div>
      </section>
      <section v-if="section === 'gallery' && profile.visible.gallery" id="gallery" class="profile-gallery">
        <div class="gallery-heading" data-reveal><h2 v-if="text('galleryTitle')" :style="copyStyle('galleryTitle')">{{ text('galleryTitle') }} <span class="heading-rule"></span></h2><p v-if="text('galleryNote')" :style="copyStyle('galleryNote')">{{ text('galleryNote') }}</p></div>
        <div class="gallery-grid grid-flow-dense" :class="{ 'gallery-many': profile.gallery.length > 3 }">
          <button v-for="(item, index) in profile.gallery" :key="item.id" class="gallery-image" :class="{ 'gallery-main': index === 0 }" :style="{ '--desktop-span': gallerySpans[index], '--mobile-span': index === 0 || (profile.gallery.length % 2 === 0 && index === profile.gallery.length - 1) ? 2 : 1 }" @click="selectedImage = index" :aria-label="'查看图片：' + item.caption">
            <span class="paper-tape" aria-hidden="true"></span>
            <MediaArt :src="gallerySource(item)" :atlas-index="props.sample ? item.atlasIndex : undefined" :alt="item.caption" :preserve-ratio="!props.sample || item.atlasIndex === undefined" />
            <span class="gallery-caption" :style="typeStyle('galleryCaptions')">{{ item.caption }} <span aria-hidden="true">↗</span></span>
          </button>
          <div v-if="!profile.gallery.length" class="gallery-empty"><span :style="copyStyle('galleryEmpty')">{{ text('galleryEmpty') }}</span><p>{{ props.readonly ? '故事，慢慢续写。' : '上传你的作品、立绘或兽装照片' }}</p></div>
        </div>
      </section>
      <section v-if="section === 'contact' && profile.visible.contact" id="contact" class="profile-contact paper-section">
        <div data-reveal><h2 v-if="text('contactTitle')" :style="copyStyle('contactTitle')">{{ text('contactTitle') }} <span class="heading-rule"></span></h2><p :style="copyStyle('contactIntro')">{{ text('contactIntro') }}</p></div>
        <div class="contact-links" data-reveal>
          <template v-for="contact in profile.contacts" :key="contact.id">
            <a v-if="safeLink(contact.url)" :href="safeLink(contact.url)!" target="_blank" rel="noopener noreferrer">{{ contact.name }} <span>↗</span></a>
            <button v-else-if="contact.url.trim()" class="contact-copy" :aria-label="'复制' + contact.name" @click="copyContact(contact)">{{ contact.name }} <span class="contact-action">{{ copiedContact === contact.id ? '已复制' : '复制' }}</span></button>
            <button v-else-if="!props.readonly" @click="emit('editContact')">{{ contact.name }} <span class="contact-empty-note">{{ props.sample ? '示例未设置联系方式' : '添加联系方式' }}</span><span>↗</span></button>
          </template>
          <p v-if="contactMessage" class="contact-feedback" role="status" aria-live="polite">{{ contactMessage }}</p>
          <input v-if="manualContact" class="contact-manual" :value="manualContact" readonly aria-label="手动复制联系方式" @focus="($event.target as HTMLInputElement).select()" />
        </div>
      </section>
    </template>
    <footer class="profile-footer"><span :style="copyStyle('identityText')">{{ profile.englishName }} / {{ text('identityText') }}</span><a v-if="text('backToTop')" href="#hero" :style="copyStyle('backToTop')">{{ text('backToTop') }} ↑</a></footer>
    <Teleport to="body">
      <div v-if="activeInterest" class="interest-dialog" role="dialog" aria-modal="true" :aria-label="activeInterest.name + ' · 喜好介绍'" :class="['interest-dialog-' + profile.templateId, 'font-' + profile.theme.font]" :style="styles" @click.self="selectedInterest = null">
        <article class="interest-panel"><button class="modal-close" aria-label="关闭喜好介绍" @click="selectedInterest = null">×</button><h2 :style="typeStyle('interests')">{{ activeInterest.name }}</h2><img v-if="imageSource(activeInterest.assetId)" class="interest-detail-image" :src="imageSource(activeInterest.assetId)" :alt="activeInterest.name + '的详情图片'" /><p class="interest-summary" :style="typeStyle('interests')">{{ activeInterest.description }}</p><p v-if="activeInterest.detail" class="interest-detail" :style="typeStyle('interests')">{{ activeInterest.detail }}</p><a v-if="safeLink(activeInterest.url || '')" :href="safeLink(activeInterest.url || '')!" target="_blank" rel="noopener noreferrer" class="interest-related">看看相关内容 <span>↗</span></a><button class="interest-back" @click="selectedInterest = null">返回主页 ←</button></article>
      </div>
      <div v-if="activeImage" class="lightbox" role="dialog" aria-modal="true" :aria-label="activeImage.caption" @click.self="selectedImage = null">
        <button class="lightbox-close" autofocus @click="selectedImage = null" aria-label="关闭大图">×</button>
        <button class="lightbox-prev" @click="moveImage(-1)" aria-label="上一张图片">←</button>
        <figure><MediaArt :src="gallerySource(activeImage)" :atlas-index="props.sample ? activeImage.atlasIndex : undefined" :alt="activeImage.caption" contain eager /><figcaption><span>{{ activeImage.caption }}</span><span>{{ (selectedImage || 0) + 1 }} / {{ profile.gallery.length }}</span></figcaption></figure>
        <button class="lightbox-next" @click="moveImage(1)" aria-label="下一张图片">→</button>
      </div>
    </Teleport>
  </main>
</template>
