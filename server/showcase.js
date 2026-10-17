import { ApiError, json, supabase } from './http.js'

const cursorError = () => new ApiError(400, '广场翻页地址无效，请重新进入作品广场。', 'invalid_cursor')
function readCursor(value) {
  if (!value) return { p_before: null, p_after_slug: null }
  try {
    if (value.length > 240 || !/^[A-Za-z0-9_-]+$/.test(value)) throw cursorError()
    const cursor = JSON.parse(atob(value.replace(/-/g,'+').replace(/_/g,'/')))
    if (typeof cursor.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.at) || !Number.isFinite(Date.parse(cursor.at))) throw cursorError()
    if (typeof cursor.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(cursor.slug)) throw cursorError()
    // Preserve PostgreSQL microseconds; converting through Date loses precision.
    return { p_before: cursor.at, p_after_slug: cursor.slug }
  } catch { throw cursorError() }
}
const color = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
export async function publicShowcase(context) {
  const input = readCursor(new URL(context.request.url).searchParams.get('cursor'))
  const rows = await supabase(context.env, '/rest/v1/rpc/list_showcase', { method:'POST', data:{...input,p_limit:25} })
  if (!Array.isArray(rows)) throw new ApiError(502, '作品广场暂时无法载入，请稍后重试。', 'invalid_showcase_response')
  const page = rows.slice(0,24), last = page.at(-1)
  const nextCursor = rows.length > 24 && last ? btoa(JSON.stringify({at:last.published_at,slug:last.slug})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') : null
  // Explicit allowlist prevents upstream config/media fields from reaching a visitor.
  const items = page.map(item => ({
    slug:item.slug, name:typeof item.name==='string'?item.name.slice(0,18):'朋友',
    englishName:typeof item.english_name==='string'?item.english_name.slice(0,24):'',
    templateId:['y2k','minimal','cyber','editorial'].includes(item.template_id)?item.template_id:'y2k',
    theme:{acid:color(item.primary_color,'#d5ec42'),blue:color(item.accent_color,'#2949dd')},
  }))
  // No public cache: opting out is reflected by the next list request immediately.
  return json({items,nextCursor})
}
