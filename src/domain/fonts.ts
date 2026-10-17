export type ContentFont = 'modern' | 'editorial' | 'warm' | 'rounded'
export type NameFontEn = 'template' | 'satoshi' | 'outfit' | 'nunito' | 'serif' | 'mono'
export type NameFontZh = 'template' | 'sans' | 'serif' | 'wenkai' | 'playful'
export type TextFont = NameFontEn | NameFontZh
interface FontOption<T extends string> { id: T; label: string; family: string }

const chineseSans = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif'
const chineseSerif = '"Noto Serif SC", SimSun, serif'
const chineseWarm = '"LXGW WenKai TC", "Noto Sans SC", KaiTi, serif'

export const contentFonts: FontOption<ContentFont>[] = [
  { id: 'modern', label: '利落现代', family: `Satoshi, ${chineseSans}` },
  { id: 'editorial', label: '文艺衬线', family: `Georgia, ${chineseSerif}` },
  { id: 'warm', label: '温润手写', family: chineseWarm },
  { id: 'rounded', label: '清爽圆润', family: `Nunito, ${chineseSans}` },
]
export const englishNameFonts: FontOption<NameFontEn>[] = [
  { id: 'template', label: '跟随模板', family: '' },
  { id: 'satoshi', label: '利落 · Satoshi', family: `Satoshi, ${chineseSans}` },
  { id: 'outfit', label: '几何 · Outfit', family: `Outfit, ${chineseSans}` },
  { id: 'nunito', label: '柔和 · Nunito', family: `Nunito, ${chineseSans}` },
  { id: 'serif', label: '经典衬线 · Georgia', family: `Georgia, ${chineseSerif}` },
  { id: 'mono', label: '打字机 · Space Mono', family: `"Space Mono", ${chineseSans}` },
]
export const chineseNameFonts: FontOption<NameFontZh>[] = [
  { id: 'template', label: '跟随模板', family: '' },
  { id: 'sans', label: '现代黑体 · Noto Sans SC', family: chineseSans },
  { id: 'serif', label: '文艺宋体 · Noto Serif SC', family: chineseSerif },
  { id: 'wenkai', label: '温润楷体 · 霞鹜文楷 TC', family: chineseWarm },
  { id: 'playful', label: '俏皮展示 · 站酷快乐体', family: `"ZCOOL KuaiLe", ${chineseSans}` },
]
export const textFonts: FontOption<TextFont>[] = [
  { id: 'template', label: '跟随模板', family: '' },
  ...englishNameFonts.filter(option => option.id !== 'template'),
  ...chineseNameFonts.filter(option => !['template', 'serif'].includes(option.id)),
]
export function fontFamily<T extends string>(options: FontOption<T>[], id: T) {
  return options.find(option => option.id === id)?.family || undefined
}
export function cleanFont<T extends string>(options: FontOption<T>[], value: unknown, fallback: T): T {
  return options.find(option => option.id === value)?.id || fallback
}
