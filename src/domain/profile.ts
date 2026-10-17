import { defaultTheme } from '../templates/registry'
import type { ContentFont, NameFontEn, NameFontZh } from './fonts'
import type { TextFont } from './fonts'
import type { CopyKey, TextBlock, TypographyKey } from './copy'
import { defaultAvatarFrame, defaultFrame } from './framing'
import type { FrameDevice, ImageFrame } from './framing'

export type SectionId = 'about' | 'likes' | 'gallery' | 'contact'
export type MotionPreset = 'off' | 'light' | 'immersive'
export type TemplateId = 'y2k' | 'minimal' | 'cyber' | 'editorial'
export interface Theme { acid: string; blue: string; font: ContentFont; nameFontEn: NameFontEn; nameFontZh: NameFontZh }
export interface Interest { id: string; name: string; description: string; detail?: string; url?: string; assetId?: string }
export interface SocialLink { id: string; name: string; url: string }
export interface GalleryItem { id: string; assetId?: string; atlasIndex?: number; caption: string }
export interface Draft {
  schemaVersion: 1
  templateId: TemplateId
  name: string
  englishName: string
  handle: string
  tagline: string
  bio: string
  keywords: string[]
  heroAssetId: string | null
  aboutAssetId: string | null
  aboutFrame: ImageFrame
  heroMode: 'cutout' | 'photo'
  heroFrames: Record<FrameDevice, ImageFrame>
  copy: Partial<Record<CopyKey, TextBlock>>
  typography: Partial<Record<TypographyKey, TextFont>>
  interests: Interest[]
  gallery: GalleryItem[]
  contacts: SocialLink[]
  theme: Theme
  themesByTemplate: Partial<Record<TemplateId, Theme>>
  visible: Record<SectionId, boolean>
  sectionOrder: SectionId[]
  layout: { heroScale: number; heroOffset: number; heroMobileOffset: number; heroMobileScale: number; spacing: number; decoration: boolean }
  motion: MotionPreset
}
export const sectionLabels: Record<SectionId, string> = { about: '关于我', likes: '喜欢的事', gallery: '我的片段', contact: '来打个招呼' }
export const newDraft = (templateId: TemplateId = 'y2k'): Draft => ({
  schemaVersion: 1, templateId,
  name: '你的名字', englishName: 'YOURNAME', handle: 'your.id',
  tagline: '用自己的颜色，介绍自己。',
  bio: '这里可以写你的个人介绍、角色设定，或想分享的日常。',
  keywords: [], heroAssetId: null, aboutAssetId: null, heroMode: 'cutout',
  aboutFrame: defaultAvatarFrame(),
  heroFrames: { desktop: defaultFrame(), mobile: defaultFrame() }, copy: {}, typography: { tagline: 'template', bio: 'template', interests: 'template', galleryCaptions: 'template' },
  interests: [
    { id: 'music', name: '音乐', description: '最近一直在循环的旋律。' },
    { id: 'photography', name: '摄影', description: '记录生活里喜欢的片段。' },
    { id: 'games', name: '游戏', description: '一起探索另一种世界。' },
  ],
  gallery: [],
  contacts: [
    { id: 'bilibili', name: 'Bilibili', url: '' },
    { id: 'telegram', name: 'Telegram', url: '' },
    { id: 'qq', name: 'QQ', url: '' },
  ],
  theme: defaultTheme(templateId), themesByTemplate: {},
  visible: { about: true, likes: true, gallery: true, contact: true },
  sectionOrder: ['about', 'likes', 'gallery', 'contact'],
  layout: { heroScale: 100, heroOffset: 0, heroMobileOffset: 0, heroMobileScale: 100, spacing: 100, decoration: true },
  motion: 'light',
})
export function referencedAssetIds(draft: Pick<Draft, 'heroAssetId' | 'aboutAssetId' | 'interests' | 'gallery'>): string[] {
  return [...new Set([draft.heroAssetId, draft.aboutAssetId, ...draft.interests.map(item => item.assetId), ...draft.gallery.map(item => item.assetId)].filter((id): id is string => !!id))]
}
export const sampleDraft = (templateId: TemplateId = 'y2k'): Draft => ({
  ...newDraft(templateId), name: '澈', englishName: 'CHE', handle: 'che.blue',
  tagline: '把日常，过成自己的颜色。',
  bio: '一只喜欢记录日常的蓝白狐狸。\n用影像、音乐和游戏，收集生活里闪闪发光的片段。\n也希望在这里，遇见同样热爱生活的你。',
  keywords: ['蓝白狐狸', '慢热', '记录日常'],
  interests: [
    { id: 'music', name: '音乐', description: '旋律让平凡的日子，也闪闪发光。', detail: '走在回家的路上，喜欢把耳机里的旋律当作今天的片尾曲。\n\n这里可以写喜欢的歌手、最近在听的专辑，或放上自己的歌单链接。' },
    { id: 'photography', name: '摄影', description: '用镜头收藏，路过的风景和心情。', detail: '喜欢自然光、街边的小角落，也喜欢为朋友记录兽聚时开心的瞬间。\n\n这里可以介绍拍摄方向、设备、作品，或留下相册入口。' },
    { id: 'games', name: '游戏', description: '在虚拟的世界里，也能遇见真实的快乐。', detail: '比起冲到终点，更喜欢和朋友一起探索地图里的小故事。\n\n这里可以写常玩的游戏、偏好的玩法，或添加自己的游戏主页链接。' },
  ],
  gallery: [
    { id: 'sample-1', atlasIndex: 0, caption: '有风的好天气' },
    { id: 'sample-2', atlasIndex: 1, caption: '慢一点，也很好' },
    { id: 'sample-3', atlasIndex: 2, caption: '记录路过的光' },
  ],
})
export function safeLink(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null }
}
export function validHex(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}
export function contrastText(hex: string): string {
  const c = hex.slice(1).match(/.{2}/g)!.map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return c[0]! * .2126 + c[1]! * .7152 + c[2]! * .0722 > .179 ? '#141611' : '#ffffff'
}
