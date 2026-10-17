<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditorStore } from '../stores/editor'
import { safeLink, sectionLabels } from '../domain/profile'
import type { SectionId } from '../domain/profile'
import PublishDialog from '../components/PublishDialog.vue'
import { getTemplate, isTemplateId, templates } from '../templates/registry'
import { contentFonts } from '../domain/fonts'
import NameFontControls from '../templates/NameFontControls.vue'
import HeroImageEditor from '../components/HeroImageEditor.vue'
import AvatarImageEditor from '../components/AvatarImageEditor.vue'
import CopyControls from '../components/CopyControls.vue'
import { textFonts } from '../domain/fonts'
const route = useRoute()
const router = useRouter()
const store = useEditorStore()
const steps = ['主题', '开场', '关于', '喜好', '画廊', '联系', '排版与动效']
const step = ref(Math.min(6, Math.max(0, Number(route.query.step) || 0)))
const device = ref<'desktop' | 'mobile'>(window.matchMedia('(max-width:700px)').matches ? 'mobile' : 'desktop')
const previewFrame = ref<HTMLIFrameElement>()
const stageArea = ref<HTMLElement>()
const controls = ref<HTMLElement>()
const scale = ref(1)
const keyword = ref('')
const uploadBusy = ref(false)
const publishOpen = ref(false)
const heroSrc = computed(() => store.assetUrls[store.draft.heroAssetId || ''])
const aboutSrc = computed(() => store.assetUrls[store.draft.aboutAssetId || ''])
const frameRatios = ref({ desktop: .9, mobile: .6 })
const viewportWidth = computed(() => device.value === 'mobile' ? 390 : 1120)
const viewportHeight = computed(() => device.value === 'mobile' ? 844 : 820)
const currentTemplate = computed(() => getTemplate(store.draft.templateId))
const presets = computed(() => currentTemplate.value.palettes)
const selectedTemplate = computed({ get: () => store.draft.templateId, set: value => store.switchTemplate(value) })
watch(() => route.query.template, value => { if (isTemplateId(value)) store.switchTemplate(value) }, { immediate: true })
function sendPreview() {
  previewFrame.value?.contentWindow?.postMessage({ type: 'fursona-draft', draft: JSON.parse(JSON.stringify(store.draft)), assetUrls: { ...store.assetUrls } }, window.location.origin)
}
function resizePreview() {
  scale.value = Math.min(1, ((stageArea.value?.clientWidth || viewportWidth.value) - 40) / viewportWidth.value)
}
function receiveStep(event: MessageEvent) {
  if (event.origin !== window.location.origin || event.source !== previewFrame.value?.contentWindow) return
  if (event.data?.type === 'fursona-step') step.value = Math.min(6, Math.max(0, Number(event.data.step) || 0))
  if (event.data?.type === 'furfolio-frame' && event.data.templateId === store.draft.templateId && event.data.mode === store.draft.heroMode && event.data.device === device.value && event.data.width > 0 && event.data.height > 0) frameRatios.value[device.value] = Math.max(.1, Math.min(10, event.data.width / event.data.height))
}
async function heroUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadBusy.value = true
  try { await store.setHero(file); await nextTick(); sendPreview() } catch (error) { store.error = (error as Error).message } finally { uploadBusy.value = false; input.value = '' }
}
async function galleryUpload(event: Event) {
  const input = event.target as HTMLInputElement
  uploadBusy.value = true
  store.error = ''
  try { for (const file of Array.from(input.files || [])) await store.addGallery(file); sendPreview() } catch (error) { store.error = (error as Error).message } finally { uploadBusy.value = false; input.value = '' }
}
async function sectionUpload(event: Event, interestId?: string) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  uploadBusy.value = true
  try { if (interestId) await store.setInterestImage(interestId, file); else await store.setAbout(file); sendPreview() } catch (error) { store.error = (error as Error).message } finally { uploadBusy.value = false; input.value = '' }
}
function addKeyword() {
  const value = keyword.value.trim().slice(0, 14)
  if (value && !store.draft.keywords.includes(value) && store.draft.keywords.length < 8) store.draft.keywords.push(value)
  keyword.value = ''
}
function moveSection(index: number, direction: number) {
  const other = index + direction
  if (other < 0 || other > 3) return
  const order = [...store.draft.sectionOrder]
  ;[order[index], order[other]] = [order[other]!, order[index]!]
  store.draft.sectionOrder = order
}
function publish() { store.saveNow(); publishOpen.value = true }
function addInterest() { store.draft.interests.push({ id: crypto.randomUUID(), name: '新的喜好', description: '', detail: '', url: '' }) }
function addContact() { store.draft.contacts.push({ id: crypto.randomUUID(), name: '自定义联系方式', url: '' }) }
let observer: ResizeObserver | undefined
watch([() => store.draft, () => store.assetUrls], sendPreview, { deep: true, flush: 'post' })
watch(device, () => void nextTick(resizePreview))
watch(() => store.draft.heroMode, () => { for (const frame of Object.values(store.draft.heroFrames)) frame.fit = 'contain' })
watch(step, () => { controls.value?.scrollTo({ top: 0 }); store.error = '' })
onMounted(() => {
  if (route.query.publish === '1') { publishOpen.value = true; void router.replace({ path: '/editor', query: { ...route.query, publish: undefined } }) }
  observer = new ResizeObserver(resizePreview)
  if (stageArea.value) observer.observe(stageArea.value)
  resizePreview()
  window.addEventListener('message', receiveStep)
})
onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('message', receiveStep); store.saveNow() })
</script>
<template>
  <div class="editor-page">
    <header class="editor-header">
      <RouterLink to="/" class="brand">FURFOLIO<span>.</span></RouterLink>
      <span class="editor-document">我的主页 <span>{{ currentTemplate.letter }} / {{ currentTemplate.shortName }}</span></span>
      <div class="editor-header-actions"><span class="save-status" aria-live="polite"><span></span>{{ store.saveState }}</span><RouterLink to="/preview" target="_blank" class="text-link">完整预览 ↗</RouterLink><button class="button button-dark" @click="publish">发布主页 ↗</button></div>
    </header>
    <div class="editor-shell">
      <aside class="editor-sidebar">
        <div class="editor-sidebar-heading"><RouterLink to="/templates">← 返回风格选择</RouterLink><h1>让它，更像你。</h1><p>按栏目慢慢完善，随时回头修改。</p></div>
        <nav class="editor-step-nav" aria-label="编辑步骤"><button v-for="(title, index) in steps" :key="title" :class="{ active: step === index }" @click="step = index"><span>{{ index + 1 }}</span>{{ title }}</button></nav>
        <div ref="controls" class="editor-controls">
          <div v-if="store.error" role="alert" class="editor-error">{{ store.error }}<button @click="store.error = ''" aria-label="关闭提示">×</button></div>
          <section v-if="step === 0" class="control-section">
            <h2>先选一种颜色。</h2><p class="control-description">从喜欢的组合开始，之后也能随时修改。</p>
            <label class="field-label">模板风格<select v-model="selectedTemplate"><option v-for="template in templates" :key="template.id" :value="template.id">{{ template.letter }} · {{ template.chinese }}</option></select></label>
            <p class="field-help template-switch-help">切换风格会保留文字和图片，也会记住各风格的配色。</p>
            <div class="palette-grid"><button v-for="preset in presets" :key="preset.name" class="palette" :class="{ selected: store.draft.theme.acid === preset.acid && store.draft.theme.blue === preset.blue }" @click="store.draft.theme.acid = preset.acid; store.draft.theme.blue = preset.blue"><span class="palette-colors"><i :style="{ background: preset.acid }"></i><i :style="{ background: preset.blue }"></i></span>{{ preset.name }}</button></div>
            <div class="color-fields"><label>主色<input v-model="store.draft.theme.acid" type="color" aria-label="自定义主色" /></label><label>强调色<input v-model="store.draft.theme.blue" type="color" aria-label="自定义强调色" /></label></div>
            <label class="field-label">内容字体气质<select v-model="store.draft.theme.font"><option v-for="font in contentFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
            <NameFontControls :theme="store.draft.theme" :name="store.draft.name" :english-name="store.draft.englishName" :template-id="store.draft.templateId" />
          </section>
          <section v-else-if="step === 1" class="control-section">
            <h2>你的开场。</h2><p class="control-description">一个名字、一张主图，再加一句你的话。</p>
            <label class="field-label">角色名称<input v-model="store.draft.name" maxlength="18" /></label>
            <label class="field-label">英文名 / ID<input v-model="store.draft.englishName" maxlength="24" /></label>
            <NameFontControls :theme="store.draft.theme" :name="store.draft.name" :english-name="store.draft.englishName" :template-id="store.draft.templateId" />
            <label class="field-label">个人标识<input v-model="store.draft.handle" maxlength="32" /></label>
            <label class="field-label">个性签名<textarea v-model="store.draft.tagline" maxlength="80" rows="2"></textarea></label>
            <label class="field-label">个性签名字体<select v-model="store.draft.typography.tagline"><option v-for="font in textFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
            <div class="field-label">主图展示方式<div class="segmented"><button :class="{ active: store.draft.heroMode === 'cutout' }" @click="store.draft.heroMode = 'cutout'">透明立绘</button><button :class="{ active: store.draft.heroMode === 'photo' }" @click="store.draft.heroMode = 'photo'">普通照片</button></div></div>
            <label class="upload-area compact" for="hero-upload"><span>{{ uploadBusy ? '正在保存图片…' : heroSrc ? '替换主图 ↗' : '选择你的主图 ↗' }}</span><small>{{ store.draft.heroMode === 'cutout' ? '请使用透明背景 PNG / WebP' : 'PNG / WebP / JPG' }} · 最大 10 MB</small></label>
            <input id="hero-upload" class="file-input" type="file" accept="image/png,image/webp,image/jpeg" :disabled="uploadBusy" @change="heroUpload" />
            <HeroImageEditor v-if="heroSrc" v-model:device="device" :draft="store.draft" :src="heroSrc" :ratios="frameRatios" />
            <button v-if="heroSrc" class="quiet-button" :disabled="uploadBusy" @click="store.removeHero()">删除主图</button>
            <p class="field-help">图片只保存在此浏览器。模板不会添加示例角色。</p>
            <CopyControls :draft="store.draft" :fields="['heroNote', 'scrollCue', 'identityText']" />
          </section>
          <section v-else-if="step === 2" class="control-section">
            <h2>说一点关于你。</h2><p class="control-description">个人介绍、角色设定，或你的日常。按回车换段。</p>
            <label class="field-label">个人介绍<textarea v-model="store.draft.bio" maxlength="800" rows="7"></textarea></label>
            <label class="field-label">个人介绍字体<select v-model="store.draft.typography.bio"><option v-for="font in textFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
            <label class="upload-area compact" for="about-upload"><span>{{ uploadBusy ? '正在保存图片…' : aboutSrc ? '替换头像 ↗' : '添加头像 ↗' }}</span><small>推荐使用头像 · PNG / WebP / JPG · 最大 10 MB</small></label>
            <input id="about-upload" class="file-input" type="file" accept="image/png,image/webp,image/jpeg" :disabled="uploadBusy" @change="sectionUpload($event)" />
            <AvatarImageEditor v-if="aboutSrc" :draft="store.draft" :src="aboutSrc" />
            <button v-if="aboutSrc" class="quiet-button" :disabled="uploadBusy" @click="store.removeAbout()">删除头像</button>
            <p class="field-help">头像独立于主图，在卡片右侧方形展示。不添加时保留卡片文字。</p>
            <label class="field-label">性格关键词<div class="inline-input"><input v-model="keyword" maxlength="14" placeholder="例如：慢热、摄影爱好者" @keydown.enter.prevent="addKeyword" /><button @click="addKeyword" :disabled="store.draft.keywords.length >= 8">添加</button></div></label>
            <div class="editor-tags"><button v-for="(tag, index) in store.draft.keywords" :key="tag" @click="store.draft.keywords.splice(index, 1)" :aria-label="'删除关键词 ' + tag">{{ tag }} ×</button></div>
            <CopyControls :draft="store.draft" :fields="['aboutTitle', 'aboutEmpty']" />
          </section>
          <section v-else-if="step === 3" class="control-section">
            <h2>喜欢，是很好的介绍。</h2><p class="control-description">写下最多六件喜欢的事。访客点击条目后，可以阅读进一步介绍。</p>
            <label class="field-label">喜好内容字体<select v-model="store.draft.typography.interests"><option v-for="font in textFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
            <div v-for="(interest, index) in store.draft.interests" :key="interest.id" class="repeat-field">
              <label class="field-label">兴趣名称<input v-model="interest.name" maxlength="18" /></label>
              <label class="field-label">一句说明<textarea v-model="interest.description" maxlength="60" rows="2"></textarea></label>
              <label class="upload-area interest-upload" :for="'interest-upload-' + index"><img v-if="interest.assetId" :src="store.assetUrls[interest.assetId]" :alt="interest.name + '的详情图片'" /><span>{{ uploadBusy ? '正在保存图片…' : interest.assetId ? '替换详情图片 ↗' : '添加详情图片（选填）↗' }}</span><small>访客点击这项喜好后展示 · 最大 10 MB</small></label>
              <input :id="'interest-upload-' + index" class="file-input" type="file" accept="image/png,image/webp,image/jpeg" :disabled="uploadBusy" @change="sectionUpload($event, interest.id)" />
              <button v-if="interest.assetId" class="quiet-button" :disabled="uploadBusy" @click="store.removeInterestImage(interest.id)">删除详情图片</button>
              <label class="field-label">进一步介绍（选填）<textarea v-model="interest.detail" maxlength="800" rows="4" placeholder="例如喜欢的歌手、常玩的游戏、摄影方向…"></textarea></label>
              <label class="field-label">相关链接（选填）<input v-model="interest.url" type="url" maxlength="500" placeholder="https://" /></label>
              <p v-if="interest.url && !safeLink(interest.url)" class="field-invalid">请填写以 https:// 或 http:// 开头的完整链接。</p>
              <button class="quiet-button" :disabled="uploadBusy" @click="store.removeInterest(index)">删除这项</button>
            </div>
            <button class="outline-button" :disabled="store.draft.interests.length >= 6" @click="addInterest">+ 添加喜欢的事</button>
            <CopyControls :draft="store.draft" :fields="['likesTitle']" />
          </section>
          <section v-else-if="step === 4" class="control-section">
            <h2>放进你的片段。</h2><p class="control-description">立绘、兽装照片、自己的作品。保留原图比例，最多八张。</p>
            <label class="upload-area compact" for="gallery-upload"><span>{{ uploadBusy ? '正在保存图片…' : '+ 选择画廊图片' }}</span><small>PNG / WebP / JPG · 单张最大 10 MB</small></label><input id="gallery-upload" class="file-input" type="file" multiple accept="image/png,image/webp,image/jpeg" :disabled="uploadBusy" @change="galleryUpload" />
            <div v-for="(item, index) in store.draft.gallery" :key="item.id" class="gallery-editor-item"><img :src="store.assetUrls[item.assetId || '']" :alt="item.caption" /><div><label class="field-label">图片说明<input v-model="item.caption" maxlength="32" /></label><button class="quiet-button" @click="store.removeGallery(index)">删除图片</button></div></div>
            <label class="field-label">图片说明字体<select v-model="store.draft.typography.galleryCaptions"><option v-for="font in textFonts" :key="font.id" :value="font.id">{{ font.label }}</option></select></label>
            <CopyControls :draft="store.draft" :fields="['galleryTitle', 'galleryNote', 'galleryEmpty']" />
          </section>
          <section v-else-if="step === 5" class="control-section">
            <h2>留下一个入口。</h2><p class="control-description">添加你愿意公开的链接或账号。点击完整网页链接会打开网址，其他内容会复制。</p>
            <div v-for="(contact, index) in store.draft.contacts" :key="contact.id" class="repeat-field"><label class="field-label">平台名称<input v-model="contact.name" maxlength="24" /></label><label class="field-label">链接或账号<input v-model="contact.url" type="text" placeholder="https://… 或 QQ 号、邮箱、用户名" maxlength="500" /></label><button class="quiet-button" @click="store.draft.contacts.splice(index, 1)">删除这项</button></div>
            <button class="outline-button" :disabled="store.draft.contacts.length >= 8" @click="addContact">+ 添加其他联系方式</button>
            <CopyControls :draft="store.draft" :fields="['contactTitle', 'contactIntro', 'backToTop']" />
          </section>
          <section v-else class="control-section">
            <h2>最后，一点小调整。</h2><p class="control-description">保留模板骨架，用少量调整找到舒服的样子。</p>
            <h3 class="control-subtitle">栏目与顺序</h3>
            <div v-for="(section, index) in store.draft.sectionOrder" :key="section" class="section-control"><label><input v-model="store.draft.visible[section as SectionId]" type="checkbox" />{{ sectionLabels[section] }}</label><div><button :disabled="index === 0" @click="moveSection(index, -1)" :aria-label="'上移' + sectionLabels[section]">↑</button><button :disabled="index === 3" @click="moveSection(index, 1)" :aria-label="'下移' + sectionLabels[section]">↓</button></div></div>
            <label class="field-label range-label">桌面主图大小 <span>{{ store.draft.layout.heroScale }}%</span><input v-model.number="store.draft.layout.heroScale" type="range" min="80" max="115" /></label>
            <label class="field-label range-label">桌面立绘偏移 <span>{{ store.draft.layout.heroOffset }}%</span><input v-model.number="store.draft.layout.heroOffset" type="range" min="-8" max="8" /></label>
            <label class="field-label range-label">手机主图大小 <span>{{ store.draft.layout.heroMobileScale }}%</span><input v-model.number="store.draft.layout.heroMobileScale" type="range" min="80" max="115" /></label>
            <label class="field-label range-label">手机主图左右偏移 <span>{{ store.draft.layout.heroMobileOffset }}%</span><input v-model.number="store.draft.layout.heroMobileOffset" type="range" min="-20" max="20" /></label>
            <label class="field-label range-label">栏目留白 <span>{{ store.draft.layout.spacing }}%</span><input v-model.number="store.draft.layout.spacing" type="range" min="80" max="130" /></label>
            <label class="checkbox-field"><input v-model="store.draft.layout.decoration" type="checkbox" />显示模板装饰</label>
            <button class="quiet-button" @click="store.resetLayout()">恢复默认布局</button>
            <h3 class="control-subtitle">动效</h3>
            <div class="motion-options"><label v-for="motion in [{ value: 'off', name: '关闭', note: '安静地展示内容' }, { value: 'light', name: '轻盈', note: '柔和展开，Y2K / Cyber 装饰缓慢流动' }, { value: 'immersive', name: '沉浸', note: '轻盈动效，加上滚动揭示与画廊缩放' }]" :key="motion.value"><input v-model="store.draft.motion" type="radio" :value="motion.value" /><span><strong>{{ motion.name }}</strong><small>{{ motion.note }}</small></span></label></div>
            <p class="field-help">主图裁切与拖动在“开场”中调整。手机与桌面的偏移分别保存；系统开启减少动态时，动画自动停用。</p>
          </section>
        </div>
        <div class="step-footer"><button class="text-link" :disabled="step === 0" @click="step--">← 上一步</button><button class="button button-dark" @click="step === 6 ? publish() : step++">{{ step === 6 ? '完成设计' : '下一步' }} →</button></div>
      </aside>
      <section ref="stageArea" class="editor-preview-area" aria-label="实时主页预览">
        <div class="preview-controls"><div class="segmented"><button :class="{ active: device === 'desktop' }" @click="device = 'desktop'">桌面</button><button :class="{ active: device === 'mobile' }" @click="device = 'mobile'">手机</button></div><span>{{ viewportWidth }} px · 实时预览</span><RouterLink :to="'/preview?sample=1&template=' + store.draft.templateId" target="_blank" class="text-link">查看示例 ↗</RouterLink></div>
        <div class="preview-viewport" :class="{ 'device-mobile': device === 'mobile' }" :style="{ width: viewportWidth * scale + 'px', height: viewportHeight * scale + 'px' }"><iframe ref="previewFrame" src="/preview?embedded=1" title="个人主页实时预览" :style="{ width: viewportWidth + 'px', height: viewportHeight + 'px', transform: 'scale(' + scale + ')' }" @load="sendPreview" /></div>
        <p class="preview-caption">自己的内容，自己的颜色。修改会自动保存到此浏览器。</p>
      </section>
    </div>
    <PublishDialog v-if="publishOpen" @close="publishOpen = false" />
  </div>
</template>
