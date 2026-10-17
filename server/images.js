import { ApiError, adminRpc, bytes, digest, ip, json, limit, supabase, uuid } from './http.js'
import { session } from './auth.js'
const MAX_FILE = 3 * 1024 * 1024

export async function handleImage(context) {
  const { request, env, outgoing } = context
  if (request.method !== 'POST') throw new ApiError(405, '请求方式不支持。', 'method_not_allowed')
  const current = await session(request, env, outgoing)
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.startsWith('multipart/form-data;')) throw new ApiError(415, '请上传图片文件。', 'invalid_content_type')
  // Small, bounded uploads go through the server so callers cannot reuse a signed
  // request for larger files or other resource types. No upload signature is public.
  const buffer = await bytes(request, MAX_FILE + 65536)
  let form
  try { form = await new Response(buffer, { headers: { 'Content-Type': contentType } }).formData() }
  catch { throw new ApiError(400, '图片文件无法读取。', 'invalid_file') }
  const id = uuid(form.get('assetId')), file = form.get('file')
  if (!(file instanceof Blob) || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size === 0 || file.size > MAX_FILE) throw new ApiError(400, '发布图片需为 PNG、JPG 或 WebP，压缩后小于 3 MB。', 'invalid_file')
  const magic = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = [137,80,78,71,13,10,26,10].every((value, index) => magic[index] === value)
  const jpeg = magic[0] === 255 && magic[1] === 216 && magic[2] === 255
  const webp = new TextDecoder().decode(magic.slice(0,4)) === 'RIFF' && new TextDecoder().decode(magic.slice(8,12)) === 'WEBP'
  if (!(png || jpeg || webp)) throw new ApiError(400, '这张图片的实际格式无法读取。', 'invalid_file')
  const existing = await supabase(env, `/rest/v1/assets?id=eq.${id}&select=id,secure_url,bytes,width,height,format&limit=1`, { token: current.token })
  if (existing?.[0]) return json({ asset: existing[0] }, 200, outgoing)
  await limit(env, 'upload-ip', ip(request), 40, 3600)
  const ticket = await adminRpc(env, 'reserve_upload', { p_owner: current.user.id, p_asset: id })
  if (ticket?.denied) throw new ApiError(429, '图片上传已达当前额度，请稍后再试。', 'image_quota')
  const publicId = `furfolio/${current.user.id}/${id}`
  const params = {
    allowed_formats: 'jpg,png,webp', backup: 'false', overwrite: 'false',
    public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: 'c_limit,w_2000,h_2000/q_auto:good,f_webp',
  }
  const signed = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&')
  const upload = new FormData()
  for (const [key,value] of Object.entries(params)) upload.set(key,value)
  upload.set('api_key', env.CLOUDINARY_API_KEY)
  upload.set('signature', await digest(`${signed}${env.CLOUDINARY_API_SECRET}`))
  upload.set('file', file, `${id}.${png ? 'png' : jpeg ? 'jpg' : 'webp'}`)
  let response
  try { response = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: upload, redirect: 'manual', signal: AbortSignal.timeout(45000),
  }) } catch { throw new ApiError(502, '图片上传未确认完成，草稿仍保留，可以重试。', 'image_upload_failed') }
  const metadata = await response.json().catch(() => null)
  if (!response.ok || metadata?.public_id !== publicId || metadata?.resource_type !== 'image'
    || !['webp','png','jpg'].includes(metadata?.format) || metadata?.bytes > MAX_FILE
    || ![metadata?.bytes, metadata?.width, metadata?.height].every(value => Number.isInteger(value) && value > 0)
    || metadata?.width > 2000 || metadata?.height > 2000
    || !String(metadata?.secure_url || '').startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`)) throw new ApiError(502, '云端未接受这张图片，请保留草稿并重试。', 'image_upload_rejected')
  const asset = await adminRpc(env, 'finish_upload', { p_owner: current.user.id, p_asset: id,
    p_metadata: { secure_url: metadata.secure_url, format: metadata.format, bytes: metadata.bytes, width: metadata.width, height: metadata.height } })
  return json({ asset }, 201, outgoing)
}
