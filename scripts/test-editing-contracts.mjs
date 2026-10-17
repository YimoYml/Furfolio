import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('work/editing-qa', { recursive: true })
await build({ stdin: { contents: "export * from './src/domain/framing';export * from './src/domain/profile';export * from './src/domain/normalize';export * from './src/domain/copy'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: 'work/editing-qa/domain.mjs' })
const { defaultAvatarFrame, defaultFrame, cleanFrame, imageGeometry, panFrame, hydrateDraft, newDraft, referencedAssetIds, copyBlock } = await import('../work/editing-qa/domain.mjs')
const checks = []
function check(name, run) { run(); checks.push(name) }
check('Contain keeps wide, tall and square originals visible without changing aspect ratio', () => {
  for (const [iw, ih] of [[1600,600], [600,1600], [800,800]]) {
    const g = imageGeometry(320,450,iw,ih,defaultFrame())
    assert(g.width <= 320 && g.height <= 450)
    assert(Math.abs(g.width / g.height - iw / ih) < .00001)
    assert(g.left >= 0 && g.top >= 0)
  }
})
check('Cover fills the frame and panning cannot expose outside edges', () => {
  for (const [iw, ih] of [[1600,600], [600,1600]]) {
    const frame = { ...defaultFrame(), fit: 'cover', zoom: 2 }
    const g = imageGeometry(320,450,iw,ih,frame)
    assert(g.width >= 320 && g.height >= 450)
    for (const dx of [-100000, 100000]) {
      const next = imageGeometry(320,450,iw,ih,panFrame(frame,g,dx,dx))
      assert(next.left <= 0 && next.left + next.width >= 320)
      assert(next.top <= 0 && next.top + next.height >= 450)
    }
  }
})
check('Pointer movement maps to the complete drag distance, on both crop axes', () => {
  const frame = { ...defaultFrame(), x:50, y:50, zoom:3 }
  const g = imageGeometry(250,280,500,800,frame)
  const next = imageGeometry(250,280,500,800,panFrame(frame,g,45,45))
  assert(Math.abs(next.left - g.left - 45) < .00001)
  assert(Math.abs(next.top - g.top - 45) < .00001)
})
check('Equal-size axes remain finite and malformed crop values are clamped', () => {
  const frame = defaultFrame(), g = imageGeometry(500,800,500,800,frame)
  assert.deepEqual(panFrame(frame,g,100,100),frame)
  assert.deepEqual(cleanFrame({x:Infinity,y:-2,zoom:100,fit:'bad',aspect:'bad'}),{...frame,y:0,zoom:3})
})
check('Existing photo drafts retain their template crop and gain independent mobile controls', () => {
  const draft = hydrateDraft(JSON.stringify({schemaVersion:1,heroMode:'photo',layout:{heroOffset:7}}))
  assert.equal(draft.heroFrames.desktop.fit,'cover')
  assert.equal(draft.heroFrames.mobile.aspect,'template')
  assert.equal(draft.layout.heroOffset,7)
  assert.equal(draft.layout.heroMobileOffset,0)
  assert.equal(draft.aboutAssetId,null)
})
check('Section images, font overrides and independent frames survive a serialized draft', () => {
  const draft = newDraft()
  draft.aboutAssetId = 'about'; draft.heroAssetId = 'hero'
  draft.aboutFrame = { ...defaultAvatarFrame(), x:32, y:74, zoom:1.8 }
  draft.interests[0].assetId = 'interest'
  draft.heroFrames.mobile = { ...defaultFrame(),zoom:2,x:28,aspect:'square' }
  draft.layout.heroMobileOffset = 14
  draft.copy.heroNote = {text:'我的颜色\n自己的故事',font:'wenkai'}
  draft.typography.bio = 'serif'
  const restored = hydrateDraft(JSON.stringify(draft))
  assert.deepEqual(restored.heroFrames,draft.heroFrames)
  assert.equal(restored.aboutAssetId,'about')
  assert.deepEqual(restored.aboutFrame,draft.aboutFrame)
  assert.equal(restored.interests[0].assetId,'interest')
  assert.deepEqual(copyBlock(restored,'heroNote'),draft.copy.heroNote)
  assert.equal(restored.typography.bio,'serif')
  assert.equal(restored.layout.heroMobileOffset,14)
})
check('Publish media references include each selected section once, including shared images', () => {
  const draft = newDraft()
  draft.heroAssetId = 'hero'; draft.aboutAssetId = 'about'; draft.interests[0].assetId = 'likes'
  draft.gallery = [{id:'one',assetId:'about',caption:''}]
  assert.deepEqual(referencedAssetIds(draft),['hero','about','likes'])
})
check('Invalid fonts fall back safely and custom text stays literal rather than interpreted HTML', () => {
  const draft = hydrateDraft(JSON.stringify({schemaVersion:1,copy:{heroNote:{text:'<script>literal</script>',font:'invalid'}},typography:{bio:'invalid'}}))
  assert.equal(copyBlock(draft,'heroNote').font,'template')
  assert.equal(copyBlock(draft,'heroNote').text,'<script>literal</script>')
  assert.equal(draft.typography.bio,'template')
})
check('Old About images get a centered square crop; malformed frames cannot change the shape or expose edges', () => {
  const legacy = hydrateDraft(JSON.stringify({schemaVersion:1, aboutAssetId:'about'}))
  assert.deepEqual(legacy.aboutFrame,defaultAvatarFrame())
  const invalid = hydrateDraft(JSON.stringify({schemaVersion:1, aboutFrame:{x:-20,y:200,zoom:Infinity,fit:'contain',aspect:'landscape'}}))
  assert.deepEqual(invalid.aboutFrame,{...defaultAvatarFrame(),x:0,y:100})
  for (const [iw,ih] of [[1600,600],[600,1600],[800,800]]) {
    const g = imageGeometry(140,140,iw,ih,legacy.aboutFrame)
    assert(g.width>=140 && g.height>=140)
    assert(Math.abs(g.width/g.height-iw/ih)<.00001)
    const next=imageGeometry(140,140,iw,ih,panFrame(legacy.aboutFrame,g,100000,-100000))
    assert(next.left<=0 && next.top<=0 && next.left+next.width>=140 && next.top+next.height>=140)
  }
})
await mkdir('outputs/avatar-gallery-update',{recursive:true})
await writeFile('outputs/avatar-gallery-update/domain-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2))
console.log(`Passed ${checks.length} editing domain checks.`)
