export const CLOUDINARY_MEDIA_BASE = 'https://res.cloudinary.com/jcirypaz/image/upload/'
export const MEDIA_ROUTE = '/api/media/'
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
const uploadPath = new RegExp(`^(?:v[1-9][0-9]{0,12}/)?furfolio/${uuid}/${uuid}\\.(?:webp|png|jpg)$`)

// Only original Furfolio uploads are accepted: no other account, transformation,
// external fetch URL, query string, encoded path or traversal component.
export function mediaPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.startsWith(CLOUDINARY_MEDIA_BASE) ? value.slice(CLOUDINARY_MEDIA_BASE.length)
    : value.startsWith(MEDIA_ROUTE) ? value.slice(MEDIA_ROUTE.length) : ''
  return uploadPath.test(path) ? path : null
}
export function displayImageSource(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (value.startsWith('blob:')) return value
  const path = mediaPath(value)
  return path ? MEDIA_ROUTE + path : ''
}
export function remoteMediaMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([id, url]) => {
    const path = mediaPath(url)
    return path ? [[id, MEDIA_ROUTE + path]] : []
  }))
}
