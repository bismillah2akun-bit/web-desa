// Run inside the local backend container. Only temporary test records are changed.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const jwt = require('jsonwebtoken')
const { pool } = require('../src/config/database')
const { newsDirectory } = require('../src/config/storage')
const base = 'http://127.0.0.1:5000'
const ids = []
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
let cookie

async function request(route, method = 'GET', body) {
  const response = await fetch(base + '/api' + route, {
    method, headers: { Cookie: cookie, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, ...(await response.json()) }
}

function upload(count, order, title = 'Gallery check ' + Date.now(), field = 'images') {
  const form = new FormData()
  form.set('title', title)
  form.set('is_published', 'true')
  if (order !== undefined) form.set('image_order', JSON.stringify(order))
  for (let i = 0; i < count; i++) form.append(field, new Blob([png], { type: 'image/png' }), `gallery-test-${i}.png`)
  return form
}

async function run() {
  const [[admin]] = await pool.query('SELECT id FROM admins WHERE is_active = TRUE LIMIT 1')
  cookie = 'admin_token=' + jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  const created = await request('/admin/news', 'POST', upload(3, [{ upload: 0 }, { upload: 1 }, { upload: 2 }]))
  assert.equal(created.status, 201, created.message)
  ids.push(created.data.id)
  const id = created.data.id
  const original = created.data.image_urls
  assert.equal(original.length, 3)
  assert.equal(created.data.image_url, original[0])
  for (const url of original) {
    const file = await fetch(base + url)
    assert.equal(file.status, 200)
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), png)
  }
  assert.deepEqual((await request('/news/' + id)).data.image_urls, original)
  const hidden = await request('/admin/news/' + id, 'PUT', { ...created.data, is_published: false })
  assert.deepEqual(hidden.data.image_urls, original)
  assert.equal((await request('/news/' + id)).status, 404)
  const edited = await request('/admin/news/' + id, 'PUT', upload(1, [{ existing: original[2] }, { upload: 0 }, { existing: original[0] }]))
  assert.equal(edited.status, 200, edited.message)
  assert.equal(edited.data.image_url, original[2])
  assert.equal(edited.data.image_urls.length, 3)
  assert.equal((await fetch(base + original[1])).status, 404)
  assert.deepEqual((await request('/news/' + id)).data.image_urls, edited.data.image_urls)
  const beforeFailure = fs.readdirSync(newsDirectory).sort()
  assert.equal((await request('/admin/news/' + id, 'PUT', upload(1, [{ existing: '/uploads/news/not-owned.png' }, { upload: 0 }]))).status, 400)
  assert.equal((await request('/admin/news', 'POST', upload(1, [{ upload: 0 }], ''))).status, 400)
  assert.equal((await request('/admin/news/4294967295', 'PUT', upload(1, [{ upload: 0 }]))).status, 404)
  assert.equal((await request('/admin/news', 'POST', upload(11))).status, 400)
  const tooLarge = upload(0, [{ upload: 0 }])
  tooLarge.append('images', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'oversized.png')
  assert.equal((await request('/admin/news', 'POST', tooLarge)).status, 400)
  assert.deepEqual(fs.readdirSync(newsDirectory).sort(), beforeFailure, 'Rejected uploads must be cleaned up')
  assert.deepEqual((await request('/admin/news/' + id)).data.image_urls, edited.data.image_urls)

  const legacy = await request('/admin/news', 'POST', upload(1, undefined, 'Legacy gallery ' + Date.now(), 'image'))
  assert.equal(legacy.status, 201)
  ids.push(legacy.data.id)
  await pool.execute('UPDATE news SET image_urls = NULL WHERE id = ?', [legacy.data.id])
  const legacyPublic = await request('/news/' + legacy.data.id)
  assert.deepEqual(legacyPublic.data.image_urls, [legacy.data.image_url])
  const legacyEdit = await request('/admin/news/' + legacy.data.id, 'PUT', { ...legacy.data, title: 'Legacy text edit ' + Date.now() })
  assert.deepEqual(legacyEdit.data.image_urls, [legacy.data.image_url])

  const cleared = await request('/admin/news/' + id, 'PUT', upload(0, []))
  assert.equal(cleared.status, 200)
  assert.deepEqual(cleared.data.image_urls, [])
  assert.equal(cleared.data.image_url, null)
  for (const url of edited.data.image_urls) assert.equal((await fetch(base + url)).status, 404)
  assert.equal((await request('/admin/news/' + legacy.data.id, 'DELETE')).status, 200)
  assert.equal((await fetch(base + legacy.data.image_url)).status, 404)
  console.log('PASS: multiple upload, public gallery, cover order, append/remove, status preservation, legacy images, validation limits and cleanup.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  for (const id of ids) await request('/admin/news/' + id, 'DELETE')
  await pool.end()
  console.log('Temporary news and uploaded test images cleaned up.')
})
