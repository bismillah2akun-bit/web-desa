// Integration check against the configured local API/database; creates only temporary fixtures.
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { pool } = require('../src/config/database')
const serviceIds = []
const applicationIds = []
const base = `http://127.0.0.1:${process.env.PORT || 5000}/api`

async function run() {
  const [[admin]] = await pool.query('SELECT id FROM admins WHERE is_active = TRUE LIMIT 1')
  const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  async function call(path, { method = 'GET', data, authenticated = true } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(authenticated ? { Cookie: `admin_token=${token}` } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    })
    return { status: response.status, body: await response.json() }
  }
  async function createService() {
    const result = await call('/admin/services', { method: 'POST', data: {
      name: `Integration deletion ${Date.now()}`, estimated_days: 1, is_active: true,
      requirements: [{ label: 'Test note', field_type: 'text', is_required: true }],
    } })
    assert.equal(result.status, 201)
    serviceIds.push(result.body.data.id)
    return result.body.data
  }
  const unused = await createService()
  assert.equal((await call(`/admin/services/${unused.id}`, { method: 'DELETE', authenticated: false })).status, 401)
  const removed = await call(`/admin/services/${unused.id}`, { method: 'DELETE' })
  assert.equal(removed.status, 200)
  assert.equal(removed.body.data.archived, false)
  assert.equal((await call(`/admin/services/${unused.id}`, { method: 'DELETE' })).status, 404)

  const used = await createService()
  const application = await call(`/services/${used.id}/applications`, { method: 'POST', authenticated: false, data: {
    full_name: 'Integration fixture', whatsapp: '080000000000',
    [`requirement_${used.requirements[0].id}`]: 'Preserved value',
  } })
  assert.equal(application.status, 201)
  applicationIds.push(application.body.data.id)
  const archived = await call(`/admin/services/${used.id}`, { method: 'DELETE' })
  assert.equal(archived.status, 200)
  assert.equal(archived.body.data.archived, true)
  for (const path of ['/services', '/admin/services']) {
    const result = await call(path)
    assert.ok(!result.body.data.some((item) => item.id === used.id))
  }
  const detail = await call(`/admin/applications/${application.body.data.id}`)
  assert.equal(detail.status, 200)
  assert.equal(detail.body.data.values[0].value_text, 'Preserved value')
  assert.ok(detail.body.data.history.length)
  const status = await call(`/admin/applications/${application.body.data.id}/status`, { method: 'PATCH', data: { status: 'diperiksa', note: 'Integration check' } })
  assert.equal(status.status, 200)
  const tracking = await call('/applications/track', { method: 'POST', authenticated: false, data: { tracking_code: application.body.data.trackingCode, whatsapp: '080000000000' } })
  assert.equal(tracking.status, 200)
  assert.equal(tracking.body.data.status, 'diperiksa')
  assert.equal((await call(`/services/${used.id}/applications`, { method: 'POST', data: { full_name: 'Blocked fixture', whatsapp: '080000000000' } })).status, 404)
  console.log('PASS: auth, unused deletion, archive, history, values, processing, tracking, and prevention of new applications.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  for (const id of applicationIds) await pool.execute('DELETE FROM service_applications WHERE id = ?', [id])
  for (const id of serviceIds) await pool.execute('DELETE FROM service_types WHERE id = ?', [id])
  await pool.end()
  console.log('Temporary test records cleaned up.')
})
