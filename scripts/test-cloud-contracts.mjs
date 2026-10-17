import { build } from 'esbuild'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
await mkdir('work/cloud-tests',{recursive:true})
await build({entryPoints:['functions/api/[[path]].js'],outfile:'work/cloud-tests/api.mjs',bundle:true,platform:'node',format:'esm'})
const {onRequest}=await import('../work/cloud-tests/api.mjs')
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test-secret',SUPABASE_PUBLISHABLE_KEY:'test-public',CLOUDINARY_API_SECRET:'test-image-secret',CLOUDINARY_CLOUD_NAME:'jcirypaz',CLOUDINARY_API_KEY:'test-image-key',TURNSTILE_SITE_KEY:'0x4AAA-synthetic-sitekey',TURNSTILE_SECRET_KEY:'synthetic-turnstile-secret'}
const checks=[],calls=[];let handler
globalThis.fetch=async(url,init={})=>{calls.push({url:String(url),init});return handler(String(url),init)}
function request(path,data,cookie='',origin='https://furfolio.test') {return {env,request:new Request('https://furfolio.test/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,Cookie:cookie,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})})}}
async function check(label,run){calls.length=0;await run();checks.push(label)}
async function multipartRequest(form) {
  // Buffer the fixture to avoid Node 24's FormData producer enqueue-after-cancel bug.
  // The production handler still enforces stream length and cancels excess input.
  const encoded=new Response(form), contentType=encoded.headers.get('Content-Type'), payload=await encoded.arrayBuffer()
  return {env,request:new Request('https://furfolio.test/api/assets/upload',{method:'POST',headers:{Origin:'https://furfolio.test',Cookie:authHeaders,'Content-Type':contentType},body:payload})}
}
const id='6e6d3c91-3ad1-46b5-a3a5-18f29d051f3e',asset='c94cffba-3a09-42eb-814d-aef2437afee0'
const ok=value=>Response.json(value),authHeaders='__Host-furfolio-access=access-test'
const draft={schemaVersion:1,templateId:'minimal',name:'小蓝',englishName:'BLUE',gallery:[],contacts:[],interests:[]}
await check('POST rejects cross-origin before upstream access',async()=>{const r=await onRequest(request('auth/login',{},'','https://foreign.test'));assert.equal(r.status,403);assert.equal(calls.length,0)})
await check('anonymous session check returns no account',async()=>{handler=()=>{throw Error('unexpected_fetch')};const r=await onRequest(request('auth/me'));assert.deepEqual(await r.json(),{user:null})})
await check('unauthed save and upload cannot reach upstream',async()=>{handler=()=>{throw Error('unexpected_fetch')};assert.equal((await onRequest(request('homepage',{}))).status,401);assert.equal((await onRequest(request('assets/upload',{}))).status,401);assert.equal(calls.length,0)})
await check('invalid username rejected without account creation',async()=>{const r=await onRequest(request('auth/register',{username:'bad@name',password:'valid-password'}));assert.equal(r.status,400);assert.equal(calls.length,0)})
const verifyUrl='https://challenges.cloudflare.com/turnstile/v0/siteverify'
const register={username:'validuser',password:'valid-password',turnstileToken:'synthetic-registration-token'}
const noAccountWrites=()=>assert(calls.every(call=>!call.url.includes('/auth/v1/admin/users')&&!call.url.includes('/rest/v1/profiles')&&!call.url.includes('furfolio_set_recovery')))
await check('registration config exposes only the public site key and is not cached',async()=>{
 handler=()=>{throw Error('unexpected_fetch')};const r=await onRequest(request('auth/registration-config'));assert.equal(r.status,200);assert.deepEqual(await r.json(),{siteKey:env.TURNSTILE_SITE_KEY});assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(calls.length,0)
})
await check('missing or malformed verification cannot reach any upstream',async()=>{
 handler=()=>{throw Error('unexpected_fetch')}
 for(const token of [undefined,null,42,'','   ','x'.repeat(2049)]){const r=await onRequest(request('auth/register',{...register,turnstileToken:token}));assert.equal(r.status,400);assert.equal((await r.json()).error,'verification_required')}
 assert.equal(calls.length,0)
})
await check('unconfigured protection fails closed and never exposes a secret',async()=>{
 handler=url=>url.includes('furfolio_consume_limit')?ok(true):ok({success:true,hostname:'furfolio.test',action:'register'})
 for(const key of ['TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY']){const original=env[key];delete env[key];try{assert.equal((await onRequest(request('auth/registration-config'))).status,503);const r=await onRequest(request('auth/register',register));assert.equal(r.status,503);assert.equal((await r.json()).error,'verification_unavailable');noAccountWrites()}finally{env[key]=original}}
})
await check('Cloudflare always-pass testing keys are rejected as production protection',async()=>{
 const saved=env.TURNSTILE_SITE_KEY;env.TURNSTILE_SITE_KEY='1x00000000000000000000AA';try{assert.equal((await onRequest(request('auth/registration-config'))).status,503)}finally{env.TURNSTILE_SITE_KEY=saved}
})
await check('failed and replayed verification never create accounts or consume the global signup quota',async()=>{
 for(const code of ['invalid-input-response','timeout-or-duplicate']){calls.length=0;handler=url=>url===verifyUrl?ok({success:false,'error-codes':[code]}):ok(true);const r=await onRequest(request('auth/register',register));assert.equal(r.status,403);assert.equal((await r.json()).error,'verification_failed');noAccountWrites();assert(calls.every(call=>!call.init.body?.includes?.('register-global')))}
})
await check('successful token from a different hostname or action is rejected',async()=>{
 for(const result of [{success:true,hostname:'foreign.test',action:'register'},{success:true,hostname:'furfolio.test',action:'login'},{success:'true',hostname:'furfolio.test',action:'register'}]){calls.length=0;handler=url=>url===verifyUrl?ok(result):ok(true);assert.equal((await onRequest(request('auth/register',register))).status,403);noAccountWrites()}
})
await check('verification service outage fails closed with a safe retryable message',async()=>{
 for(const fail of [()=>{throw Error('sensitive-secret-upstream-error')},()=>Response.json({secret:'private'},{status:502}),()=>new Response('bad-json')]){calls.length=0;handler=url=>url===verifyUrl?fail():ok(true);const r=await onRequest(request('auth/register',register));assert.equal(r.status,503);assert.equal((await r.json()).error,'verification_unavailable');noAccountWrites()}
})
await check('invalid verification secret or provider internal error remains retryable and cannot register',async()=>{
 for(const code of ['missing-input-secret','invalid-input-secret','internal-error']){calls.length=0;handler=url=>url===verifyUrl?ok({success:false,'error-codes':[code]}):ok(true);const r=await onRequest(request('auth/register',register));assert.equal(r.status,503);assert.equal((await r.json()).error,'verification_unavailable');noAccountWrites()}
})
await check('cross-origin registration is rejected before Turnstile access',async()=>{
 handler=()=>{throw Error('unexpected_fetch')};assert.equal((await onRequest(request('auth/register',register,'','https://foreign.test'))).status,403);assert.equal(calls.length,0)
})
await check('registration uses canonical username, confirmed internal identity and secure cookies',async()=>{
 handler=(url,init)=>{
  if(url===verifyUrl){assert.equal(init.method,'POST');assert.equal(init.body.get('secret'),env.TURNSTILE_SECRET_KEY);assert.equal(init.body.get('response'),'synthetic-registration-token');assert.deepEqual([...init.body.keys()],['secret','response']);return ok({success:true,hostname:'furfolio.test',action:'register'})}
  const body=init.body?JSON.parse(init.body):null
  if(url.includes('furfolio_consume_limit'))return ok(true)
  if(url.endsWith('/auth/v1/admin/users')){assert.equal(init.headers.apikey,'test-secret');assert.equal(body.user_metadata.username,'小蓝abc');assert.equal(body.email_confirm,true);assert.match(body.email,/^[a-f0-9]{64}@accounts\.furfolio\.invalid$/);return ok({id})}
  if(url.endsWith('/rest/v1/profiles')){assert.equal(body.id,id);return ok(null)}
  if(url.includes('furfolio_set_recovery')){assert.match(body.p_hash,/^[a-f0-9]{64}$/);return ok(null)}
  if(url.includes('grant_type=password'))return ok({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,user:{id}})
  throw Error('unexpected_fetch')
 };const r=await onRequest(request('auth/register',{username:' 小蓝ＡＢＣ ',password:'valid-password',turnstileToken:register.turnstileToken}));assert.equal(r.status,201);const result=await r.json();assert.equal(result.user.username,'小蓝abc');assert.ok(result.recoveryCode.startsWith('FUR-'));assert.equal(result.access_token,undefined);assert(calls.findIndex(call=>call.url===verifyUrl)<calls.findIndex(call=>call.url.endsWith('/auth/v1/admin/users')));for(const value of r.headers.getSetCookie()){assert.match(value,/HttpOnly/);assert.match(value,/SameSite=Strict/);assert.match(value,/Secure/)}
})
await check('invalid login is generic and upstream bodies stay private',async()=>{
 handler=url=>url.includes('furfolio_consume_limit')?ok(true):Response.json({error_code:'invalid_credentials',msg:'sensitive upstream detail'},{status:400})
 const r=await onRequest(request('auth/login',{username:'wronguser',password:'wrong-password'}));assert.equal(r.status,401);assert.equal((await r.json()).error,'invalid_credentials')
})
await check('upstream outage does not pretend the password is wrong',async()=>{handler=url=>url.includes('furfolio_consume_limit')?ok(true):Response.json({message:'sensitive detail'},{status:500});const r=await onRequest(request('auth/login',{username:'validuser',password:'valid-password'}));assert.equal(r.status,502);assert.equal((await r.json()).error,'upstream_rejected')})
await check('direct Auth identities cannot provision profiles through login',async()=>{handler=url=>url.includes('furfolio_consume_limit')?ok(true):url.includes('grant_type=password')?ok({access_token:'synthetic-access',refresh_token:'synthetic-refresh',user:{id}}):ok([]);const r=await onRequest(request('auth/login',{username:'validuser',password:'valid-password'}));assert.equal(r.status,409);assert.ok(calls.every(call=>!(call.url.endsWith('/rest/v1/profiles')&&call.init.method==='POST')))})
await check('transient refresh outage does not clear cookies',async()=>{handler=()=>Response.json({},{status:500});const r=await onRequest(request('auth/me',undefined,'__Host-furfolio-refresh=refresh-test'));assert.equal(r.status,502);assert.equal(r.headers.getSetCookie().length,0)})
await check('private reads always carry user JWT and public key',async()=>{handler=(url,init)=>{assert.equal(init.headers.apikey,'test-public');assert.equal(init.headers.Authorization,'Bearer access-test');return ok(url.endsWith('/auth/v1/user')?{id}:[])};const r=await onRequest(request('homepage',undefined,authHeaders));assert.equal(r.status,200);assert.equal((await r.json()).homepage,null)})
await check('public view uses anonymous key and returns only snapshot columns',async()=>{handler=(url,init)=>{assert.equal(init.headers.apikey,'test-public');assert.equal(init.headers.Authorization,undefined);assert.ok(url.includes('select=slug,config,version,published_at'));return ok([{slug:'blue',config:{schemaVersion:1,profile:draft,media:{}}}])};const r=await onRequest(request('public/blue'));assert.equal(r.status,200);assert.equal((await r.json()).config.profile.name,'小蓝')})
await check('unknown public page returns 404',async()=>{handler=()=>ok([]);assert.equal((await onRequest(request('public/missing'))).status,404)})
await check('demo gallery cannot be saved as a user homepage',async()=>{handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true);const r=await onRequest(request('homepage',{slug:'blue',draft:{...draft,gallery:[{id:'demo',atlasIndex:1}]}},authHeaders));assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_gallery')})
await check('independent About and interest media, editable copy and mobile framing survive server normalization',async()=>{
 handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);const body=JSON.parse(init.body);assert.equal(body.draft.aboutAssetId,asset);assert.deepEqual(body.draft.aboutFrame,{x:32,y:74,zoom:1.8,fit:'cover',aspect:'square'});assert.equal(body.draft.interests[0].assetId,asset);assert.equal(body.draft.layout.heroMobileOffset,12);assert.equal(body.draft.heroFrames.mobile.zoom,2);assert.equal(body.draft.copy.heroNote.font,'wenkai');assert.equal(body.draft.copy.heroNote.text,'我的颜色');return ok([body])}
 const value={...draft,aboutAssetId:asset,aboutFrame:{x:32,y:74,zoom:1.8,fit:'cover',aspect:'square'},interests:[{id:'music',name:'音乐',description:'喜欢',assetId:asset}],layout:{heroMobileOffset:12},heroFrames:{mobile:{zoom:2,x:30,y:60,fit:'cover',aspect:'square'}},copy:{heroNote:{text:'我的颜色',font:'wenkai'}}}
 const r=await onRequest(request('homepage',{slug:'blue',draft:value},authHeaders));assert.equal(r.status,200)
})
await check('malformed section image references are rejected before any draft write',async()=>{
 handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true)
 for(const value of [{...draft,aboutAssetId:'bad-image-id'},{...draft,interests:[{id:'music',name:'音乐',description:'喜欢',assetId:'bad-image-id'}]}]){calls.length=0;const r=await onRequest(request('homepage',{slug:'blue',draft:value},authHeaders));assert.equal(r.status,400);assert(calls.every(call=>call.init.method!=='POST'||call.url.includes('furfolio_consume_limit')))}
})
await check('QQ numbers and plain text contacts survive cloud save without URL restrictions',async()=>{
 const contacts=[{id:'qq',name:'QQ',url:' 00123456789 '},{id:'email',name:'邮箱',url:'fox@example.test'},{id:'user',name:'用户名',url:'@little_fox'},{id:'web',name:'网站',url:'https://example.test/'},{id:'text',name:'纯文本',url:'javascript:alert(1)'}]
 handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);const body=JSON.parse(init.body);assert.deepEqual(body.draft.contacts,contacts.map(item=>({...item,url:item.url.trim()})));return ok([body])}
 const r=await onRequest(request('homepage',{slug:'blue',draft:{...draft,contacts}},authHeaders));assert.equal(r.status,200);assert.equal((await r.json()).homepage.draft.contacts[0].url,'00123456789')
})
await check('relaxing contacts does not turn interest links into executable or unsupported URLs',async()=>{
 handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true)
 const r=await onRequest(request('homepage',{slug:'blue',draft:{...draft,contacts:[{id:'qq',name:'QQ',url:'123456789'}],interests:[{id:'music',name:'音乐',description:'歌单',url:'javascript:alert(1)'}]}},authHeaders));assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_link');assert(calls.every(call=>!call.url.includes('/rest/v1/homepages')))
})
await check('optimistic save requires owned ID and expected version',async()=>{handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);assert.ok(url.includes(`owner_id=eq.${id}`));assert.ok(url.includes('version=eq.4'));assert.equal(init.headers.apikey,'test-public');assert.equal(init.method,'PATCH');return ok([])};const r=await onRequest(request('homepage',{id,version:4,slug:'blue',draft},authHeaders));assert.equal(r.status,409)})
await check('publish executes ownership RPC as user, never service admin',async()=>{handler=(url,init)=>{if(url.endsWith('/auth/v1/user'))return ok({id});if(url.includes('furfolio_consume_limit'))return ok(true);if(url.includes('/rest/v1/homepages?'))return ok([{version:2}]);assert.ok(url.endsWith('/rpc/publish_homepage'));assert.equal(init.headers.apikey,'test-public');assert.equal(init.headers.Authorization,'Bearer access-test');assert.deepEqual(JSON.parse(init.body),{p_homepage_id:id,p_expected_version:2});return ok({slug:'blue',version:2})};const r=await onRequest(request('publish',{id,version:2},authHeaders));assert.equal((await r.json()).url,'https://furfolio.test/u/blue')})
await check('stale version is rejected before calling publish RPC',async()=>{handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:url.includes('furfolio_consume_limit')?true:[{version:3}]);const r=await onRequest(request('publish',{id,version:2},authHeaders));assert.equal(r.status,409);assert.ok(calls.every(call=>!call.url.endsWith('/rpc/publish_homepage')))})
await check('oversized actual stream is rejected independently of content-length',async()=>{handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true);const r=await onRequest(request('homepage',{padding:'x'.repeat(300001)},authHeaders));assert.equal(r.status,413)})
await check('invalid image magic never reaches Cloudinary',async()=>{handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true);const form=new FormData();form.set('assetId',asset);form.set('file',new Blob(['plain text'],{type:'image/png'}),'fake.png');const r=await onRequest(await multipartRequest(form));assert.equal(r.status,400);assert.ok(calls.every(call=>!call.url.includes('cloudinary')))})
await check('over 3MB upload rejected before parsing or signing',async()=>{handler=url=>ok(url.endsWith('/auth/v1/user')?{id}:true);const form=new FormData();form.set('assetId',asset);form.set('file',new Blob([new Uint8Array(3*1024*1024+65537)],{type:'image/png'}),'large.png');const r=await onRequest(await multipartRequest(form));assert.equal(r.status,413);assert.ok(calls.every(call=>!call.url.includes('cloudinary')))})
const report={checkedAt:new Date().toISOString(),backend:'Bundled Pages Functions, mocked upstream services',checks}
await writeFile('outputs/cloud-setup/api-contract-verification.json',JSON.stringify(report,null,2))
await mkdir('outputs/turnstile-update',{recursive:true})
await writeFile('outputs/turnstile-update/api-contract-verification.json',JSON.stringify(report,null,2))
console.log(`Passed ${checks.length} cloud API contract checks.`)
