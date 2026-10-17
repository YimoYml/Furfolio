import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const directory = join(root, 'work', 'cloudflare')
const tokenPath = join(directory, 'deploy-check-token')
const origin = 'https://furfolio.pages.dev'

try {
  if (process.argv.includes('--provision')) {
    mkdirSync(directory, { recursive: true })
    const token = randomBytes(32).toString('hex')
    const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: '2f9224210fc17fad7914713d53c72ef1', WRANGLER_SEND_METRICS: 'false' }
    for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CF_ACCOUNT_ID', 'CF_API_TOKEN', 'CF_API_KEY', 'CF_EMAIL']) delete env[key]
    const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'),
      'pages', 'secret', 'put', 'DEPLOY_CHECK_TOKEN', '--project-name', 'furfolio',
      '--profile', 'fursona-20261010', '--env-file', join(directory, 'oauth-only.env'),
    ], { cwd: root, env, input: token, encoding: 'utf8', shell: false })
    // Only generic failure information is emitted; stdin credentials stay private.
    if (result.error || result.status !== 0) throw new Error('Could not configure the encrypted deployment-check token')
    writeFileSync(tokenPath, token, { mode: 0o600 })
    console.log('Encrypted deployment-check token configured for the verified Furfolio account. Deploy before checking.')
  } else {
    const token = readFileSync(tokenPath, 'utf8').trim()
    const denied = await fetch(`${origin}/api/internal/check-services`, { method: 'POST', signal: AbortSignal.timeout(25000) })
    if (denied.status !== 404) throw new Error('Deployment check is not protected as expected')
    const response = await fetch(`${origin}/api/internal/check-services`, {
      method: 'POST', headers: { 'X-Furfolio-Check': token }, signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`Service check failed with HTTP ${response.status}`)
    const result = await response.json()
    writeFileSync(join(directory, 'service-verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(), protected: true, ...result }, null, 2))
    console.log(JSON.stringify({ protected: true, ...result }, null, 2))
    if (!result.supabase.publicKey.ok || !result.supabase.secretKey.ok || !result.cloudinary.ok) process.exitCode = 1
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
