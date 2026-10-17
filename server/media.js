import { CLOUDINARY_MEDIA_BASE, MEDIA_ROUTE, mediaPath } from '../src/domain/media.ts'
import { ApiError, json } from './http.js'

const MAX_IMAGE = 3 * 1024 * 1024
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800'
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
function invalidImage() { return new ApiError(502, '图片暂时无法读取，请稍后重试。', 'invalid_upstream_image') }
async function imageBytes(response) {
  const declared = response.headers.get('Content-Length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_IMAGE)) {
    await response.body?.cancel(); throw invalidImage()
  }
  const reader = response.body?.getReader()
  if (!reader) throw invalidImage()
  const chunks = []; let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_IMAGE) { await reader.cancel(); throw invalidImage() }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (!size) throw invalidImage()
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}
function validImage(bytes, type) {
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  return new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP'
}
function matchesValidator(request, response) {
  const tag = request.headers.get('If-None-Match')
  if (tag) return tag.length <= 1024 && tag.split(',').some(value => value.trim() === '*' || value.trim().replace(/^W\//, '') === response.headers.get('ETag')?.replace(/^W\//, ''))
  const since = Date.parse(request.headers.get('If-Modified-Since') || ''), modified = Date.parse(response.headers.get('Last-Modified') || '')
  return Number.isFinite(since) && Number.isFinite(modified) && modified <= since
}
function deliver(request, response, cacheStatus) {
  const headers = new Headers(response.headers)
  headers.set('X-Furfolio-Media-Cache', cacheStatus)
  if (matchesValidator(request, response)) {
    headers.delete('Content-Length'); headers.delete('Content-Type')
    return new Response(null, { status: 304, headers })
  }
  return new Response(request.method === 'HEAD' ? null : response.body, { status: 200, headers })
}
export async function handleMedia(context) {
  const { request } = context
  try {
    if (!['GET','HEAD'].includes(request.method)) {
      const response = json({ error:'method_not_allowed', message:'请求方式不支持。' }, 405)
      response.headers.set('Allow', 'GET, HEAD'); return response
    }
    const url = new URL(request.url), path = mediaPath(url.pathname)
    if (!path || url.search) throw new ApiError(404, '图片地址不存在。', 'media_not_found')
    // Cache keys and upstream requests carry no browser cookies, authorization,
    // range or content-negotiation headers. Every key represents one full image.
    const key = new Request(url.origin + MEDIA_ROUTE + path)
    let cache = globalThis.caches?.default
    try {
      const cached = await cache?.match(key)
      if (cached) return deliver(request, cached, 'HIT')
    } catch { cache = undefined }
    let upstream
    try {
      upstream = await fetch(CLOUDINARY_MEDIA_BASE + path, {
        method:'GET', redirect:'manual', signal:AbortSignal.timeout(20000),
        headers:{ Accept:'image/webp,image/png,image/jpeg', 'User-Agent':'Furfolio-Media/0.4.2' },
      })
    } catch { throw new ApiError(502, '图片加载暂时没有响应，请稍后重试。', 'media_unavailable') }
    if (upstream.status !== 200) {
      await upstream.body?.cancel()
      throw new ApiError(upstream.status === 404 ? 404 : 502, upstream.status === 404 ? '图片不存在。' : '图片暂时无法加载，请稍后重试。', 'media_unavailable')
    }
    const type = upstream.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()
    if (!IMAGE_TYPES.has(type)) { await upstream.body?.cancel(); throw invalidImage() }
    const bytes = await imageBytes(upstream)
    if (!validImage(bytes, type)) throw invalidImage()
    const headers = new Headers({
      'Content-Type':type, 'Content-Length':String(bytes.byteLength), 'Cache-Control':CACHE_CONTROL,
      'X-Content-Type-Options':'nosniff', 'Cross-Origin-Resource-Policy':'same-origin',
      'Content-Disposition':'inline',
    })
    const upstreamTag = upstream.headers.get('ETag')
    if (upstreamTag && /^(?:W\/)?"[^"\r\n]{1,200}"$/.test(upstreamTag)) headers.set('ETag', upstreamTag)
    else {
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
      headers.set('ETag', '"' + [...hash].map(byte => byte.toString(16).padStart(2,'0')).join('') + '"')
    }
    const modified = upstream.headers.get('Last-Modified')
    if (modified && Number.isFinite(Date.parse(modified))) headers.set('Last-Modified', new Date(modified).toUTCString())
    const response = new Response(bytes, { status:200, headers })
    if (cache) {
      const write = cache.put(key, response.clone()).catch(() => undefined)
      if (context.waitUntil) context.waitUntil(write)
      else await write
    }
    return deliver(request, response, cache ? 'MISS' : 'BYPASS')
  } catch (error) {
    return json({ error:error instanceof ApiError ? error.code : 'media_unavailable', message:error instanceof ApiError ? error.message : '图片暂时无法加载，请稍后重试。' }, error instanceof ApiError ? error.status : 502)
  }
}
