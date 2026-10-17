import { newDraft, validHex } from './profile'
import type { Draft, GalleryItem, SectionId, Theme } from './profile'
import { defaultTheme, isTemplateId, templates } from '../templates/registry'
import { chineseNameFonts, cleanFont, contentFonts, englishNameFonts, textFonts } from './fonts'
import { copyLabels } from './copy'
import type { CopyKey, TextBlock, TypographyKey } from './copy'
import { cleanAvatarFrame, cleanFrame, defaultFrame } from './framing'

export function hydrateDraft(raw: string | null): Draft {
  const defaults = newDraft()
  if (!raw) return defaults
  try {
    const saved = JSON.parse(raw) as Partial<Draft>
    if (saved.schemaVersion !== 1) return defaults
    const templateId = isTemplateId(saved.templateId) ? saved.templateId : 'y2k'
    const themeDefaults = defaultTheme(templateId)
    const cleanTheme = (value: Partial<Theme> | undefined, fallback: Theme): Theme => ({
      acid: validHex(value?.acid, fallback.acid), blue: validHex(value?.blue, fallback.blue),
      font: cleanFont(contentFonts, value?.font, fallback.font),
      nameFontEn: cleanFont(englishNameFonts, value?.nameFontEn, fallback.nameFontEn),
      nameFontZh: cleanFont(chineseNameFonts, value?.nameFontZh, fallback.nameFontZh),
    })
    const themesByTemplate = Object.fromEntries(templates.filter(template => saved.themesByTemplate?.[template.id]).map(template => [template.id, cleanTheme(saved.themesByTemplate?.[template.id], defaultTheme(template.id))]))
    const text = (value: unknown, fallback: string, max: number) => typeof value === 'string' ? value.slice(0, max) : fallback
    const copy = Object.fromEntries(Object.keys(copyLabels).filter(key => typeof saved.copy?.[key as CopyKey]?.text === 'string').map(key => {
      const block = saved.copy![key as CopyKey]!
      return [key, { text: text(block.text, '', 180), font: cleanFont(textFonts, block.font, 'template') }]
    })) as Partial<Record<CopyKey, TextBlock>>
    const typography = Object.fromEntries(['tagline', 'bio', 'interests', 'galleryCaptions'].map(key => [key, cleanFont(textFonts, saved.typography?.[key as TypographyKey], 'template')])) as Draft['typography']
    const legacyFrame = saved.heroMode === 'photo' ? { ...defaultFrame(), fit: 'cover' as const, y: 50, aspect: 'template' as const } : defaultFrame()
    return {
      ...defaults, templateId, themesByTemplate, copy, typography, name: text(saved.name, defaults.name, 18), englishName: text(saved.englishName, defaults.englishName, 24),
      handle: text(saved.handle, defaults.handle, 32), tagline: text(saved.tagline, defaults.tagline, 80), bio: text(saved.bio, defaults.bio, 800),
      keywords: Array.isArray(saved.keywords) ? saved.keywords.filter(v => typeof v === 'string').slice(0, 8) : [],
      heroAssetId: typeof saved.heroAssetId === 'string' ? saved.heroAssetId : null,
      aboutAssetId: typeof saved.aboutAssetId === 'string' ? saved.aboutAssetId : null,
      aboutFrame: cleanAvatarFrame(saved.aboutFrame),
      heroMode: saved.heroMode === 'photo' ? 'photo' : 'cutout',
      heroFrames: { desktop: cleanFrame(saved.heroFrames?.desktop, legacyFrame), mobile: cleanFrame(saved.heroFrames?.mobile, legacyFrame) },
      interests: Array.isArray(saved.interests) ? saved.interests.filter(v => v && typeof v.name === 'string' && typeof v.description === 'string' && typeof v.id === 'string').slice(0, 6).map(v => ({ id: v.id, name: v.name.slice(0, 18), description: v.description.slice(0, 60), detail: text(v.detail, '', 800), url: text(v.url, '', 500), assetId: typeof v.assetId === 'string' ? v.assetId : undefined })) : defaults.interests,
      gallery: Array.isArray(saved.gallery) ? saved.gallery.filter((v): v is GalleryItem => !!v && typeof v.id === 'string' && typeof v.assetId === 'string' && typeof v.caption === 'string').slice(0, 8) : [],
      contacts: Array.isArray(saved.contacts) ? saved.contacts.filter(v => v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.url === 'string').slice(0, 8).map(v => ({ id: v.id, name: v.name.slice(0, 24), url: v.url.slice(0, 500).trim() })) : defaults.contacts,
      theme: cleanTheme(saved.theme, themeDefaults),
      motion: ['off', 'light', 'immersive'].includes(saved.motion || '') ? saved.motion! : defaults.motion,
      visible: Object.fromEntries(Object.keys(defaults.visible).map(key => [key, saved.visible?.[key as SectionId] !== false])) as Draft['visible'],
      sectionOrder: Array.isArray(saved.sectionOrder) && saved.sectionOrder.length === 4 && new Set(saved.sectionOrder).size === 4 && saved.sectionOrder.every(key => key in defaults.visible) ? saved.sectionOrder : defaults.sectionOrder,
      layout: {
        heroScale: Math.min(115, Math.max(80, Number(saved.layout?.heroScale) || 100)),
        heroOffset: Math.min(8, Math.max(-8, Number(saved.layout?.heroOffset) || 0)),
        heroMobileOffset: Math.min(20, Math.max(-20, Number(saved.layout?.heroMobileOffset) || 0)),
        heroMobileScale: Math.min(115, Math.max(80, Number(saved.layout?.heroMobileScale) || 100)),
        spacing: Math.min(130, Math.max(80, Number(saved.layout?.spacing) || 100)),
        decoration: saved.layout?.decoration !== false,
      },
    }
  } catch { return defaults }
}
