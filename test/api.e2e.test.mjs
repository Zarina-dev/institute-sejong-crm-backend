/**
 * End-to-end checks of the API's guard rails against a running API:
 * who may change what, what the public may see, what the validation pipe
 * refuses, the home page's one-request answer, the public cache headers and
 * the image upload's content check.
 *
 *   API_TEST_ADMIN_USERNAME=admin API_TEST_ADMIN_PASSWORD='…' npm run test:api
 *
 * API_TEST_URL defaults to http://localhost:3000/api (AUTH_TEST_* are read
 * as a fallback, so one set of variables runs both suites). Use a throwaway
 * database: the suite adds a staff account and a draft news post, and
 * removes both again — the post for good, out of 최근 삭제된 항목 too. It
 * makes no wrong sign-ins, so it does not count towards the sign-in limit.
 *
 * The rejected upload never stores anything, but the API does open (and
 * abort) an upload to its R2 bucket: point the API under test at a bucket
 * you may write to.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, test } from 'node:test'

const BASE = (process.env.API_TEST_URL || process.env.AUTH_TEST_URL || 'http://localhost:3000/api').replace(/\/+$/, '')
const ADMIN = {
  username: process.env.API_TEST_ADMIN_USERNAME || process.env.AUTH_TEST_ADMIN_USERNAME,
  password: process.env.API_TEST_ADMIN_PASSWORD || process.env.AUTH_TEST_ADMIN_PASSWORD,
}
const RUN = Date.now().toString(36)
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
/** Any well-formed id: a guard has to answer before anything looks it up. */
const SOME_ID = '00000000-0000-4000-8000-000000000000'

async function call(method, path, { token, body, headers: extra } = {}) {
  const headers = { 'Accept-Language': 'en', ...extra }
  if (token) headers.Authorization = `Bearer ${token}`
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body && !isForm) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: response.status, json, text, headers: response.headers }
}

const login = (username, password) => call('POST', '/auth/login', { body: { username, password } })

/**
 * Every route the controllers declare, read from the source: a route added
 * later is checked without anyone remembering to list it here. Each carries
 * the roles of its `@Authenticated(…)` — its own, else its controller's —
 * or null when it has none (public).
 */
function declaredRoutes() {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.controller.ts')) files.push(path)
    }
  }
  walk(SRC)

  const routes = []
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const prefix = /@Controller\(\s*'([^']*)'\s*\)/.exec(source)?.[1]
    if (prefix === undefined) continue
    // The decorators above `export class` belong to the controller.
    const head = source.slice(0, source.indexOf('export class'))
    const classAuth = /@Authenticated\(([^)]*)\)/.exec(head.slice(head.lastIndexOf('@Controller')))
    const body = source.slice(source.indexOf('export class'))

    // A handler's decorators are the run of `@…` lines before its name.
    let pending = []
    for (const line of body.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('@')) {
        pending.push(trimmed)
        continue
      }
      if (trimmed === '' || trimmed.startsWith('/') || trimmed.startsWith('*')) continue
      const verb = pending.map((d) => /^@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)')?\s*\)/.exec(d)).find(Boolean)
      if (verb) {
        const auth = pending.map((d) => /^@Authenticated\(([^)]*)\)/.exec(d)).find(Boolean) ?? classAuth
        const roles = auth ? [...auth[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : null
        const path = ['', prefix, verb[2]].filter((part) => part !== undefined && part !== '').join('/')
        routes.push({ method: verb[1].toUpperCase(), path: `/${path}`, roles, file: file.slice(SRC.length + 1) })
      }
      pending = []
    }
  }
  return routes
}

/** A concrete address for a declared path: every `:param` gets a value its pipe would accept. */
const sample = (path) =>
  path.replace(/:(\w+)/g, (_, name) => ({ type: 'news', slug: 'about', locale: 'ko', file: `${SOME_ID}.pdf` })[name] ?? SOME_ID)

