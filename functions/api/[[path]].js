import { ApiError, json, sameOrigin } from '../../server/http.js'
import { handleAuth } from '../../server/auth.js'
import { handleHomepages, publicHomepage } from '../../server/homepages.js'
import { handleImage } from '../../server/images.js'
import { handleMedia } from '../../server/media.js'
import { publicShowcase } from '../../server/showcase.js'

export async function onRequest(context) {
  const outgoing = []
  const input = { ...context, outgoing }
  try {
    const url = new URL(context.request.url), method = context.request.method
    if (url.pathname.startsWith('/api/media/')) return await handleMedia(input)
    if (!['GET','POST'].includes(method)) throw new ApiError(405, '请求方式不支持。', 'method_not_allowed')
    if (method === 'POST') sameOrigin(context.request)
    if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SECRET_KEY || !context.env.CLOUDINARY_API_SECRET) throw new ApiError(503, '云端尚未完成配置。', 'setup_required')
    if (url.pathname.startsWith('/api/auth/')) return await handleAuth(input, url.pathname.slice('/api/auth/'.length))
    if (url.pathname === '/api/showcase' && method === 'GET') return await publicShowcase(input)
    if (['/api/homepage','/api/publish','/api/unpublish','/api/showcase/visibility'].includes(url.pathname)) return await handleHomepages(input, url.pathname.slice(5))
    if (url.pathname === '/api/assets/upload') return await handleImage(input)
    if (url.pathname.startsWith('/api/public/') && method === 'GET') return await publicHomepage(input, decodeURIComponent(url.pathname.slice('/api/public/'.length)))
    throw new ApiError(404, '接口不存在。', 'not_found')
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.code, message: error.message }, error.status, outgoing)
    // Never return raw upstream errors, request bodies, cookies, or stack traces.
    return json({ error: 'internal_error', message: '操作未完成，请保留草稿并稍后重试。' }, 500, outgoing)
  }
}
