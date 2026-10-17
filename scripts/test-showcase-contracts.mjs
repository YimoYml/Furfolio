import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('work/showcase-tests',{recursive:true})
await mkdir('outputs/showcase-update',{recursive:true})
await build({entryPoints:['functions/api/[[path]].js'],outfile:'work/showcase-tests/api.mjs',bundle:true,platform:'node',format:'esm'})
const {onRequest}=await import('../work/showcase-tests/api.mjs')
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test-secret',SUPABASE_PUBLISHABLE_KEY:'test-public',CLOUDINARY_API_SECRET:'test-image-secret',CLOUDINARY_CLOUD_NAME:'jcirypaz',CLOUDINARY_API_KEY:'test-image-key'}
const id='6e6d3c91-3ad1-46b5-a3a5-18f29d051f3e',cookie='__Host-furfolio-access=access-test'
const checks=[],calls=[];let handler
globalThis.fetch=async(url,init={})=>{calls.push({url:String(url),init});return handler(String(url),init)}
const ok=value=>Response.json(value)
function request(path,data,session='',origin='https://furfolio.test') {return {env,request:new Request('https://furfolio.test/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,Cookie:session,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})})}}
async function check(label,run){calls.length=0;await run();checks.push(label)}
const rows=Array.from({length:25},(_,i)=>({slug:'entry-'+String(i).padStart(3,'0'),name:'朋友'+i,english_name:'FRIEND'+i,template_id:'y2k',primary_color:'#d5ec42',accent_color:'#2949dd',published_at:'2026-10-11T00:00:00.123456+00:00',config:{media:{secret:'private-image-url'}},owner_id:id,bio:'PRIVATE',contacts:['QQ']}))
let cursor
await check('anonymous list uses one bounded anonymous RPC and an explicit metadata allowlist',async()=>{
 handler=(url,init)=>{assert.equal(url,'https://test.supabase.co/rest/v1/rpc/list_showcase');assert.equal(init.headers.apikey,'test-public');assert.equal(init.headers.Authorization,undefined);assert.deepEqual(JSON.parse(init.body),{p_before:null,p_after_slug:null,p_limit:25});return ok(rows)}
 const response=await onRequest(request('showcase'));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');const body=await response.json();assert.equal(body.items.length,24);cursor=body.nextCursor;assert(cursor);assert.deepEqual(Object.keys(body.items[0]).sort(),['slug','name','englishName','templateId','theme'].sort());assert.deepEqual(body.items[0].theme,{acid:'#d5ec42',blue:'#2949dd'});assert(!JSON.stringify(body).includes('private-image-url'));assert(!JSON.stringify(body).includes('owner_id'));assert.equal(calls.length,1)
})
await check('cursor preserves PostgreSQL microseconds and equal-time slug ordering',async()=>{
 handler=(url,init)=>{assert.deepEqual(JSON.parse(init.body),{p_before:'2026-10-11T00:00:00.123456+00:00',p_after_slug:'entry-023',p_limit:25});return ok(rows.slice(24))}
 const body=await (await onRequest(request('showcase?cursor='+cursor))).json();assert.equal(body.items.length,1);assert.equal(body.nextCursor,null)
})
await check('malformed cursor is rejected without upstream requests',async()=>{
 handler=()=>{throw Error('unexpected_fetch')}
 for(const value of ['%%%','a'.repeat(241),Buffer.from(JSON.stringify({at:'bad',slug:'valid'})).toString('base64url'),Buffer.from(JSON.stringify({at:'2026-10-11T00:00:00Z',slug:'../bad'})).toString('base64url')]) assert.equal((await onRequest(request('showcase?cursor='+encodeURIComponent(value)))).status,400)
 assert.equal(calls.length,0)
})
await check('empty list ends pagination and hostile palette values are normalized',async()=>{
 handler=()=>ok([]);assert.deepEqual(await (await onRequest(request('showcase'))).json(),{items:[],nextCursor:null})
 handler=()=>ok([{...rows[0],primary_color:'url(https://foreign.test/image)',accent_color:'red',template_id:'unknown',name:'长'.repeat(80),english_name:'X'.repeat(80)}]);const body=await (await onRequest(request('showcase'))).json();assert.deepEqual(body.items[0].theme,{acid:'#d5ec42',blue:'#2949dd'});assert.equal(body.items[0].name.length,18);assert.equal(body.items[0].englishName.length,24);assert.equal(body.items[0].templateId,'y2k')
})
await check('malformed upstream list produces a safe retryable API error',async()=>{
 handler=()=>ok({private:'sensitive-upstream-detail'});const response=await onRequest(request('showcase'));assert.equal(response.status,502);assert(!JSON.stringify(await response.json()).includes('sensitive-upstream-detail'))
})
await check('anonymous and cross-origin visibility writes cannot reach upstream',async()=>{
 handler=()=>{throw Error('unexpected_fetch')};assert.equal((await onRequest(request('showcase/visibility',{id,visible:false}))).status,401);assert.equal((await onRequest(request('showcase/visibility',{id,visible:false},cookie,'https://foreign.test'))).status,403);assert.equal(calls.length,0)
})
await check('visibility uses user JWT and ownership RPC, never service credentials or profile writes',async()=>{
 handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);assert.equal(url,'https://test.supabase.co/rest/v1/rpc/set_showcase_visibility');assert.equal(init.headers.Authorization,'Bearer access-test');assert.equal(init.headers.apikey,'test-public');assert.deepEqual(JSON.parse(init.body),{p_homepage_id:id,p_visible:false});return ok({id,slug:'blue',version:5,updated_at:'2026-10-11T00:00:00Z',show_in_showcase:false})}
 const response=await onRequest(request('showcase/visibility',{id,visible:false},cookie));assert.equal(response.status,200);assert.equal((await response.json()).homepage.show_in_showcase,false);assert(!calls.some(call=>call.url.includes('/rest/v1/homepages?')))
})
await check('non-boolean preference is rejected before any visibility or draft write',async()=>{
 handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true)
 for(const visible of [undefined,null,0,'false',{}])assert.equal((await onRequest(request('showcase/visibility',{id,visible},cookie))).status,400)
 assert(!calls.some(call=>call.url.includes('set_showcase_visibility')))
})
const draft={schemaVersion:1,templateId:'minimal',name:'小蓝',englishName:'BLUE',gallery:[],contacts:[],interests:[]}
await check('saving an explicit opt-out persists false while old clients preserve existing preference',async()=>{
 for(const value of [false,true,undefined]){
 handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);assert.equal(init.method,'PATCH');const payload=JSON.parse(init.body);if(value===undefined)assert(!Object.hasOwn(payload,'show_in_showcase'));else assert.equal(payload.show_in_showcase,value);assert(!url.includes('published_homepages'));return ok([{id,slug:'blue',draft:payload.draft,version:6,show_in_showcase:value??false}])}
 assert.equal((await onRequest(request('homepage',{id,version:5,slug:'blue',draft,...(value===undefined?{}:{showInShowcase:value})},cookie))).status,200)
 }
 handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true);calls.length=0;assert.equal((await onRequest(request('homepage',{slug:'blue',draft,showInShowcase:'false'},cookie))).status,400);assert(!calls.some(call=>call.url.includes('/rest/v1/homepages')))
})
await writeFile('outputs/showcase-update/api-contract-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),backend:'Bundled production Pages Functions with synthetic upstream',checks},null,2))
console.log(`Passed ${checks.length} showcase API checks.`)
