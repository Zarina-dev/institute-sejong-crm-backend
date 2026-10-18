/**
 * End-to-end checks of sign-in and account management against a running API.
 *
 *   AUTH_TEST_ADMIN_USERNAME=admin AUTH_TEST_ADMIN_PASSWORD='…' npm run test:auth
 *
 * AUTH_TEST_URL defaults to http://localhost:3000/api. Use a throwaway
 * database and a freshly started API: the suite adds accounts (and removes
 * them again) and makes a few wrong sign-ins, which count towards the
 * per-address limit — 5 in 15 minutes; a restart clears it. With
 * AUTH_TEST_LOCKOUT=1 it also runs into that limit on purpose, last.
 */
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'

const BASE = (process.env.AUTH_TEST_URL || 'http://localhost:3000/api').replace(/\/+$/, '')
const ADMIN = { username: process.env.AUTH_TEST_ADMIN_USERNAME, password: process.env.AUTH_TEST_ADMIN_PASSWORD }
const RUN = Date.now().toString(36)
const SECRET_FIELDS = /password|tokenVersion|token_version/i

async function call(method, path, { token, body } = {}) {
  const headers = { 'Accept-Language': 'en' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: response.status, json, text }
}

const login = (username, password) => call('POST', '/auth/login', { body: { username, password } })

/** No answer may carry a password, a hash or the token version — not even under another name. */
function assertNoSecrets(result) {
  const keys = JSON.stringify(result.json, (key, value) => {
    assert.ok(!SECRET_FIELDS.test(key) || key === '', `response carries "${key}"`)
    return value
  })
  assert.ok(!/\$argon2/.test(keys), 'response carries a hash')
}

