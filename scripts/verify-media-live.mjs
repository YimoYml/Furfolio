import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'
await mkdir('work/media-qa',{recursive:true})
await mkdir('outputs/media-proxy-update',{recursive:true})
await build({entryPoints:['src/domain/media.ts'],outfile:'work/media-qa/media.mjs',bundle:true,platform:'node',format:'esm'})
const { mediaPath, MEDIA_ROUTE }=await import('../work/media-qa/media.mjs')
const config=await readFile('wrangler.toml','utf8')
const supabase=config.match(/^SUPABASE_URL = "([^"]+)"/m)[1], publicKey=config.match(/^SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/m)[1]
const origin='https://furfolio.pages.dev'
const listing=await fetch(supabase+'/rest/v1/published_homepages?select=slug,config&order=published_at.desc&limit=1',{headers:{apikey:publicKey},signal:AbortSignal.timeout(25000)})
assert.equal(listing.status,200,'Could not read the anonymous published snapshot')
const pages=await listing.json(), page=pages[0]
assert(page?.config?.media && page.slug,'No published homepage with media is available for verification')
const images=[...new Set(Object.values(page.config.media))].filter(url=>mediaPath(url))
assert(images.length,'No supported existing images found')
await writeFile('work/media-qa/live-target.json',JSON.stringify({slug:page.slug,profile:page.config.profile,media:page.config.media},null,2))
if(process.argv.includes('--prepare')){console.log(JSON.stringify({publicHomepage:origin+'/u/'+page.slug,supportedImages:images.length,prepared:true}));process.exit(0)}
const checks=[], sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const get=(path,options={})=>fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(25000),...options})
for(const original of images.slice(0,3)){
  const path=MEDIA_ROUTE+mediaPath(original)
  const first=await get(path)
  assert.equal(first.status,200);assert.match(first.headers.get('Content-Type'),/^image\/(png|jpeg|webp)$/)
  assert.equal(first.headers.get('Location'),null);assert.equal(first.headers.get('Set-Cookie'),null)
  assert.equal(first.headers.get('Cache-Control'),'public, max-age=86400, s-maxage=604800')
  const payload=Buffer.from(await first.arrayBuffer());assert(payload.length>0 && payload.length<=3*1024*1024)
  const direct=await fetch(original,{redirect:'manual',signal:AbortSignal.timeout(25000)});assert.equal(direct.status,200)
  assert.equal(sha(payload),sha(Buffer.from(await direct.arrayBuffer())))
  let hit, hitBytes
  for(let attempt=0;attempt<3;attempt++){hit=await get(path);assert.equal(hit.status,200);hitBytes=Buffer.from(await hit.arrayBuffer());if(hit.headers.get('X-Furfolio-Media-Cache')==='HIT')break}
  assert.equal(hit.headers.get('X-Furfolio-Media-Cache'),'HIT','Edge cache did not produce a HIT on repeated requests')
  assert.equal(sha(hitBytes),sha(payload))
  const head=await get(path,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('Content-Length'),String(payload.length))
  const conditional=await get(path,{headers:{'If-None-Match':hit.headers.get('ETag')}});assert.equal(conditional.status,304);assert.equal((await conditional.arrayBuffer()).byteLength,0)
  checks.push({path,status:200,contentType:first.headers.get('Content-Type'),bytes:payload.length,sha256:sha(payload),matchesOriginal:true,edgeCacheHit:true,head:true,etag304:true,ray:hit.headers.get('CF-Ray')})
}
for(const path of ['/api/media/https%3A%2F%2Fexample.com%2Fimage.png','/api/media/other-account/image.png',MEDIA_ROUTE+mediaPath(images[0])+'?url=https://example.com'])assert.equal((await get(path)).status,404)
assert.equal((await get(MEDIA_ROUTE+mediaPath(images[0]),{method:'POST'})).status,405)
const homepage=await get('/u/'+page.slug);assert.equal(homepage.status,200);assert(!homepage.headers.get('Content-Security-Policy').includes('res.cloudinary.com'))
const report={checkedAt:new Date().toISOString(),origin,publicHomepage:origin+'/u/'+page.slug,existingImageCount:images.length,checks,invalidProxyRequestsRejected:3,postRejected:true,onlySameOriginImageCsp:true,limitation:'Real Pages and Cloudinary responses over the configured command-line proxy; not the user domestic no-proxy network acceptance test'}
await writeFile('outputs/media-proxy-update/live-verification.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({publicHomepage:report.publicHomepage,existingImageCount:images.length,realImageChecks:checks.length,edgeCacheHit:true,actualImageBytes:true,etag304:true,invalidProxyRequestsRejected:3},null,2))
