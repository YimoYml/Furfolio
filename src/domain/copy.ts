import type { Draft, SectionId, TemplateId } from './profile'
import type { TextFont } from './fonts'

export const copyLabels = {
  heroNote: '开场装饰文案', scrollCue: '向下引导', identityText: '滚动条与页脚短句',
  aboutTitle: '关于栏目标题', aboutEmpty: '头像卡片短句',
  likesTitle: '喜好栏目标题', galleryTitle: '画廊栏目标题', galleryNote: '画廊旁的短句',
  galleryEmpty: '空画廊标题', contactTitle: '联系栏目标题', contactIntro: '联系邀请文案', backToTop: '返回开场文案',
} as const
export type CopyKey = keyof typeof copyLabels
export interface TextBlock { text: string; font: TextFont }
export type TypographyKey = 'tagline' | 'bio' | 'interests' | 'galleryCaptions'

export function defaultCopy(template: TemplateId, _englishName: string): Record<CopyKey, string> {
  return {
    heroNote: template === 'editorial' ? 'Same days.\nBrighter me.' : template === 'y2k' ? 'Same blue.\nDifferent days.' : '',
    scrollCue: '往下看看', identityText: 'IN MY OWN COLORS',
    aboutTitle: '关于我', aboutEmpty: '这里，装下真实的你。',
    likesTitle: '喜欢的事', galleryTitle: '我的片段',
    galleryNote: { y2k: 'Good days.\nStay blue.', minimal: 'Some moments,\nkept close.', cyber: 'A few frames.\nA little me.', editorial: 'Notes from\nmy world.' }[template],
    galleryEmpty: 'THE MOMENTS\nTHAT MAKE YOU.', contactTitle: '来打个招呼',
    contactIntro: '很高兴在这里遇见你。\n下一段故事，一起写。', backToTop: '回到开场',
  }
}
export function copyBlock(draft: Draft, key: CopyKey): TextBlock {
  return draft.copy[key] || { text: defaultCopy(draft.templateId, draft.englishName)[key], font: 'template' }
}
export function sectionTitle(draft: Draft, section: SectionId): string {
  const key = { about: 'aboutTitle', likes: 'likesTitle', gallery: 'galleryTitle', contact: 'contactTitle' }[section] as CopyKey
  return copyBlock(draft, key).text || defaultCopy(draft.templateId, draft.englishName)[key]
}
