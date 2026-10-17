import { readFile, writeFile } from 'node:fs/promises'
const origin='https://furfolio.pages.dev'
const token=(await readFile('work/cloudflare/deploy-check-token','utf8')).trim()
const protectedResponse=await fetch(origin+'/api/internal/verify-cloud',{method:'POST',signal:AbortSignal.timeout(15000)})
if(protectedResponse.status!==404)throw Error('Verification endpoint is not protected')
const selected=process.argv.find(value=>value.startsWith('--group='))?.split('=')[1]
const groups=selected?[selected]:['access','publication','recovery']
let reports=[]
if(selected)try{reports=JSON.parse(await readFile('outputs/cloud-setup/live-flow-verification.json','utf8')).reports||[]}catch{}
for(const group of groups){
 const response=await fetch(origin+'/api/internal/verify-cloud',{method:'POST',headers:{'X-Furfolio-Check':token,'X-Furfolio-Run-QA':'cloud-flow-v1','X-Furfolio-QA-Group':group},signal:AbortSignal.timeout(180000)})
 const report=await response.json();reports=reports.filter(previous=>previous.group!==group);reports.push(report)
 await writeFile('outputs/cloud-setup/live-flow-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),reports},null,2))
 console.log(JSON.stringify(report,null,2))
 if(!report.ok){process.exitCode=1;break}
}