describe('staff accounts', () => {
  let admin
  const staff = { username: `staff_${RUN}`, password: 'Staff-Pass-0001', fullName: 'Test Staff' }
  const created = []

  before(async () => {
    assert.ok(ADMIN.username && ADMIN.password, 'set AUTH_TEST_ADMIN_USERNAME and AUTH_TEST_ADMIN_PASSWORD')
    const result = await login(ADMIN.username, ADMIN.password)
    assert.equal(result.status, 200, result.text)
    admin = result.json
  })

  after(async () => {
    for (const id of created) await call('DELETE', `/accounts/${id}`, { token: admin.token })
  })

  test('1. right username and password: signed in, no secrets in the answer', async () => {
    assert.ok(admin.token)
    assert.equal(admin.user.role, 'ADMIN')
    assertNoSecrets({ json: admin })

    const me = await call('GET', '/auth/me', { token: admin.token })
    assert.equal(me.status, 200)
    assert.equal(me.json.username, ADMIN.username.trim().toLowerCase())
    assertNoSecrets(me)
  })

  test('6 + 7. an administrator adds an account; the same username twice is refused, whatever its case', async () => {
    const result = await call('POST', '/accounts', { token: admin.token, body: { ...staff, role: 'STAFF' } })
    assert.equal(result.status, 201, result.text)
    assertNoSecrets(result)
    created.push(result.json.id)
    staff.id = result.json.id

    const again = await call('POST', '/accounts', { token: admin.token, body: { username: staff.username.toUpperCase(), password: staff.password } })
    assert.equal(again.status, 409)

    const weak = await call('POST', '/accounts', { token: admin.token, body: { username: `weak_${RUN}`, password: 'short' } })
    assert.equal(weak.status, 400)

    const list = await call('GET', `/accounts?q=${encodeURIComponent(staff.username)}&page=1&pageSize=10`, { token: admin.token })
    assert.equal(list.status, 200)
    assert.equal(list.json.total, 1)
    assertNoSecrets(list)
  })

  test('2 + 3. a wrong password and an unknown username get the same refusal', async () => {
    const wrong = await login(staff.username, 'Not-The-Password-1')
    const unknown = await login(`nobody_${RUN}`, 'Not-The-Password-1')
    assert.equal(wrong.status, 401)
    assert.equal(unknown.status, 401)
    assert.equal(wrong.json.message, unknown.json.message)
  })

  test('5. STAFF edits the site but cannot manage accounts or read the journal', async () => {
    const session = (await login(staff.username, staff.password)).json
    assert.equal(session.user.role, 'STAFF')

    assert.equal((await call('GET', '/dashboard', { token: session.token })).status, 200)
    assert.equal((await call('GET', '/trash', { token: session.token })).status, 200)
    assert.equal((await call('GET', '/accounts', { token: session.token })).status, 403)
    assert.equal((await call('GET', '/audit', { token: session.token })).status, 403)
    assert.equal((await call('POST', '/accounts', { token: session.token, body: { username: `x_${RUN}`, password: 'Whatever-Pass-1' } })).status, 403)
    assert.equal((await call('PATCH', `/accounts/${staff.id}`, { token: session.token, body: { role: 'ADMIN' } })).status, 403)
    assert.equal((await call('PATCH', `/accounts/${admin.user.id}/password`, { token: session.token, body: { password: 'Taken-Over-Pass-1' } })).status, 403)
    assert.equal((await call('PATCH', `/accounts/${staff.id}/status`, { token: session.token, body: { isActive: true } })).status, 403)
    assert.equal((await call('GET', '/auth/me', { token: session.token })).json.role, 'STAFF')
  })

  test('8. changing one’s own password needs the current one, and ends the other sessions', async () => {
    const first = (await login(staff.username, staff.password)).json
    const path = `/accounts/${staff.id}/password`

    assert.equal((await call('PATCH', path, { token: first.token, body: { password: 'Staff-Pass-0002' } })).status, 400)
    assert.equal((await call('PATCH', path, { token: first.token, body: { password: 'Staff-Pass-0002', currentPassword: 'wrong-one-123' } })).status, 400)

    const changed = await call('PATCH', path, { token: first.token, body: { password: 'Staff-Pass-0002', currentPassword: staff.password } })
    assert.equal(changed.status, 200, changed.text)
    assertNoSecrets({ json: changed.json.user })
    assert.equal((await call('GET', '/auth/me', { token: first.token })).status, 401, 'the old token still works')
    assert.equal((await call('GET', '/auth/me', { token: changed.json.token })).status, 200, 'the fresh token does not')

    assert.equal((await login(staff.username, staff.password)).status, 401)
    staff.password = 'Staff-Pass-0002'
    assert.equal((await login(staff.username, staff.password)).status, 200)

    // An administrator resets it without the current one; the account's sessions end.
    const before = (await login(staff.username, staff.password)).json
    const reset = await call('PATCH', path, { token: admin.token, body: { password: 'Staff-Pass-0003' } })
    assert.equal(reset.status, 200, reset.text)
    assert.equal(reset.json.token, undefined, 'a reset of someone else hands out their token')
    assertNoSecrets(reset)
    assert.equal((await call('GET', '/auth/me', { token: before.token })).status, 401)
    staff.password = 'Staff-Pass-0003'
  })

  test('9. after signing out the token opens nothing', async () => {
    const session = (await login(staff.username, staff.password)).json
    assert.equal((await call('POST', '/auth/logout', { token: session.token })).status, 204)
    assert.equal((await call('GET', '/auth/me', { token: session.token })).status, 401)
    assert.equal((await call('GET', '/dashboard', { token: session.token })).status, 401)
  })

  test('4 + 10. a deactivated account loses its open session at once and cannot sign in', async () => {
    const session = (await login(staff.username, staff.password)).json
    const off = await call('PATCH', `/accounts/${staff.id}/status`, { token: admin.token, body: { isActive: false } })
    assert.equal(off.status, 200, off.text)
    assert.equal(off.json.isActive, false)

    assert.equal((await call('GET', '/dashboard', { token: session.token })).status, 401)
    const refused = await login(staff.username, staff.password)
    assert.equal(refused.status, 401)
    assert.equal(refused.json.message, 'The username or password is incorrect.')

    assert.equal((await call('PATCH', `/accounts/${staff.id}/status`, { token: admin.token, body: { isActive: true } })).status, 200)
    assert.equal((await login(staff.username, staff.password)).status, 200)
  })

  test('the last administrator cannot be demoted, deactivated or deleted, and nobody acts on themselves', async () => {
    const self = admin.user.id
    assert.equal((await call('PATCH', `/accounts/${self}`, { token: admin.token, body: { role: 'STAFF' } })).status, 403)
    assert.equal((await call('PATCH', `/accounts/${self}/status`, { token: admin.token, body: { isActive: false } })).status, 403)
    assert.equal((await call('DELETE', `/accounts/${self}`, { token: admin.token })).status, 403)

    // Promote the staff account, demote it back: allowed while another admin remains.
    assert.equal((await call('PATCH', `/accounts/${staff.id}`, { token: admin.token, body: { role: 'ADMIN', fullName: 'Renamed' } })).json.role, 'ADMIN')
    const staffSession = (await login(staff.username, staff.password)).json
    assert.equal((await call('GET', '/accounts', { token: staffSession.token })).status, 200, 'a promotion does not take effect at once')
    assert.equal((await call('PATCH', `/accounts/${staff.id}`, { token: admin.token, body: { role: 'STAFF' } })).json.role, 'STAFF')
    assert.equal((await call('GET', '/accounts', { token: staffSession.token })).status, 403, 'a demotion does not take effect at once')

    const unknownField = await call('PATCH', `/accounts/${staff.id}`, { token: admin.token, body: { passwordHash: 'x' } })
    assert.equal(unknownField.status, 400)
  })

  test('11. the public site still answers without signing in', async () => {
    for (const path of ['/health', '/news', '/staff', '/courses', '/terms']) {
      const result = await call('GET', path)
      assert.equal(result.status, 200, `${path}: ${result.status}`)
    }
    assert.equal((await call('GET', '/dashboard')).status, 401)
    assert.equal((await call('GET', '/auth/me', { token: 'eyJyb2xlIjoiYWRtaW4ifQ.forged' })).status, 401)
  })

  test('sign-in is limited per address', { skip: process.env.AUTH_TEST_LOCKOUT !== '1' }, async () => {
    let last
    for (let attempt = 0; attempt < 7; attempt += 1) last = await login(`nobody_${RUN}`, 'Not-The-Password-1')
    assert.equal(last.status, 429)
    assert.equal((await login(ADMIN.username, ADMIN.password)).status, 429)
  })
})
