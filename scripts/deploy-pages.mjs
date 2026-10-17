import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function run(entry, args, env = process.env) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: root, env, stdio: 'inherit', shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Command failed with exit code ${result.status}`)
}

function checkAssets() {
  const dist = join(root, 'dist')
  statSync(join(dist, 'index.html'))
  let count = 0
  let largest = 0
  function walk(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name)
      if (item.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${item.name}`)
      if (item.isDirectory()) walk(path)
      else if (item.isFile()) {
        const size = statSync(path).size
        if (size > 25 * 1024 * 1024) throw new Error(`Asset exceeds Pages' 25 MiB limit: ${item.name}`)
        count++
        largest = Math.max(largest, size)
      }
    }
  }
  walk(dist)
  if (count > 20000) throw new Error('Asset count exceeds Pages Free limit')
  console.log(`Pages assets ready: ${count} files; largest ${(largest / 1024 / 1024).toFixed(2)} MiB`)
}

try {
  const { values } = parseArgs({ options: {
    check: { type: 'boolean' },
    'account-id': { type: 'string' },
    project: { type: 'string' },
    profile: { type: 'string' },
    branch: { type: 'string', default: 'main' },
  } })

  if (values.check) {
    checkAssets()
  } else {
    if (!/^[a-f0-9]{32}$/i.test(values['account-id'] ?? '')) {
      throw new Error('Deployment requires an explicit verified --account-id; current account is never used as a fallback')
    }
    if (!/^[a-z0-9][a-z0-9-]{0,57}$/.test(values.project ?? '')) {
      throw new Error('Deployment requires an explicit --project name')
    }
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(values.profile ?? '')) {
      throw new Error('Deployment requires an explicit --profile name')
    }
    if (!values.branch || values.branch.startsWith('-')) throw new Error('Invalid branch')
    if (!process.env.npm_execpath) throw new Error('Run this command through npm run deploy:pages')

    run(process.env.npm_execpath, ['run', 'build'])
    checkAssets()

    // Dedicated OAuth profile and explicit account prevent inherited credentials
    // or Wrangler's account/project cache from choosing another deployment target.
    const env = { ...process.env }
    for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL',
      'CF_ACCOUNT_ID', 'CF_API_TOKEN', 'CF_API_KEY', 'CF_EMAIL']) delete env[key]
    env.CLOUDFLARE_ACCOUNT_ID = values['account-id']
    env.WRANGLER_SEND_METRICS = 'false'
    const cliDirectory = join(root, 'work', 'cloudflare')
    mkdirSync(cliDirectory, { recursive: true })
    const envFile = join(cliDirectory, 'oauth-only.env')
    writeFileSync(envFile, '# CLI OAuth only; application environment is configured separately.\n')

    console.log(`Deploy target: ${values.project}; account ${values['account-id']}; profile ${values.profile}`)
    run(join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), [
      'pages', 'deploy', 'dist', '--project-name', values.project,
      '--branch', values.branch, '--profile', values.profile, '--env-file', envFile,
    ], env)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