const ROUTES = declaredRoutes()
const MUTATING = ROUTES.filter((route) => route.method !== 'GET')
/** Signing in is the one change anyone may ask for. */
const PUBLIC_MUTATIONS = new Set(['POST /auth/login'])

describe('API guard rails', () => {
  let admin
  let staff
  const staffAccount = { username: `api_staff_${RUN}`, password: 'Api-Staff-Pass-01', fullName: 'API Test Staff' }
  let staffAccountId = null
  let draftId = null

  before(async () => {
    assert.ok(ADMIN.username && ADMIN.password, 'set API_TEST_ADMIN_USERNAME and API_TEST_ADMIN_PASSWORD (or the AUTH_TEST_* ones)')
    const result = await login(ADMIN.username, ADMIN.password)
    assert.equal(result.status, 200, result.text)
    admin = result.json
    assert.equal(admin.user.role, 'ADMIN', 'the test account must be an administrator')

    const created = await call('POST', '/accounts', { token: admin.token, body: { ...staffAccount, role: 'STAFF' } })
    assert.equal(created.status, 201, created.text)
    staffAccountId = created.json.id
    const session = await login(staffAccount.username, staffAccount.password)
    assert.equal(session.status, 200, session.text)
    staff = session.json
  })

  // Whatever happened above: nothing this run made is left behind.
  after(async () => {
    if (draftId && admin) {
      await call('DELETE', `/news/${draftId}`, { token: admin.token })
      await call('DELETE', `/trash/news/${draftId}`, { token: admin.token })
    }
    if (staffAccountId && admin) await call('DELETE', `/accounts/${staffAccountId}`, { token: admin.token })
  })

  test('the route list was read from the controllers', () => {
    // A parser that silently found nothing would make the next test pass vacuously.
    assert.ok(MUTATING.length >= 50, `only ${MUTATING.length} mutating routes found`)
    for (const expected of ['POST /news', 'PATCH /staff/order', 'PUT /content/:slug/:locale', 'DELETE /trash/:type/:id', 'POST /uploads/images', 'POST /auth/logout']) {
      assert.ok(MUTATING.some((route) => `${route.method} ${route.path}` === expected), `${expected} missing from the parsed routes`)
    }
    for (const route of MUTATING) {
      if (!PUBLIC_MUTATIONS.has(`${route.method} ${route.path}`)) {
        assert.ok(route.roles !== null, `${route.method} ${route.path} (${route.file}) has no @Authenticated`)
      }
    }
  })

  test('every POST / PATCH / PUT / DELETE without a token is 401', async () => {
    const wrong = []
    for (const route of MUTATING) {
      if (PUBLIC_MUTATIONS.has(`${route.method} ${route.path}`)) continue
      const result = await call(route.method, sample(route.path), { body: route.method === 'DELETE' ? undefined : {} })
      if (result.status !== 401) wrong.push(`${route.method} ${route.path}: ${result.status}`)
    }
    assert.deepEqual(wrong, [])
  })

  test('a forged or garbage token is 401 too', async () => {
    assert.equal((await call('POST', '/news', { token: 'not-a-token', body: {} })).status, 401)
    assert.equal((await call('DELETE', `/news/${SOME_ID}`, { token: `${admin.token}x` })).status, 401)
  })

  test('administrator-only routes are 403 for a STAFF account', async () => {
    const adminOnly = ROUTES.filter((route) => route.roles?.includes('ADMIN'))
    // The ones the README names: accounts, the journal, removing for good.
    for (const expected of ['GET /accounts', 'POST /accounts', 'DELETE /accounts/:id', 'GET /audit', 'GET /audit/connection', 'DELETE /trash/:type/:id']) {
      assert.ok(adminOnly.some((route) => `${route.method} ${route.path}` === expected), `${expected} is not ADMIN-only`)
    }

    const wrong = []
    for (const route of adminOnly) {
      const result = await call(route.method, sample(route.path), { token: staff.token, body: route.method === 'GET' || route.method === 'DELETE' ? undefined : {} })
      if (result.status !== 403) wrong.push(`${route.method} ${route.path}: ${result.status}`)
    }
    assert.deepEqual(wrong, [])

    // …while what any account may do still works for it.
    assert.equal((await call('GET', '/trash', { token: staff.token })).status, 200)
    assert.equal((await call('GET', '/dashboard', { token: staff.token })).status, 200)
  })

  test('a draft is invisible to the public and removed for good afterwards', async () => {
    const title = `API test draft ${RUN}`
    const created = await call('POST', '/news', { token: staff.token, body: { title, body: '<p>draft</p>', isPublished: false } })
    assert.equal(created.status, 201, created.text)
    draftId = created.json.id
    assert.equal(created.json.isPublished, false)

    // Anonymous: neither listed nor reachable by id — and asking for drafts does not help.
    for (const path of ['/news', '/news?limit=50', '/news?all=true']) {
      const list = await call('GET', path)
      assert.equal(list.status, 200)
      assert.ok(!list.json.some((post) => post.id === draftId), `${path} lists the draft`)
    }
    assert.equal((await call('GET', `/news/${draftId}`)).status, 404)
    assert.equal((await call('GET', '/home')).json.news.some((post) => post.id === draftId), false)

    // Signed in, it is there.
    assert.equal((await call('GET', `/news/${draftId}`, { token: staff.token })).status, 200)
    assert.ok((await call('GET', '/news?all=true', { token: staff.token })).json.some((post) => post.id === draftId))

    // Delete → trash → STAFF may not purge, ADMIN may; then it is gone everywhere.
    assert.equal((await call('DELETE', `/news/${draftId}`, { token: staff.token })).status, 200)
    const trash = await call('GET', '/trash', { token: staff.token })
    assert.ok(trash.json.some((item) => item.type === 'news' && item.id === draftId), 'the deleted draft is not in the trash')
    assert.equal((await call('DELETE', `/trash/news/${draftId}`, { token: staff.token })).status, 403)
    assert.equal((await call('DELETE', `/trash/news/${draftId}`, { token: admin.token })).status, 200)
    assert.equal((await call('GET', `/news/${draftId}`, { token: admin.token })).status, 404)
    assert.ok(!(await call('GET', '/trash', { token: admin.token })).json.some((item) => item.id === draftId))
    draftId = null
  })

  test('the validation pipe refuses unknown fields and wrong types', async () => {
    const unknown = await call('POST', '/news', { token: staff.token, body: { title: 'x', body: 'y', isPublished: false, authorId: SOME_ID } })
    assert.equal(unknown.status, 400, unknown.text)
    assert.ok(unknown.json.message.some((message) => /authorId/.test(message)), unknown.text)

    const types = await call('POST', '/news', { token: staff.token, body: { title: 42, body: ['y'], isPublished: 'no' } })
    assert.equal(types.status, 400, types.text)
    assert.ok(Array.isArray(types.json.message) && types.json.message.length >= 3, types.text)

    const reorder = await call('PATCH', '/staff/order', { token: staff.token, body: { ids: ['not-a-uuid'] } })
    assert.equal(reorder.status, 400)

    const term = await call('POST', '/terms', { token: staff.token, body: { year: '2026', kind: 'first', startDate: '2026-03-01', endDate: '2026-06-30' } })
    assert.equal(term.status, 400, 'a year sent as text is not converted silently')

    assert.equal((await call('GET', '/news/not-a-uuid')).status, 400)
  })

  test('a refusal names the semester as the site does, in the reader’s language', async (t) => {
    const terms = (await call('GET', '/terms')).json
    if (terms.length < 2) return t.skip('needs at least two semesters in 학기 관리')
    const [a, b] = terms

    // The site's terms.display.* — a break without a season is read from its dates.
    const LABELS = {
      ko: { first: '{y}년 1학기', second: '{y}년 2학기', spring: '{y}년 봄방학', summer: '{y}년 여름방학', autumn: '{y}년 가을방학', winter: '{y}년 겨울방학' },
      en: { first: 'Spring semester {y}', second: 'Autumn semester {y}', spring: 'Spring break {y}', summer: 'Summer break {y}', autumn: 'Autumn break {y}', winter: 'Winter break {y}' },
      ru: { first: '1-й семестр {y}', second: '2-й семестр {y}', spring: 'Весенние каникулы {y}', summer: 'Летние каникулы {y}', autumn: 'Осенние каникулы {y}', winter: 'Зимние каникулы {y}' },
      ky: { first: '{y}-жыл, 1-семестр', second: '{y}-жыл, 2-семестр', spring: '{y}-жыл, жазгы эс алуу', summer: '{y}-жыл, жайкы эс алуу', autumn: '{y}-жыл, күзгү эс алуу', winter: '{y}-жыл, кышкы эс алуу' },
    }
    const label = (language, term) => {
      const month = Number(term.startDate.slice(5, 7))
      const slot = term.kind === 'break' ? (term.season ?? (month >= 4 && month <= 9 ? 'summer' : 'winter')) : term.kind
      return LABELS[language][slot].replace('{y}', term.year)
    }

    for (const language of ['ko', 'en', 'ru', 'ky']) {
      const headers = { 'Accept-Language': language }

      // A break over a's dates collides with a (a break never fails on its code first).
      const overlap = await call('POST', '/terms', {
        token: staff.token,
        headers,
        body: { year: a.year, kind: 'break', season: 'winter', startDate: a.startDate, endDate: a.startDate },
      })
      if (overlap.status === 201) {
        // Should never happen; do not leave it behind.
        await call('DELETE', `/terms/${overlap.json.id}`, { token: admin.token })
        await call('DELETE', `/trash/terms/${overlap.json.id}`, { token: admin.token })
      }
      assert.equal(overlap.status, 400, overlap.text)
      assert.ok(overlap.json.message.includes(label(language, a)), `${language}: ${overlap.json.message}`)
      assert.ok(!overlap.json.message.includes(`«${a.code}»`) && !overlap.json.message.includes(`「${a.code}」`), `${language}: still the code`)

      // An event dated in a but filed under b names both.
      const event = await call('POST', '/events', { token: staff.token, headers, body: { title: `API test ${RUN}`, startDate: a.startDate, termCode: b.code, isPublished: false } })
      if (event.status === 201) await call('DELETE', `/events/${event.json.id}`, { token: admin.token }).then(() => call('DELETE', `/trash/events/${event.json.id}`, { token: admin.token }))
      assert.equal(event.status, 400, event.text)
      assert.ok(event.json.message.includes(label(language, b)) && event.json.message.includes(label(language, a)), `${language}: ${event.json.message}`)
    }
  })

  test('a semester is saved, moved, deleted, restored and purged in one piece', async () => {
    // Far enough ahead that nothing real is filed there.
    const created = await call('POST', '/terms', { token: staff.token, body: { year: 2099, kind: 'break', season: 'summer', startDate: '2099-07-01', endDate: '2099-07-31' } })
    assert.equal(created.status, 201, created.text)
    const id = created.json.id
    try {
      assert.match(created.json.code, /^2099-b\d+$/)

      const moved = await call('PATCH', `/terms/${id}`, { token: staff.token, body: { kind: 'second', startDate: '2099-09-01', endDate: '2099-12-31' } })
      assert.equal(moved.status, 200, moved.text)
      assert.equal(moved.json.code, '2099-2')
      assert.equal(moved.json.season, null, 'a semester keeps no season')

      assert.equal((await call('DELETE', `/terms/${id}`, { token: staff.token })).status, 200)
      assert.ok(!(await call('GET', '/terms')).json.some((term) => term.id === id))
      assert.equal((await call('POST', `/trash/terms/${id}/restore`, { token: staff.token })).status, 201)
      assert.ok((await call('GET', '/terms')).json.some((term) => term.id === id && term.code === '2099-2'))
    } finally {
      await call('DELETE', `/terms/${id}`, { token: admin.token })
      assert.equal((await call('DELETE', `/trash/terms/${id}`, { token: admin.token })).status, 200)
    }
  })

  test('GET /home is the four parts the site would otherwise ask for one by one', async () => {
    // A write by someone else between the requests would change a part; one retry covers that.
    let lastError
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const home = await call('GET', '/home')
        assert.equal(home.status, 200)
        assert.deepEqual(Object.keys(home.json).sort(), ['courses', 'news', 'newsLimit', 'range', 'term', 'terms', 'timetable'])
        assert.equal(home.json.newsLimit, 6)
        assert.match(home.json.range.from, /^\d{4}-\d{2}-\d{2}$/)
        assert.match(home.json.range.to, /^\d{4}-\d{2}-\d{2}$/)
        assert.ok(home.json.news.length <= 6)
        assert.ok(home.json.news.every((post) => post.isPublished === true))

        const terms = await call('GET', '/terms')
        assert.deepEqual(home.json.terms, terms.json)
        // The semester in progress, else the newest one.
        const today = home.json.range.from
        const expected = terms.json.find((t) => t.startDate <= today && today <= t.endDate) ?? terms.json[0] ?? null
        assert.equal(home.json.term, expected?.code ?? null)

        assert.deepEqual(home.json.news, (await call('GET', '/news?limit=6')).json)
        if (home.json.term) {
          const courses = await call('GET', `/courses?publishedOnly=true&term=${encodeURIComponent(home.json.term)}`)
          assert.deepEqual(home.json.courses, courses.json)
        } else {
          assert.deepEqual(home.json.courses, [])
        }
        const { from, to } = home.json.range
        assert.deepEqual(home.json.timetable, (await call('GET', `/schedule?from=${from}&to=${to}`)).json)
        return
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  })

  test('public reads carry cache headers and answer 304 to a matching If-None-Match', async () => {
    for (const path of ['/terms', '/news?limit=6', '/home']) {
      const first = await call('GET', path)
      assert.equal(first.status, 200)
      assert.match(first.headers.get('cache-control') ?? '', /public, max-age=\d+/, `${path}: Cache-Control`)
      const etag = first.headers.get('etag')
      assert.ok(etag, `${path}: no ETag`)
      assert.match(first.headers.get('vary') ?? '', /Accept-Language/i)

      const again = await call('GET', path, { headers: { 'If-None-Match': etag } })
      assert.equal(again.status, 304, `${path}: ${again.status}`)
      assert.equal(again.text, '')

      const stale = await call('GET', path, { headers: { 'If-None-Match': 'W/"something-else"' } })
      assert.equal(stale.status, 200)
    }

    // Signed in: never the shared copy, and never kept by a browser as public.
    const mine = await call('GET', '/news?all=true', { token: staff.token })
    assert.equal(mine.status, 200)
    assert.notEqual(mine.headers.get('x-cache'), 'HIT')
  })

  test('an HTML page renamed .png is refused as an image', async () => {
    const html = `<!doctype html><html><head><title>x</title></head><body><script>alert(1)</script>${'<p>padding</p>'.repeat(20)}</body></html>`
    const form = new FormData()
    form.append('file', new Blob([html], { type: 'image/png' }), 'innocent.png')
    const result = await call('POST', '/uploads/images', { token: staff.token, body: form })
    assert.equal(result.status, 400, result.text)
    assert.match(String(result.json.message), /image format/i)

    // The extension alone is checked too.
    const renamed = new FormData()
    renamed.append('file', new Blob([html], { type: 'text/html' }), 'page.html')
    assert.equal((await call('POST', '/uploads/images', { token: staff.token, body: renamed })).status, 400)
  })
})
