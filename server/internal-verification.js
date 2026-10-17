// Fixed integration workflow. No caller-supplied user, URL, SQL, or credentials.
// Every disposable account is created and tracked in this invocation only.
import { handleAuth, session } from './auth.js'
import { handleHomepages, publicHomepage } from './homepages.js'
import { handleImage } from './images.js'
import { ApiError, digest, json, supabase } from './http.js'
import { newDraft } from '../src/domain/profile.ts'
export async function verifyCloud({ request, env }) {
  const provided = request.headers.get('X-Furfolio-Check') || ''
  if (!env.DEPLOY_CHECK_TOKEN || provided.length > 256 || await digest(provided) !== await digest(env.DEPLOY_CHECK_TOKEN)) return json({ error: 'not_found' },404)
  if (request.method !== 'POST' || request.headers.get('X-Furfolio-Run-QA') !== 'cloud-flow-v1') return json({ error: 'not_found' },404)
  const group = request.headers.get('X-Furfolio-QA-Group')
  if (!['access','publication','recovery','media'].includes(group)) return json({ error: 'not_found' },404)
  const origin = new URL(request.url).origin, accounts = [], checks = [], cleanup = []
  const testIp = 'internal-qa:' + crypto.randomUUID()
  let failed = null
  const assert = (condition, name) => { if (!condition) throw new Error(name); checks.push(name) }
  function input(path, data, cookie = '') {
    return { env, outgoing: [], request: new Request(origin + '/api/' + path, { method: data === undefined ? 'GET' : 'POST',
      headers: { Origin: origin, Cookie: cookie, 'CF-Connecting-IP': testIp, ...(data === undefined ? {} : { 'Content-Type':'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) }) }
  }
  const cookieFor = context => context.outgoing.map(value => value.split(';')[0]).join('; ')
  const result = async response => { if (!response.ok) throw new Error('unexpected_response'); return response.json() }
  async function expectDenied(run, code, label) {
    try { await run(); throw new Error('expected_denial_missing') } catch(error) {
      if (!(error instanceof ApiError) || error.code !== code) throw error
      checks.push(label)
    }
  }
  try {
    // Split fixed workflows to remain below Workers Free's per-request limits.
    for (let index=0; index<(group === 'access' ? 2 : 1); index++) {
      const name = 'qa_' + crypto.randomUUID().replaceAll('-','').slice(0,16), password = 'Qa!' + crypto.randomUUID()
      const context = input('auth/register', { username: name, password })
      const registered = await result(await handleAuth(context,'register'))
      const record = { name, password, id:registered.user.id, recovery:registered.recoveryCode, cookie:cookieFor(context), images:[] }
      accounts.push(record)
      assert(registered.user.username === name && registered.recoveryCode?.startsWith('FUR-'), 'username_password_registration_' + (index+1))
      assert(context.outgoing.every(value => value.includes('HttpOnly') && value.includes('Secure') && value.includes('SameSite=Strict')), 'secure_http_only_session_' + (index+1))
    }
    const [first, second] = accounts
    if (group === 'media') {
      const selected = []
      for (let index=0; index<2; index++) {
        const fileId = crypto.randomUUID()
        const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAARklEQVRYhe3XMREAMAxC0dqJFFzFKF7qol3ekD13IfA5k+7PORYYJwgR1hsuIxpWHGFUcbyAZCBZQGlh+Somo5pFOe1zHVwJDDxquKUMJQAAAABJRU5ErkJggg=='),value=>value.charCodeAt(0))
        const form = new FormData(); form.set('assetId',fileId); form.set('file',new Blob([png],{type:'image/png'}),'section-qa.png')
        first.images.push(`furfolio/${first.id}/${fileId}`)
        const image = await result(await handleImage({env,outgoing:[],request:new Request(origin+'/api/assets/upload',{method:'POST',headers:{Origin:origin,Cookie:first.cookie,'CF-Connecting-IP':testIp},body:form})}))
        assert(image.asset.id===fileId && image.asset.secure_url.startsWith('https://res.cloudinary.com/jcirypaz/'),'section_image_uploaded_' + (index+1))
        selected.push(image.asset)
      }
      const draft = newDraft(), address = 'qa-' + crypto.randomUUID().slice(0,8)
      draft.name='栏目测试';draft.heroAssetId=null;draft.aboutAssetId=selected[0].id;draft.interests[0].assetId=selected[1].id
      draft.copy.heroNote={text:'我的颜色\n自己的故事',font:'wenkai'};draft.typography.bio='serif'
      draft.heroFrames.mobile={...draft.heroFrames.mobile,x:27,y:61,zoom:2,fit:'cover',aspect:'square'};draft.layout.heroMobileOffset=12
      const saved = await result(await handleHomepages(input('homepage',{slug:address,draft},first.cookie),'homepage'))
      const page = saved.homepage
      assert(page.draft.aboutAssetId===selected[0].id && page.draft.interests[0].assetId===selected[1].id,'independent_section_references_saved')
      assert(page.draft.copy.heroNote.font==='wenkai' && page.draft.typography.bio==='serif' && page.draft.heroFrames.mobile.x===27 && page.draft.layout.heroMobileOffset===12,'copy_fonts_and_mobile_composition_saved')
      await handleHomepages(input('publish',{id:page.id,version:1},first.cookie),'publish')
      const visible = await result(await publicHomepage(input('public/'+address),address))
      assert(Object.keys(visible.config.media).length===2 && selected.every(asset=>visible.config.media[asset.id]===asset.secure_url),'anonymous_snapshot_contains_about_and_interest_media')
      assert(visible.config.profile.copy.heroNote.text===draft.copy.heroNote.text && visible.config.profile.heroFrames.mobile.zoom===2,'public_snapshot_retains_custom_copy_and_mobile_crop')
      const loaded = await result(await handleHomepages(input('homepage',undefined,first.cookie),'homepage'))
      assert(loaded.homepage.draft.aboutAssetId===selected[0].id && selected.every(asset=>loaded.assets.some(value=>value.id===asset.id)),'cloud_edit_restores_both_independent_images')
      draft.aboutAssetId=null
      const changed = await result(await handleHomepages(input('homepage',{id:page.id,version:1,slug:address,draft},first.cookie),'homepage'))
      await handleHomepages(input('publish',{id:page.id,version:changed.homepage.version},first.cookie),'publish')
      const updated = await result(await publicHomepage(input('public/'+address),address))
      assert(Object.keys(updated.config.media).length===1 && !updated.config.media[selected[0].id] && updated.config.media[selected[1].id]===selected[1].secure_url,'republish_excludes_removed_section_image')
    }
    if (group !== 'recovery' && group !== 'media') {
    await expectDenied(() => handleAuth(input('auth/login',{username:first.name,password:'wrong-password'}),'login'), 'invalid_credentials', 'wrong_password_denied')
    const me = await result(await handleAuth(input('auth/me',undefined,first.cookie),'me'))
    assert(me.user.id === first.id,'session_restores_account')
    let fileId = null, image = null
    if (group === 'access') {
    fileId = crypto.randomUUID()
    // A small original, synthetic PNG. No user-provided or AI-generated image.
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAARklEQVRYhe3XMREAMAxC0dqJFFzFKF7qol3ekD13IfA5k+7PORYYJwgR1hsuIxpWHGFUcbyAZCBZQGlh+Somo5pFOe1zHVwJDDxquKUMJQAAAABJRU5ErkJggg=='),value=>value.charCodeAt(0))
    const form = new FormData(); form.set('assetId',fileId); form.set('file',new Blob([png],{type:'image/png'}),'qa.png')
    const uploadContext = {env,outgoing:[],request:new Request(origin+'/api/assets/upload',{method:'POST',headers:{Origin:origin,Cookie:first.cookie,'CF-Connecting-IP':testIp},body:form})}
    // Track even an upload which succeeds upstream before metadata persistence fails.
    first.images.push(`furfolio/${first.id}/${fileId}`)
    image = await result(await handleImage(uploadContext))
    assert(image.asset.id===fileId && image.asset.secure_url.startsWith('https://res.cloudinary.com/jcirypaz/'),'cloudinary_upload_and_server_verified_metadata')
    }
    const draft = newDraft(); draft.name='云端测试'; draft.englishName='QA'; draft.templateId='minimal'; draft.heroAssetId=fileId
    const address = 'qa-' + crypto.randomUUID().slice(0,8)
    const saved = await result(await handleHomepages(input('homepage',{slug:address,draft},first.cookie),'homepage'))
    const page = saved.homepage
    assert(page.version===1 && page.draft.name==='云端测试','private_draft_saved')
    await expectDenied(() => publicHomepage(input('public/'+address),address),'homepage_not_found','draft_is_not_public')
    if (group === 'access') {
    const secondSession = await session(input('auth/me',undefined,second.cookie).request,env,[])
    const privateRows = await supabase(env,`/rest/v1/homepages?id=eq.${page.id}&select=id`,{token:secondSession.token})
    assert(privateRows.length===0,'other_account_cannot_read_private_draft')
    const alien = await supabase(env,`/rest/v1/assets?id=eq.${fileId}&select=id`,{token:secondSession.token})
    assert(alien.length===0,'other_account_cannot_read_asset_metadata')
    await expectDenied(() => handleHomepages(input('homepage',{id:page.id,version:1,slug:address,draft},second.cookie),'homepage'),'draft_version_conflict','other_account_cannot_update_private_draft')
    await expectDenied(() => handleHomepages(input('publish',{id:page.id,version:1},second.cookie),'publish'),'homepage_not_found','other_account_cannot_publish_private_draft')
    }
    const published = await result(await handleHomepages(input('publish',{id:page.id,version:1},first.cookie),'publish'))
    assert(published.slug===address,'owned_homepage_published')
    const visible = await result(await publicHomepage(input('public/'+address),address))
    assert(visible.config.profile.name==='云端测试' && (!fileId || visible.config.media[fileId]===image.asset.secure_url) && !('owner_id' in visible),'anonymous_snapshot_and_selected_media_only')
    if (group === 'publication') {
    draft.name='尚未发布的新文字'
    const changed = await result(await handleHomepages(input('homepage',{id:page.id,version:1,slug:address,draft},first.cookie),'homepage'))
    assert(changed.homepage.version===2,'published_homepage_can_be_edited')
    const previous = await result(await publicHomepage(input('public/'+address),address))
    assert(previous.config.profile.name==='云端测试','saving_draft_keeps_previous_public_snapshot')
    await expectDenied(() => handleHomepages(input('publish',{id:page.id,version:1},first.cookie),'publish'),'draft_version_conflict','stale_version_publish_denied')
    const ownedSession = await session(input('auth/me',undefined,first.cookie).request,env,[])
    await expectDenied(() => supabase(env,'/rest/v1/rpc/publish_homepage',{token:ownedSession.token,method:'POST',data:{p_homepage_id:page.id,p_expected_version:1}}),'draft_version_conflict','database_conflict_returns_without_retry_loop')
    await handleHomepages(input('publish',{id:page.id,version:2},first.cookie),'publish')
    const updated = await result(await publicHomepage(input('public/'+address),address))
    assert(updated.config.profile.name===draft.name,'republish_updates_snapshot')
    await handleHomepages(input('unpublish',{id:page.id},first.cookie),'unpublish')
    await expectDenied(() => publicHomepage(input('public/'+address),address),'homepage_not_found','unpublish_hides_public_snapshot')
    const home = await result(await handleHomepages(input('homepage',undefined,first.cookie),'homepage'))
    assert(home.homepage.id===page.id && home.homepage.draft.name===draft.name,'unpublish_preserves_editable_draft')
    }
    }
    if (group === 'recovery') {
    const newPassword='New!' + crypto.randomUUID()
    const recovered = await result(await handleAuth(input('auth/recover',{username:first.name,recoveryCode:first.recovery,newPassword}),'recover'))
    assert(recovered.recoveryCode!==first.recovery,'recovery_changes_password_and_rotates_code')
    await expectDenied(() => handleAuth(input('auth/recover',{username:first.name,recoveryCode:first.recovery,newPassword}),'recover'),'invalid_recovery','used_recovery_code_denied')
    await expectDenied(() => handleAuth(input('auth/login',{username:first.name,password:first.password}),'login'),'invalid_credentials','old_password_denied_after_recovery')
    const login = await result(await handleAuth(input('auth/login',{username:first.name,password:newPassword}),'login'))
    assert(login.user.id===first.id,'new_password_sign_in_succeeds')
    }
  } catch(error) { failed = error instanceof ApiError ? error.code : String(error?.message || 'verification_failed') }
  finally {
    for (const account of accounts) {
      for (const publicId of account.images) {
        try {
          const timestamp=String(Math.floor(Date.now()/1000)), form=new FormData()
          form.set('public_id',publicId); form.set('timestamp',timestamp);form.set('invalidate','true');form.set('api_key',env.CLOUDINARY_API_KEY)
          form.set('signature',await digest(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`))
          const response=await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,{method:'POST',body:form,redirect:'manual',signal:AbortSignal.timeout(20000)})
          const info=await response.json();cleanup.push({image:true,ok:response.ok && ['ok','not found'].includes(info.result)})
        } catch { cleanup.push({image:true,ok:false}) }
      }
      try { await supabase(env,`/auth/v1/admin/users/${account.id}`,{admin:true,method:'DELETE'}); cleanup.push({account:true,ok:true}) }
      catch { cleanup.push({account:true,ok:false}) }
    }
  }
  return json({group,ok:!failed && cleanup.every(item=>item.ok),checks,failed,cleanup},failed?500:200)
}
