import type { Theme } from './profile'
import type { TextFont } from './fonts'

const styles = new Map<string, Promise<void>>()
function loadStyle(id: string): Promise<void> {
  const existing = styles.get(id)
  if (existing) return existing
  const loading = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/assets/fonts/${id}.css`
    link.onload = () => resolve()
    link.onerror = () => { link.remove(); styles.delete(id); reject(new Error('字体样式未能加载')) }
    document.head.append(link)
  })
  styles.set(id, loading)
  return loading
}
export function loadFontStyles(theme: Theme): Promise<void> {
  const required = new Set<string>()
  if (theme.font === 'editorial') required.add('notoserifsc')
  if (theme.font === 'rounded') { required.add('nunito'); required.add('notosanssc') }
  if (theme.font === 'warm' || theme.nameFontZh === 'wenkai') { required.add('lxgwwenkaitc'); required.add('notosanssc') }
  if (theme.nameFontZh === 'playful') { required.add('zcoolkuaile'); required.add('notosanssc') }
  if (theme.nameFontZh === 'sans') required.add('notosanssc')
  if (theme.nameFontZh === 'serif' || theme.nameFontEn === 'serif') required.add('notoserifsc')
  if (theme.nameFontEn === 'outfit') required.add('outfit')
  if (theme.nameFontEn === 'nunito') required.add('nunito')
  if (theme.nameFontEn === 'mono') required.add('spacemono')
  return Promise.all([...required].map(loadStyle)).then(() => undefined)
}
export function loadTextFontStyles(fonts: TextFont[]): Promise<void> {
  const required = new Set<string>()
  for (const font of fonts) {
    if (font === 'serif') required.add('notoserifsc')
    if (font === 'wenkai') required.add('lxgwwenkaitc')
    if (font === 'playful') required.add('zcoolkuaile')
    if (font === 'sans') required.add('notosanssc')
    if (font === 'outfit') required.add('outfit')
    if (font === 'nunito') required.add('nunito')
    if (font === 'mono') required.add('spacemono')
  }
  return Promise.all([...required].map(loadStyle)).then(() => undefined)
}
