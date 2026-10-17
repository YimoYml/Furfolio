import { ApiError, body, json, limit, supabase, uuid } from './http.js'
import { session } from './auth.js'
import { hydrateDraft } from '../src/domain/normalize.ts'
import { referencedAssetIds } from '../src/domain/profile.ts'

export function cleanDraft(value) {
  if (!value || value.schemaVersion !== 1 || !['y2k','minimal','cyber','editorial'].includes(value.templateId)) throw new ApiError(400, '主页配置无法读取。', 'invalid_draft')
  if (!Array.isArray(value.gallery) || value.gallery.length > 8 || value.gallery.some(item => item?.atlasIndex !== undefined)) throw new ApiError(400, '请使用自己的图片，画廊最多八张。', 'invalid_gallery')
  if (value.heroAssetId) uuid(value.heroAssetId)
  if (value.aboutAssetId) uuid(value.aboutAssetId)
  if (value.interests !== undefined && (!Array.isArray(value.interests) || value.interests.length > 6)) throw new ApiError(400, '喜好最多六项。', 'invalid_interests')
  for (const item of value.interests || []) if (item?.assetId) uuid(item.assetId)
  for (const item of value.gallery) uuid(item?.assetId)
  const clean = hydrateDraft(JSON.stringify(value))
  for (const id of referencedAssetIds(clean)) uuid(id)
  for (const item of clean.interests) {
    if (item.url && !/^https?:\/\//i.test(item.url)) throw new ApiError(400, '喜好链接需以 http:// 或 https:// 开头。', 'invalid_link')
  }
  return clean
}
export function slug(value) {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(result)) throw new ApiError(400, '地址需为 3～32 位小写字母、数字或连字符，首尾为字母或数字。', 'invalid_slug')
  return result
}
export async function handleHomepages(context, action) {
  const { request, env, outgoing } = context
  const current = await session(request, env, outgoing)
  const owner = current.user.id, token = current.token
  if (action === 'homepage' && request.method === 'GET') {
    const pages = await supabase(env, `/rest/v1/homepages?owner_id=eq.${owner}&select=id,slug,draft,version,updated_at,show_in_showcase&limit=1`, { token })
    const assets = await supabase(env, '/rest/v1/assets?select=id,secure_url,bytes,width,height,format&limit=24', { token })
    const published = pages?.[0] ? await supabase(env, `/rest/v1/published_homepages?homepage_id=eq.${pages[0].id}&select=slug,version,published_at,show_in_showcase&limit=1`, { token }) : []
    return json({ homepage: pages?.[0] || null, assets, published: published?.[0] || null }, 200, outgoing)
  }
  if (request.method !== 'POST') throw new ApiError(405, '请求方式不支持。', 'method_not_allowed')
  const data = await body(request)
  if (action === 'homepage') {
    await limit(env, 'save-user', owner, 60, 3600)
    const draft = cleanDraft(data.draft), address = slug(data.slug)
    if (data.showInShowcase !== undefined && typeof data.showInShowcase !== 'boolean') throw new ApiError(400, '请选择是否允许展示在作品广场。', 'invalid_showcase_visibility')
    const visibility = data.showInShowcase === undefined ? {} : { show_in_showcase: data.showInShowcase }
    const headers = { Prefer: 'return=representation' }
    let pages
    if (data.id) {
      const id = uuid(data.id)
      if (!Number.isInteger(data.version) || data.version < 1) throw new ApiError(400, '草稿版本无效，请重新载入。', 'invalid_version')
      pages = await supabase(env, `/rest/v1/homepages?id=eq.${id}&version=eq.${data.version}&owner_id=eq.${owner}&select=id,slug,draft,version,updated_at,show_in_showcase`, { token, method: 'PATCH', headers, data: { slug: address, draft, ...visibility } })
      if (!pages?.[0]) throw new ApiError(409, '草稿已更新，请从后台重新载入后再保存。', 'draft_version_conflict')
    } else {
      pages = await supabase(env, '/rest/v1/homepages?select=id,slug,draft,version,updated_at,show_in_showcase', { token, method: 'POST', headers, data: { owner_id: owner, slug: address, draft, ...visibility } })
    }
    return json({ homepage: pages[0] }, 200, outgoing)
  }
  if (action === 'publish') {
    await limit(env, 'publish-user', owner, 20, 3600)
    const id = uuid(data.id)
    if (!Number.isInteger(data.version) || data.version < 1) throw new ApiError(400, '草稿版本无效。', 'invalid_version')
    const latest = await supabase(env, `/rest/v1/homepages?id=eq.${id}&owner_id=eq.${owner}&select=version&limit=1`, { token })
    if (!latest?.[0]) throw new ApiError(404, '没有找到你的主页。', 'homepage_not_found')
    if (latest[0].version !== data.version) throw new ApiError(409, '草稿已在其他页面更新，请先从后台重新载入。', 'draft_version_conflict')
    // The database still checks under a row lock to cover a concurrent edit.
    const published = await supabase(env, '/rest/v1/rpc/publish_homepage', { token, method: 'POST', data: { p_homepage_id: id, p_expected_version: data.version } })
    return json({ ...published, url: `${new URL(request.url).origin}/u/${published.slug}` }, 200, outgoing)
  }
  if (action === 'unpublish') {
    const id = uuid(data.id)
    // Explicit owner filter in addition to the database ownership policy.
    await supabase(env, `/rest/v1/published_homepages?homepage_id=eq.${id}&owner_id=eq.${owner}`, { token, method: 'DELETE' })
    return json({ ok: true }, 200, outgoing)
  }
  if (action === 'showcase/visibility') {
    const id = uuid(data.id)
    if (typeof data.visible !== 'boolean') throw new ApiError(400, '请选择是否允许展示在作品广场。', 'invalid_showcase_visibility')
    await limit(env, 'showcase-visibility', owner, 30, 3600)
    const homepage = await supabase(env, '/rest/v1/rpc/set_showcase_visibility', { token, method:'POST', data:{p_homepage_id:id,p_visible:data.visible} })
    return json({homepage},200,outgoing)
  }
  throw new ApiError(404, '接口不存在。', 'not_found')
}
export async function publicHomepage(context, address) {
  const pages = await supabase(context.env, `/rest/v1/published_homepages?slug=eq.${slug(address)}&select=slug,config,version,published_at&limit=1`)
  if (!pages?.[0]) throw new ApiError(404, '这个主页尚未发布，或已被撤下。', 'homepage_not_found')
  return json(pages[0])
}
