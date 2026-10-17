import type { Draft } from '../domain/profile'
export interface User { id: string; username: string }
export interface Asset { id: string; secure_url: string; bytes: number; width: number; height: number; format: string }
export interface Homepage { id: string; slug: string; draft: Draft; version: number; updated_at: string; show_in_showcase?: boolean }
export interface Published { slug: string; version: number; published_at: string; show_in_showcase?: boolean }
export interface ShowcaseEntry { slug: string; name: string; englishName: string; templateId: Draft['templateId']; theme: Pick<Draft['theme'], 'acid' | 'blue'> }
export interface ShowcaseResult { items: ShowcaseEntry[]; nextCursor: string | null }
export interface HomeResult { homepage: Homepage | null; assets: Asset[]; published: Published | null }
export class CloudError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message) }
}
export async function api<T>(path: string, data?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/' + path, { credentials: 'same-origin',
      ...(data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(60000),
    })
  } catch { throw new CloudError(0, '网络暂时没有响应，草稿仍保存在此浏览器。', 'network_error') }
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new CloudError(response.status, result?.message || '云端暂不可用，请稍后再试。', result?.error || 'request_failed')
  return result as T
}
export async function compressedPicture(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob).catch(() => { throw new Error('这张本地图片无法读取，请重新选择。') })
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器暂不支持图片处理，请换一个浏览器。')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [.88, .75, .6]) {
      const file = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
      if (file && file.size <= 3 * 1024 * 1024) return file
    }
    throw new Error('图片压缩后仍超过 3 MB，请缩小图片后重试。')
  } finally { bitmap.close() }
}
export async function uploadPicture(id: string, blob: Blob): Promise<Asset> {
  const form = new FormData()
  form.set('assetId', id); form.set('file', await compressedPicture(blob), id + '.webp')
  let response: Response
  try { response = await fetch('/api/assets/upload', { method: 'POST', body: form, credentials: 'same-origin', signal: AbortSignal.timeout(60000) }) }
  catch { throw new CloudError(0, '图片上传暂未完成，可以保留草稿并重试。', 'network_error') }
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.asset) throw new CloudError(response.status, result?.message || '图片未能上传，请重试。', result?.error || 'upload_failed')
  return result.asset
}
