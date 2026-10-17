import { ApiError, json } from './http.js'

const siteverify = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const unavailable = () => new ApiError(503, '注册验证暂时不可用，请保留设计并稍后重试。', 'verification_unavailable')
function settings(env) {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim(), secret = env.TURNSTILE_SECRET_KEY?.trim()
  // Never let Cloudflare's always-pass testing keys protect a real registration route.
  if (!siteKey || !secret || /^[123]x0{6}/.test(siteKey) || /^[123]x0{6}/.test(secret)) throw unavailable()
  return { siteKey, secret }
}
export function registrationConfig(env) {
  const { siteKey } = settings(env)
  return json({ siteKey })
}
export async function verifyRegistration(request, env, token) {
  const { secret } = settings(env)
  if (typeof token !== 'string' || !token.trim() || token.length > 2048) throw new ApiError(400, '请先完成注册验证。', 'verification_required')
  const params = new URLSearchParams({ secret, response: token })
  const remoteip = request.headers.get('CF-Connecting-IP')
  if (remoteip) params.set('remoteip', remoteip)
  let result
  try {
    const response = await fetch(siteverify, { method: 'POST', body: params, signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw unavailable()
    result = await response.json()
  } catch { throw unavailable() }
  if (Array.isArray(result?.['error-codes']) && result['error-codes'].some(code => ['missing-input-secret','invalid-input-secret','internal-error'].includes(code))) throw unavailable()
  if (result?.success !== true || result.action !== 'register' || result.hostname !== new URL(request.url).hostname) {
    throw new ApiError(403, '注册验证未通过或已过期，请重新验证。', 'verification_failed')
  }
}
