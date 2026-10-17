// Restricted deployment check. Secrets and upstream response bodies never leave
// this function; it cannot create accounts, upload images, or modify records.
const encoder = new TextEncoder()

function reply(body, status = 200) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } })
}

async function authorized(request, env) {
  if (!env.DEPLOY_CHECK_TOKEN) return false
  const provided = request.headers.get('X-Furfolio-Check') || ''
  if (provided.length > 256) return false
  const digests = await Promise.all([provided, env.DEPLOY_CHECK_TOKEN].map(
    value => crypto.subtle.digest('SHA-256', encoder.encode(value)),
  ))
  const actual = new Uint8Array(digests[0])
  const expected = new Uint8Array(digests[1])
  let difference = 0
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index]
  return difference === 0
}

async function check(url, headers, inspect = () => ({}), options = {}) {
  try {
    const response = await fetch(url, {
      headers, redirect: 'manual', signal: AbortSignal.timeout(15000), ...options,
    })
    const data = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, ...(response.ok ? inspect(data) : {}) }
  } catch (error) {
    // Report a fixed category only, never the exception text or upstream body.
    const message = String(error?.message || '')
    const category = /redirect/i.test(message) ? 'redirect_mode_error'
      : /AbortSignal|timeout.*not a function/i.test(message) ? 'timeout_api_error'
      : /header/i.test(message) ? 'header_error' : 'connection_failed'
    return { ok: false, status: 0, error: category }
  }
}

export async function onRequest({ request, env }) {
  if (!(await authorized(request, env))) return reply({ error: 'not_found' }, 404)
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)
  if (Number(request.headers.get('Content-Length') || 0) > 1024) return reply({ error: 'request_too_large' }, 413)

  // Connections are pinned to the configured project. Caller input never selects
  // a destination, an upstream path, or a credential.
  const supabase = env.SUPABASE_URL
  if (supabase !== 'https://dtftipcvgznnnrbjrkea.supabase.co'
    || env.CLOUDINARY_CLOUD_NAME !== 'jcirypaz') return reply({ error: 'configuration_mismatch' }, 503)

  const publicHeaders = { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'User-Agent': 'Furfolio-Server/0.2' }
  const privateHeaders = { apikey: env.SUPABASE_SECRET_KEY, 'User-Agent': 'Furfolio-Server/0.2' }
  // New sb_secret keys belong in apikey, not Authorization: Bearer (they are not JWTs).
  const checks = await Promise.all([
    check(`${supabase}/auth/v1/settings`, publicHeaders, settings => ({
      emailConfirmationDisabled: settings?.mailer_autoconfirm === true,
      signupEnabled: settings?.disable_signup === false,
    })),
    env.SUPABASE_SECRET_KEY
      ? check(`${supabase}/auth/v1/admin/users?page=1&per_page=1`, privateHeaders)
      : Promise.resolve({ ok: false, status: 0, error: 'secret_missing' }),
    env.CLOUDINARY_API_SECRET
      ? check(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/ping`, {
        Authorization: `Basic ${btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`)}`,
      }) : Promise.resolve({ ok: false, status: 0, error: 'secret_missing' }),
    ...['profiles', 'homepages', 'published_homepages', 'assets'].map(table =>
      check(`${supabase}/rest/v1/${table}?select=*&limit=0`, privateHeaders)),
    check(`${supabase}/rest/v1/rpc/furfolio_cloud_schema_version`, { ...privateHeaders, 'Content-Type': 'application/json' }, version => ({ version }), { method: 'POST', body: '{}' }),
  ])
  return reply({
    supabase: { publicKey: checks[0], secretKey: checks[1] },
    cloudinary: checks[2],
    database: Object.fromEntries(['profiles', 'homepages', 'published_homepages', 'assets'].map(
      (table, index) => [table, checks[index + 3]],
    )),
    cloudSchema: checks[7],
  })
}
