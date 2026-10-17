import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
await mkdir('work/media-qa', { recursive:true })
await mkdir('outputs/media-proxy-update', { recursive:true })
await build({ entryPoints:['functions/api/[[path]].js'], outfile:'work/media-qa/api.mjs', bundle:true, platform:'node', format:'esm' })
await build({ entryPoints:['src/domain/media.ts'], outfile:'work/media-qa/media.mjs', bundle:true, platform:'node', format:'esm' })
const { onRequest } = await import('../work/media-qa/api.mjs')
const { displayImageSource, remoteMediaMap, mediaPath, CLOUDINARY_MEDIA_BASE, MEDIA_ROUTE } = await import('../work/media-qa/media.mjs')
const owner='11111111-1111-4111-8111-111111111111', asset='22222222-2222-4222-8222-222222222222'
const path=`v1790000000/furfolio/${owner}/${asset}.png`, legacy=CLOUDINARY_MEDIA_BASE+path, route=MEDIA_ROUTE+path
const png=await readFile('work/editing-qa/landscape.png'), checks=[], calls=[], pending=[]
let entries=new Map(), writes=0, handler, cache
function reset() {
  entries=new Map(); writes=0; calls.length=0; pending.length=0
  cache={ async match(key){ return entries.get(key.url)?.clone() }, async put(key,response){ writes++; assert.equal(key.method,'GET'); assert.equal(key.headers.get('Cookie'),null); assert.equal(key.headers.get('Authorization'),null); await response.clone().arrayBuffer(); entries.set(key.url,response) } }
  globalThis.caches={default:cache}
  handler=()=>new Response(png,{headers:{'Content-Type':'image/png','ETag':'"fixture-image"','Last-Modified':'Sat, 10 Oct 2026 00:00:00 GMT','Set-Cookie':'upstream=discard','Location':'https://outside.test/','Vary':'*'}})
}
globalThis.fetch=async(url, init)=>{ calls.push({url:String(url),init}); return handler(url,init) }
async function response(method='GET', suffix=route, headers={}) {
  const result=await onRequest({env:{},request:new Request('https://furfolio.test'+suffix,{method,headers}),waitUntil:promise=>pending.push(promise)})
  await Promise.all(pending.splice(0)); return result
}
async function check(name, run){reset(); await run(); checks.push(name)}
await check('Existing versioned and unversioned upload URLs convert to stable same-origin paths',()=>{
  assert.equal(displayImageSource(legacy),route)
  assert.equal(displayImageSource(CLOUDINARY_MEDIA_BASE+`furfolio/${owner}/${asset}.webp`),MEDIA_ROUTE+`furfolio/${owner}/${asset}.webp`)
  assert.equal(displayImageSource(route),route)
  assert.equal(displayImageSource('blob:https://furfolio.test/local'),'blob:https://furfolio.test/local')
  assert.deepEqual(remoteMediaMap({one:legacy,two:route,local:'blob:local',bad:'https://foreign.test/a.png'}),{one:route,two:route})
})
await check('Account, folder, extension, transformations, redirects and encoded arbitrary URLs are rejected',async()=>{
  const invalid=[legacy.replace('/jcirypaz/','/other-cloud/'),legacy.replace('https:','http:'),legacy.replace('res.cloudinary.com','res.cloudinary.com.evil.test'),legacy.replace('res.cloudinary.com','user:pass@res.cloudinary.com'),legacy.replace('res.cloudinary.com','res.cloudinary.com:443'),legacy+'?x=1',legacy+'#hash',CLOUDINARY_MEDIA_BASE+'f_auto/'+path,CLOUDINARY_MEDIA_BASE+path.replace('.png','.svg'),CLOUDINARY_MEDIA_BASE+path.replace('furfolio/','private/'),CLOUDINARY_MEDIA_BASE+path.replace('/'+owner+'/', '/%2e%2e/'),MEDIA_ROUTE+encodeURIComponent(legacy),MEDIA_ROUTE+path+'?url=https://foreign.test',null,{},'//foreign.test/p.png']
  for(const value of invalid){assert.equal(mediaPath(value),null);assert.equal(displayImageSource(value),'')}
  for(const value of [route+'?url=https://foreign.test',MEDIA_ROUTE+encodeURIComponent(legacy),MEDIA_ROUTE+'f_auto/'+path,MEDIA_ROUTE+path.replace('.png','.svg')]){const r=await response('GET',value);assert.equal(r.status,404);assert.equal(r.headers.get('Cache-Control'),'no-store')}
  assert.equal(calls.length,0)
})
await check('GET returns actual unchanged image bytes before other cloud configuration or login',async()=>{
  const r=await response('GET',route,{Cookie:'__Host-furfolio-access=private-cookie',Authorization:'Bearer private-token',Range:'bytes=0-10',Accept:'text/html'})
  assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png)
  assert.equal(r.headers.get('Content-Type'),'image/png');assert.equal(r.headers.get('Location'),null);assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(r.headers.get('Vary'),null)
  assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(r.headers.get('Cross-Origin-Resource-Policy'),'same-origin')
  assert.equal(calls[0].url,legacy);assert.equal(calls[0].init.method,'GET');assert.equal(calls[0].init.redirect,'manual')
  const h=new Headers(calls[0].init.headers);for(const name of ['Cookie','Authorization','Range','If-None-Match'])assert.equal(h.get(name),null)
  assert.match(h.get('Accept'),/^image\//)
})
await check('Browser and edge cache headers are present; repeated requests hit cache without another origin call',async()=>{
  const first=await response();assert.equal(first.headers.get('X-Furfolio-Media-Cache'),'MISS');assert.equal(first.headers.get('Cache-Control'),'public, max-age=86400, s-maxage=604800')
  const second=await response();assert.equal(second.headers.get('X-Furfolio-Media-Cache'),'HIT');assert.deepEqual(Buffer.from(await second.arrayBuffer()),png);assert.equal(calls.length,1);assert.equal(writes,1)
})
await check('GET and HEAD share the full-image cache; HEAD sends metadata with no body',async()=>{
  const head=await response('HEAD');assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('Content-Length'),String(png.length))
  const get=await response();assert.deepEqual(Buffer.from(await get.arrayBuffer()),png);assert.equal(calls.length,1)
})
await check('ETag validators return 304, including weak and comma-separated validators, without an origin fetch',async()=>{
  await response()
  for(const tag of ['"fixture-image"','W/"fixture-image"','"another", W/"fixture-image"','*']){const r=await response('GET',route,{'If-None-Match':tag});assert.equal(r.status,304);assert.equal((await r.arrayBuffer()).byteLength,0);assert.equal(r.headers.get('Content-Length'),null)}
  assert.equal((await response('GET',route,{'If-None-Match':'"other"'})).status,200);assert.equal(calls.length,1)
})
await check('A cold conditional request stores a full response rather than a 304 cache entry',async()=>{
  assert.equal((await response('GET',route,{'If-None-Match':'"fixture-image"'})).status,304)
  const next=await response();assert.equal(next.status,200);assert.deepEqual(Buffer.from(await next.arrayBuffer()),png);assert.equal(calls.length,1)
})
await check('Last-Modified supports revalidation while If-None-Match takes precedence',async()=>{
  await response();assert.equal((await response('GET',route,{'If-Modified-Since':'Sun, 11 Oct 2026 00:00:00 GMT'})).status,304)
  assert.equal((await response('GET',route,{'If-Modified-Since':'Sun, 11 Oct 2026 00:00:00 GMT','If-None-Match':'"other"'})).status,200)
})
await check('Missing upstream ETag gets a stable content hash',async()=>{
  handler=()=>new Response(png,{headers:{'Content-Type':'image/png'}})
  const r=await response();assert.equal(r.headers.get('ETag'),'"'+createHash('sha256').update(png).digest('hex')+'"')
})
await check('Only GET and HEAD are allowed and disallowed methods never access upstream',async()=>{
  for(const method of ['POST','PUT','DELETE','OPTIONS']){const r=await response(method);assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'GET, HEAD')}
  assert.equal(calls.length,0)
})
await check('Upstream redirects are not followed or relayed to the browser',async()=>{
  handler=()=>new Response(null,{status:302,headers:{Location:'https://outside.test/private'}})
  const r=await response();assert.equal(r.status,502);assert.equal(r.headers.get('Location'),null);assert.equal(calls.length,1);assert.equal(writes,0)
})
await check('HTML, SVG and mismatched image contents are rejected and never cached',async()=>{
  for(const type of ['text/html','image/svg+xml','image/png','image/jpeg','image/webp']){handler=()=>new Response('<html>not an image</html>',{headers:{'Content-Type':type}});const r=await response();assert.equal(r.status,502);assert.equal(r.headers.get('Cache-Control'),'no-store')}
  assert.equal(writes,0)
})
await check('Oversized declared and streamed responses are bounded independently',async()=>{
  handler=()=>new Response(png,{headers:{'Content-Type':'image/png','Content-Length':String(3*1024*1024+1)}});assert.equal((await response()).status,502)
  handler=()=>new Response(new Uint8Array(3*1024*1024+1),{headers:{'Content-Type':'image/png'}});assert.equal((await response()).status,502);assert.equal(writes,0)
})
await check('Upstream missing images, failures and timeouts are not cached as images',async()=>{
  for(const status of [404,429,500]){handler=()=>new Response(null,{status});const r=await response();assert.equal(r.status,status===404?404:502);assert.equal(r.headers.get('Cache-Control'),'no-store')}
  handler=()=>{throw Error('simulated timeout')};assert.equal((await response()).status,502);assert.equal(writes,0)
})
await check('Cache unavailability does not prevent delivery of valid images',async()=>{
  cache.match=async()=>{throw Error('cache unavailable')};const r=await response();assert.equal(r.status,200);assert.equal(r.headers.get('X-Furfolio-Media-Cache'),'BYPASS');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png)
})
await check('Cache write failures do not reject the successful image response',async()=>{
  cache.put=async()=>{throw Error('cache full')};const r=await response();assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png)
})
await writeFile('outputs/media-proxy-update/contract-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),engine:'Bundled production Pages route, real PNG fixture, simulated upstream and Cache API',checks},null,2))
console.log(`Passed ${checks.length} same-origin media contract checks.`)
