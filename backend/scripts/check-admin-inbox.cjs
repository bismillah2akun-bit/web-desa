const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { pool } = require('../src/config/database')
const ids = { contacts: [], guestbook: [] }
const base = `http://127.0.0.1:${process.env.PORT || 5000}/api`

async function run() {
  const [[admin]] = await pool.query('SELECT id FROM admins WHERE is_active = TRUE LIMIT 1')
  const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  async function call(path, { method = 'GET', data, auth = true } = {}) {
    const response = await fetch(base + path, { method, headers: {
      'Content-Type': 'application/json', ...(auth ? { Cookie: `admin_token=${token}` } : {}),
    }, body: data ? JSON.stringify(data) : undefined })
    return { status: response.status, body: await response.json() }
  }
  const contact = await call('/contact', { method: 'POST', auth: false, data: {
    name: 'Inbox integration fixture', email: 'fixture@example.test', subject: 'Temporary message', message: 'Temporary',
  } })
  assert.equal(contact.status, 201); ids.contacts.push(contact.body.data.id)
  const guest = await call('/guestbook', { method: 'POST', auth: false, data: {
    name: 'Guestbook integration fixture', visit_purpose: 'Temporary visit', visit_date: '2026-09-07',
  } })
  assert.equal(guest.status, 201); ids.guestbook.push(guest.body.data.id)
  const contacts = await call('/admin/contacts')
  assert.ok(contacts.body.data.some((item) => item.id === contact.body.data.id))
  const changed = await call(`/admin/contacts/${contact.body.data.id}/status`, { method: 'PATCH', data: { status: 'dibaca' } })
  assert.equal(changed.body.data.status, 'dibaca')
  assert.equal((await call(`/admin/contacts/${contact.body.data.id}`, { method: 'DELETE' })).status, 200)
  ids.contacts.length = 0
  assert.equal((await call(`/admin/guestbook/${guest.body.data.id}`, { method: 'DELETE' })).status, 200)
  ids.guestbook.length = 0
  assert.equal((await call(`/admin/contacts/${contact.body.data.id}`, { method: 'DELETE' })).status, 404)
  assert.equal((await call(`/admin/guestbook/${guest.body.data.id}`, { method: 'DELETE' })).status, 404)
  console.log('PASS: contacts list/status/delete and guestbook delete endpoints.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  for (const id of ids.contacts) await pool.execute('DELETE FROM contacts WHERE id = ?', [id])
  for (const id of ids.guestbook) await pool.execute('DELETE FROM guestbook WHERE id = ?', [id])
  await pool.end()
  console.log('Temporary inbox records cleaned up.')
})
