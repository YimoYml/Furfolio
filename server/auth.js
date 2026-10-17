import { ApiError, adminRpc, body, digest, ip, json, limit, supabase } from './http.js'
import { registrationConfig, verifyRegistration } from './turnstile.js'

export function username(value) {
  const normalized = typeof value === 'string' ? value.normalize('NFKC').trim().toLowerCase() : ''
  if (!/^[a-z0-9_\u3400-\u9fff]{3,24}$/.test(normalized)) throw new ApiError(400, '用户名需为 3～24 位中文、字母、数字或下划线。', 'invalid_username')
  return normalized
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 8 || new TextEncoder().encode(value).length > 72) throw new ApiError(400, '密码至少 8 位；若字符过多，请适当缩短。', 'invalid_password')
  return value
}
export const identity = async name => `${await digest(name)}@accounts.furfolio.invalid`
function cookieNames(request) { return new URL(request.url).protocol === 'https:' ? ['__Host-furfolio-access', '__Host-furfolio-refresh'] : ['furfolio-access', 'furfolio-refresh'] }
function cookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(item => {
    const at = item.indexOf('='); return [item.slice(0, at).trim(), item.slice(at + 1)]
  }))
}
function cookie(request, name, value, lifetime) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${lifetime}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`
}
export function clearSession(request, outgoing) { for (const name of cookieNames(request)) outgoing.push(cookie(request, name, '', 0)) }
export function setSession(request, outgoing, data) {
  if (!data?.access_token || !data?.refresh_token) throw new ApiError(502, '登录会话未能建立，请重试。', 'session_failed')
  const names = cookieNames(request)
  outgoing.push(cookie(request, names[0], data.access_token, Math.min(3600, data.expires_in || 3600)))
  outgoing.push(cookie(request, names[1], data.refresh_token, 30 * 86400))
}
export async function session(request, env, outgoing, required = true) {
  const saved = cookies(request), names = cookieNames(request)
  let token = saved[names[0]]
  if (token) {
    try { return { user: await supabase(env, '/auth/v1/user', { token }), token } }
    catch (error) { if (error.status !== 401) throw error }
  }
  if (saved[names[1]]) {
    try {
      const data = await supabase(env, '/auth/v1/token?grant_type=refresh_token', { method: 'POST', data: { refresh_token: saved[names[1]] } })
      setSession(request, outgoing, data)
      return { user: data.user, token: data.access_token }
    } catch (error) {
      if (!['unauthorized', 'auth_rejected'].includes(error.code)) throw error
      clearSession(request, outgoing)
    }
  }
  if (required) throw new ApiError(401, '请先登录，当前设计会保留。', 'unauthorized')
  return null
}
export async function account(env, current) {
  const records = await supabase(env, `/rest/v1/profiles?id=eq.${current.user.id}&select=id,username&limit=1`, { token: current.token })
  if (!records?.[0]) throw new ApiError(409, '账号初始化未完成，请重新登录。', 'account_incomplete')
  return records[0]
}
export function recoveryCode() {
  const value = [...crypto.getRandomValues(new Uint8Array(20))].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `FUR-${value.match(/.{4}/g).join('-')}`
}
const recoveryHash = code => digest(String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase())
async function signIn(env, email, value) {
  try { return await supabase(env, '/auth/v1/token?grant_type=password', { method: 'POST', data: { email, password: value } }) }
  catch (error) { if (['auth_rejected', 'unauthorized'].includes(error.code)) throw new ApiError(401, '用户名或密码不正确。', 'invalid_credentials'); throw error }
}
export async function handleAuth(context, action) {
  const { request, env, outgoing } = context
  if (action === 'registration-config' && request.method === 'GET') return registrationConfig(env)
  if (action === 'me' && request.method === 'GET') {
    const current = await session(request, env, outgoing, false)
    return json({ user: current ? await account(env, current) : null }, 200, outgoing)
  }
  if (request.method !== 'POST') throw new ApiError(405, '请求方式不支持。', 'method_not_allowed')
  if (action === 'logout') {
    const current = await session(request, env, outgoing, false)
    if (current) await supabase(env, '/auth/v1/logout?scope=local', { token: current.token, method: 'POST' }).catch(() => null)
    clearSession(request, outgoing)
    return json({ ok: true }, 200, outgoing)
  }
  const data = await body(request, 8192)
  if (action === 'recovery-code') {
    const current = await session(request, env, outgoing)
    await limit(env, 'recovery-new', current.user.id, 5, 3600)
    // Require the current password before invalidating an existing recovery code.
    const proof = await signIn(env, current.user.email, password(data.password))
    await supabase(env, '/auth/v1/logout?scope=local', { token: proof.access_token, method: 'POST' }).catch(() => null)
    const code = recoveryCode()
    await adminRpc(env, 'set_recovery', { p_owner: current.user.id, p_hash: await recoveryHash(code) })
    return json({ recoveryCode: code }, 200, outgoing)
  }
  const name = username(data.username)
  if (action === 'register') {
    const pass = password(data.password)
    if (typeof data.turnstileToken !== 'string' || !data.turnstileToken.trim() || data.turnstileToken.length > 2048) throw new ApiError(400, '请先完成注册验证。', 'verification_required')
    await limit(env, 'register-client-ip', ip(request), 5, 3600)
    await verifyRegistration(request, env, data.turnstileToken)
    await limit(env, 'register-global', 'all', 100, 86400)
    const email = await identity(name)
    let created
    try {
      const result = await supabase(env, '/auth/v1/admin/users', { admin: true, method: 'POST', data: { email, password: pass, email_confirm: true, user_metadata: { username: name } } })
      created = result.user || result
    } catch (error) {
      if (error.code === 'auth_rejected') throw new ApiError(409, '这个用户名已被使用，或注册暂时无法完成。', 'registration_rejected')
      throw error
    }
    const code = recoveryCode()
    try {
      await supabase(env, '/rest/v1/profiles', { admin: true, method: 'POST', data: { id: created.id, username: name } })
      await adminRpc(env, 'set_recovery', { p_owner: created.id, p_hash: await recoveryHash(code) })
    } catch (error) {
      // Compensate only for the account just created by this failed registration.
      await supabase(env, `/auth/v1/admin/users/${created.id}`, { admin: true, method: 'DELETE' }).catch(() => null)
      throw error
    }
    const login = await signIn(env, email, pass)
    setSession(request, outgoing, login)
    return json({ user: { id: created.id, username: name }, recoveryCode: code }, 201, outgoing)
  }
  if (action === 'login') {
    const pass = password(data.password)
    await limit(env, 'login-ip', ip(request), 30, 900)
    await limit(env, 'login-name', name, 20, 900)
    const login = await signIn(env, await identity(name), pass)
    const current = { user: login.user, token: login.access_token }
    // Only the rate-limited registration route provisions application accounts.
    // Direct Supabase Auth signups cannot bypass it by repairing a profile here.
    const profile = await account(env, current)
    setSession(request, outgoing, login)
    return json({ user: profile }, 200, outgoing)
  }
  if (action === 'recover') {
    const pass = password(data.newPassword)
    await limit(env, 'recover-ip', ip(request), 5, 3600)
    await limit(env, 'recover-name', name, 5, 3600)
    const claim = crypto.randomUUID()
    const owner = await adminRpc(env, 'claim_recovery', { p_username: name, p_hash: await recoveryHash(data.recoveryCode), p_claim: claim })
    if (!owner) throw new ApiError(400, '用户名或恢复码不正确，或恢复码已使用。', 'invalid_recovery')
    try { await supabase(env, `/auth/v1/admin/users/${owner}`, { admin: true, method: 'PUT', data: { password: pass } }) }
    catch (error) { await adminRpc(env, 'release_recovery', { p_owner: owner, p_claim: claim }).catch(() => null); throw error }
    try {
      // Revoke refresh sessions before rotating the code returned to the user.
      const login = await signIn(env, await identity(name), pass)
      await supabase(env, '/auth/v1/logout?scope=global', { token: login.access_token, method: 'POST' })
      const code = recoveryCode()
      const completed = await adminRpc(env, 'finish_recovery', { p_owner: owner, p_claim: claim, p_new_hash: await recoveryHash(code) })
      if (!completed) throw new Error('claim_lost')
      clearSession(request, outgoing)
      return json({ ok: true, recoveryCode: code }, 200, outgoing)
    } catch {
      clearSession(request, outgoing)
      throw new ApiError(409, '密码已修改，请用新密码登录后重新生成恢复码。', 'recovery_finish_failed')
    }
  }
  throw new ApiError(404, '接口不存在。', 'not_found')
}
