const DEFAULT_BASE_URL = 'https://www.coffeeconnectr.com'

const PUBLIC_ROUTES = [
  '/',
  '/sign-up',
  '/about',
  '/how-to-use',
  '/pricing',
  '/terms',
  '/privacy',
  '/contact',
  '/discover/map',
]

const SPA_ROUTES = ['/dashboard', '/discover', '/admin']

const BUNDLE_MARKERS = [
  ['email confirmation guard', 'Please confirm your email before signing in'],
  ['pending confirmation storage', 'auth_pending_confirmation'],
  ['email confirmed check', 'email_confirmed_at'],
  ['discover map route', '/discover/map'],
  ['member feedback', 'feedback'],
]

function parseArgs(argv) {
  let baseUrl = process.env.SMOKE_TEST_URL?.trim() || DEFAULT_BASE_URL

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--url' && argv[index + 1]) {
      baseUrl = argv[index + 1].trim()
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npm run smoke-test [-- --url <origin>]

Checks public routes, SPA deep links, assets, and key bundle markers.

Environment:
  SMOKE_TEST_URL   Optional origin (default: ${DEFAULT_BASE_URL})
`)
      process.exit(0)
    }
  }

  return baseUrl.replace(/\/$/, '')
}

function record(results, name, pass, details = '') {
  results.push({ name, pass, details })
}

function isSpaShell(html) {
  return html.includes('id="root"') && html.toLowerCase().includes('<!doctype html')
}

function extractBundlePath(html) {
  const match = html.match(/\/assets\/index-[^"]+\.js/)
  return match ? match[0] : null
}

function extractStylesheetPath(html) {
  const match = html.match(/\/assets\/index-[^"]+\.css/)
  return match ? match[0] : null
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  return { response, text }
}

async function checkRoute(baseUrl, path) {
  const { response, text } = await fetchText(`${baseUrl}${path}`)
  const pass = response.ok && isSpaShell(text)
  return {
    pass,
    details: pass ? String(response.status) : `${response.status} missing SPA shell`,
  }
}

async function runSmokeTest(baseUrl) {
  const results = []
  let bundlePath = null
  let stylesheetPath = null

  console.log(`Smoke testing ${baseUrl}\n`)

  for (const path of PUBLIC_ROUTES) {
    const { pass, details } = await checkRoute(baseUrl, path)
    record(results, `route ${path}`, pass, details)
  }

  for (const path of SPA_ROUTES) {
    const { pass, details } = await checkRoute(baseUrl, path)
    record(results, `spa ${path}`, pass, details)
  }

  try {
    const home = await fetchText(`${baseUrl}/`)
    bundlePath = extractBundlePath(home.text)
    stylesheetPath = extractStylesheetPath(home.text)
    record(results, 'bundle path in index.html', Boolean(bundlePath), bundlePath ?? 'not found')
    record(
      results,
      'stylesheet path in index.html',
      Boolean(stylesheetPath),
      stylesheetPath ?? 'not found',
    )
  } catch (error) {
    record(results, 'homepage fetch', false, error.message)
  }

  if (bundlePath) {
    try {
      const { response, text } = await fetchText(`${baseUrl}${bundlePath}`)
      record(results, 'js bundle asset', response.ok, String(response.status))

      for (const [name, marker] of BUNDLE_MARKERS) {
        record(results, `bundle: ${name}`, text.includes(marker))
      }
    } catch (error) {
      record(results, 'js bundle fetch', false, error.message)
    }
  }

  if (stylesheetPath) {
    try {
      const { response } = await fetchText(`${baseUrl}${stylesheetPath}`)
      record(results, 'css bundle asset', response.ok, String(response.status))
    } catch (error) {
      record(results, 'css bundle fetch', false, error.message)
    }
  }

  try {
    const response = await fetch(`${baseUrl}/favicon.png`)
    record(results, 'favicon asset', response.ok, String(response.status))
  } catch (error) {
    record(results, 'favicon asset', false, error.message)
  }

  if (baseUrl.includes('www.coffeeconnectr.com')) {
    try {
      const apexUrl = baseUrl.replace('www.coffeeconnectr.com', 'coffeeconnectr.com')
      const response = await fetch(`${apexUrl}/sign-up`, { redirect: 'manual' })
      const pass = [301, 302, 307, 308].includes(response.status)
      record(results, 'apex -> www redirect', pass, String(response.status))
    } catch (error) {
      record(results, 'apex -> www redirect', false, error.message)
    }
  }

  let failed = 0

  for (const result of results) {
    const status = result.pass ? 'PASS' : 'FAIL'
    const suffix = result.details ? ` (${result.details})` : ''
    console.log(`${status} ${result.name}${suffix}`)
    if (!result.pass) {
      failed += 1
    }
  }

  console.log(`\n${results.length - failed}/${results.length} checks passed`)

  if (failed > 0) {
    process.exit(1)
  }
}

const baseUrl = parseArgs(process.argv.slice(2))
runSmokeTest(baseUrl).catch((error) => {
  console.error('Smoke test failed to run:', error)
  process.exit(1)
})
