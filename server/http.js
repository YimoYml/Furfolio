export class ApiError extends Error {
  constructor(status, message, code = 'request_failed') { super(message); this.status = status; this.code = code }
}
export function json(data, status = 200, cookies = []) {
  const response = Response.json(data, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } })
  for (const cookie of cookies) response.headers.append('Set-Cookie', cookie)
  return response
}
export function sameOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new ApiError(403, '请从 Furfolio 页面提交。', 'origin_rejected')
}
export async function bytes(request, limit) {
  if (Number(request.headers.get('Content-Length') || 0) > limit) throw new ApiError(413, '提交内容过大。', 'too_large')
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, '提交内容为空。', 'empty_body')
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); throw new ApiError(413, '提交内容过大。', 'too_large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}
export async function body(request, limit = 300000) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError(415, '请提交有效的页面内容。', 'invalid_content_type')
  try { return JSON.parse(new TextDecoder().decode(await bytes(request, limit))) }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, '提交内容无法读取。', 'invalid_json') }
}
export async function digest(value, algorithm = 'SHA-256') {
  const data = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value))
  return [...new Uint8Array(data)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new ApiError(400, '图片或主页标识无效。', 'invalid_id')
  return value.toLowerCase()
}
const databaseErrors = {
  draft_version_conflict: [409, '草稿已在其他页面更新，请先从后台重新载入。'],
  homepage_not_found: [404, '没有找到你的主页。'],
  images_not_uploaded_or_not_owned: [400, '部分图片尚未完成上传，请保留草稿并重试。'],
  demo_images_not_publishable: [400, '示例图片不能发布，请使用自己的图片。'],
  account_image_quota: [429, '当前账号图片额度已满（最多 24 张、32 MB），暂时无法继续上传新图片。'],
  upload_ticket_expired: [409, '此次图片上传已过期，请重新选择这张图片。'],
  asset_not_owned: [403, '无法操作这张图片。'],
}
export async function supabase(env, path, { token, admin = false, method = 'GET', data, headers = {} } = {}) {
  let response
  try {
    response = await fetch(`${env.SUPABASE_URL}${path}`, {
      method, redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: { apikey: admin ? env.SUPABASE_SECRET_KEY : env.SUPABASE_PUBLISHABLE_KEY,
        'User-Agent': 'Furfolio-Server/0.3', ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    })
  } catch { throw new ApiError(502, '云端暂时没有响应，草稿仍保存在此浏览器。', 'upstream_unavailable') }
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    if (path.startsWith('/auth/') && [400,422].includes(response.status)) {
      const error = new ApiError(400, '账号操作未完成，请检查输入。', 'auth_rejected')
      error.upstreamStatus = response.status
      error.authCode = result?.error_code || result?.code
      throw error
    }
    const message = String(result?.message || result?.msg || result?.error_description || '')
    for (const [code, [status, text]] of Object.entries(databaseErrors)) if (message.includes(code)) throw new ApiError(status, text, code)
    if (result?.code === '23505') throw new ApiError(409, '这个用户名或主页地址已被使用。', 'already_exists')
    if (result?.code === 'PGRST202' || result?.code === 'PGRST205') throw new ApiError(503, '云端正在完成初始化，请稍后再试。', 'setup_required')
    if (response.status === 401 || response.status === 403) throw new ApiError(401, '登录已过期，请重新登录，设计会保留。', 'unauthorized')
    throw new ApiError(response.status === 429 ? 429 : 502, response.status === 429 ? '操作频繁，请稍后再试。' : '云端操作未完成，请保留草稿并重试。', 'upstream_rejected')
  }
  return result
}
export const adminRpc = (env, name, data) => supabase(env, `/rest/v1/rpc/furfolio_${name}`, { admin: true, method: 'POST', data })
export async function limit(env, scope, key, maximum, seconds) {
  const allowed = await adminRpc(env, 'consume_limit', { p_key: `${scope}:${await digest(key)}`, p_limit: maximum, p_seconds: seconds })
  if (!allowed) throw new ApiError(429, '操作频繁，请稍后再试。', 'rate_limited')
}
export function ip(request) { return request.headers.get('CF-Connecting-IP') || 'local-development' }
