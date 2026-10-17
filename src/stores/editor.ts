import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { newDraft, referencedAssetIds } from '../domain/profile'
import { defaultAvatarFrame, defaultFrame } from '../domain/framing'
import { hydrateDraft } from '../domain/normalize'
import { defaultTheme } from '../templates/registry'
import type { Draft, TemplateId } from '../domain/profile'
import { deleteAsset, getAsset, putAsset } from '../persistence/assets'
import { displayImageSource, remoteMediaMap } from '../domain/media'

export const DRAFT_KEY = 'fursona:draft:v1'
function initial(): Draft { try { return hydrateDraft(localStorage.getItem(DRAFT_KEY)) } catch { return newDraft() } }
export const useEditorStore = defineStore('editor', () => {
  const draft = reactive(initial())
  const assetUrls = reactive<Record<string, string>>({})
  try { Object.assign(assetUrls, remoteMediaMap(JSON.parse(localStorage.getItem('furfolio:remote-media') || '{}'))) } catch { /* Recover local images below. */ }
  const saveState = ref('已保存至本地')
  const error = ref('')
  let saveTimer: ReturnType<typeof setTimeout>
  async function resolveAssets() {
    const ids = referencedAssetIds(draft)
    try {
      for (const id of ids) if (!assetUrls[id]?.startsWith('blob:')) {
        const blob = await getAsset(id)
        if (blob) assetUrls[id] = URL.createObjectURL(blob)
        else if (!assetUrls[id]) error.value = '部分本地图片未能恢复，可以重新选择图片。'
      }
    } catch { error.value = '图片存储暂不可用，文字内容仍可继续编辑。' }
  }
  function saveNow() {
    clearTimeout(saveTimer)
    try {
      const json = JSON.stringify(draft)
      if (json !== localStorage.getItem(DRAFT_KEY)) localStorage.setItem(DRAFT_KEY, json)
      saveState.value = '已保存至本地'
    } catch { saveState.value = '保存失败'; error.value = '浏览器未能保存草稿，请保持此页面打开。' }
  }
  watch(draft, () => { saveState.value = '保存中…'; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300) }, { deep: true })
  window.addEventListener('pagehide', saveNow)
  window.addEventListener('storage', event => {
    if (event.key === DRAFT_KEY) { Object.assign(draft, hydrateDraft(event.newValue)); void resolveAssets() }
  })
  window.addEventListener('message', event => {
    if (event.origin === window.location.origin && event.source === window.parent && event.data?.type === 'fursona-draft') {
      Object.assign(draft, hydrateDraft(JSON.stringify(event.data.draft)))
      if (event.data.assetUrls && typeof event.data.assetUrls === 'object') {
        for (const [id, value] of Object.entries(event.data.assetUrls)) {
          const src = displayImageSource(value)
          if (src) assetUrls[id] = src
        }
      }
    }
  })
  async function release(id: string | null) {
    if (!id || referencedAssetIds(draft).includes(id)) return
    if (assetUrls[id]) { URL.revokeObjectURL(assetUrls[id]); delete assetUrls[id] }
    try { await deleteAsset(id) } catch { /* Current draft does not depend on this unreferenced image. */ }
  }
  async function setHero(file: File) {
    error.value = ''
    const asset = await putAsset(file)
    const previous = draft.heroAssetId
    assetUrls[asset.id] = asset.url
    draft.heroAssetId = asset.id
    const frame = { ...defaultFrame(), y: draft.heroMode === 'photo' ? 50 : 100 }
    draft.heroFrames = { desktop: { ...frame }, mobile: { ...frame } }
    await release(previous)
  }
  async function removeHero() { const id = draft.heroAssetId; draft.heroAssetId = null; await release(id) }
  async function setAbout(file: File) {
    error.value = ''
    const asset = await putAsset(file), previous = draft.aboutAssetId
    assetUrls[asset.id] = asset.url
    draft.aboutAssetId = asset.id
    draft.aboutFrame = defaultAvatarFrame()
    await release(previous)
  }
  async function removeAbout() { const id = draft.aboutAssetId; draft.aboutAssetId = null; draft.aboutFrame = defaultAvatarFrame(); await release(id) }
  async function setInterestImage(interestId: string, file: File) {
    error.value = ''
    const asset = await putAsset(file)
    const interest = draft.interests.find(item => item.id === interestId)
    if (!interest) { await deleteAsset(asset.id); URL.revokeObjectURL(asset.url); return }
    const previous = interest.assetId
    assetUrls[asset.id] = asset.url
    interest.assetId = asset.id
    await release(previous || null)
  }
  async function removeInterestImage(interestId: string) {
    const interest = draft.interests.find(item => item.id === interestId)
    if (!interest) return
    const id = interest.assetId
    delete interest.assetId
    await release(id || null)
  }
  async function removeInterest(index: number) { const [item] = draft.interests.splice(index, 1); await release(item?.assetId || null) }
  async function addGallery(file: File) {
    if (draft.gallery.length >= 8) throw new Error('范本最多添加 8 张画廊图片。')
    const asset = await putAsset(file)
    assetUrls[asset.id] = asset.url
    draft.gallery.push({ id: crypto.randomUUID(), assetId: asset.id, caption: file.name.replace(/\.[^.]+$/, '').slice(0, 32) })
  }
  async function removeGallery(index: number) { const [item] = draft.gallery.splice(index, 1); await release(item?.assetId || null) }
  function switchTemplate(id: TemplateId) {
    if (draft.templateId === id) return
    draft.themesByTemplate[draft.templateId] = { ...draft.theme }
    draft.templateId = id
    draft.theme = { ...(draft.themesByTemplate[id] || defaultTheme(id)) }
  }
  function resetLayout() {
    draft.layout = newDraft().layout
    draft.aboutFrame = defaultAvatarFrame()
    const frame = { ...defaultFrame(), y: draft.heroMode === 'photo' ? 50 : 100 }
    draft.heroFrames = { desktop: { ...frame }, mobile: { ...frame } }
  }
  function rememberMedia(media: Record<string, string>) {
    const clean = remoteMediaMap(media)
    for (const [id, url] of Object.entries(clean)) if (!assetUrls[id]?.startsWith('blob:')) assetUrls[id] = url
    try {
      const saved = remoteMediaMap(JSON.parse(localStorage.getItem('furfolio:remote-media') || '{}'))
      localStorage.setItem('furfolio:remote-media', JSON.stringify({ ...saved, ...clean }))
    } catch { error.value = '浏览器暂未保存云端图片记录，下次可从后台载入。' }
  }
  function loadCloud(value: Draft, media: Record<string, string>) {
    error.value = ''
    // Keep one previous local draft before the user explicitly loads a cloud draft.
    try { localStorage.setItem('furfolio:previous-local-draft', JSON.stringify(draft)) } catch { /* Current page remains usable. */ }
    rememberMedia(media)
    Object.assign(draft, hydrateDraft(JSON.stringify(value)))
    saveNow()
    void resolveAssets()
  }
  void resolveAssets()
  return { draft, assetUrls, saveState, error, switchTemplate, setHero, removeHero, setAbout, removeAbout, setInterestImage, removeInterestImage, removeInterest, addGallery, removeGallery, saveNow, resetLayout, rememberMedia, loadCloud }
})
