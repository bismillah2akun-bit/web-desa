// Run only against an isolated database named desa_catalog_test and temporary STORAGE_PATH.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const { once } = require('node:events')
if (process.env.DB_NAME !== 'desa_catalog_test' || !process.env.STORAGE_PATH?.startsWith('/tmp/')) throw new Error('Use an isolated test database and temporary storage')
const { pool, initializeDatabase } = require('../src/config/database')
const { ensureBuiltinLetters } = require('../src/services/builtinLetters')
const { templatesDirectory, privateDirectory } = require('../src/config/storage')
const app = require('../src/app')
const jwt = require('jsonwebtoken')
const Zip = require('jszip')
let server
const paragraphs = (blocks) => blocks.flatMap((block) => block.type === 'paragraph' ? [block] : block.rows.flat().flatMap((cell) => paragraphs(cell.blocks)))

async function run() {
  for (let i = 0; i < 60; i++) {
    try { await pool.query('SELECT 1'); break } catch (err) { if (i === 59) throw err; await new Promise((resolve) => setTimeout(resolve, 500)) }
  }
  // Prepare empty schema first; this test does not need the village-content seeds.
  const schema = await fs.readFile(path.resolve(__dirname, '../sql/init.sql'), 'utf8')
  for (const statement of schema.split(';').map((value) => value.trim()).filter((value) => /^CREATE TABLE/i.test(value))) await pool.query(statement)
  await initializeDatabase()
  await ensureBuiltinLetters()
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}/api`
  const cookie = 'admin_token=' + jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  async function call(route, body, method = body ? 'POST' : 'GET', admin = true) {
    return fetch(base + route, { method, headers: { ...(admin ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
  }
  const form = (data) => { const result = new FormData(); Object.entries(data).forEach(([key, value]) => result.set(key, value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value))); return result }
  assert.equal((await call('/admin/letter-catalog', undefined, 'GET', false)).status, 401)
  const catalog = await (await call('/admin/letter-catalog')).json()
  assert.equal(catalog.data.length, 5)
  const originals = new Map()
  for (const item of catalog.data) {
    const filename = path.resolve(__dirname, '../assets/service-letter-sources', item.filename)
    originals.set(filename, crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex'))
    const response = await call('/admin/letter-editor/preview', form({ catalog_id: item.id }))
    assert.equal(response.status, 200)
    const doc = (await response.json()).data
    assert.ok(paragraphs(doc.blocks).every((block) => block.headerLocked ? !block.editable : block.editable))
  }
  const initialFiles = (await fs.readdir(templatesDirectory)).sort()
  assert.equal((await call('/admin/letter-editor/preview', form({ catalog_id: '../../secret' }))).status, 404)
  assert.equal((await call('/admin/letter-editor/preview', form({ catalog_id: catalog.data[0].id }), 'POST', false)).status, 401)
  const doc = (await (await call('/admin/letter-editor/preview', form({ catalog_id: catalog.data[0].id }))).json()).data
  const changeId = paragraphs(doc.blocks).find((block) => !block.headerLocked).id
  assert.equal((await call('/admin/letter-editor/render', form({ catalog_id: catalog.data[0].id, draft: { version: 'stale', confirmed: true, changes: {} } }))).status, 409)
  const rendered = await call('/admin/letter-editor/render', form({ catalog_id: catalog.data[0].id, draft: { version: doc.version, confirmed: true, changes: { [changeId]: 'CATALOG TEST EDIT' } } }))
  assert.equal(rendered.status, 200)
  const output = Buffer.from(await rendered.arrayBuffer())
  const zip = await Zip.loadAsync(output)
  assert.ok((await zip.file('word/document.xml').async('string')).includes('CATALOG TEST EDIT'))
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.deepEqual((await fs.readdir(templatesDirectory)).sort(), initialFiles)
  assert.deepEqual(await fs.readdir(privateDirectory), ['templates'])
  for (const [filename, expected] of originals) assert.equal(crypto.createHash('sha256').update(await fs.readFile(filename)).digest('hex'), expected)

  // Synthetic upload tests, including markers and saving a new service.
  const synthetic = new Zip()
  synthetic.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>JUDUL TEST</w:t></w:r></w:p><w:p><w:r><w:t>[[Nama]]</w:t></w:r></w:p></w:body></w:document>')
  const bytes = await synthetic.generateAsync({ type: 'nodebuffer' })
  const upload = form({})
  upload.append('template_0', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'test.docx')
  const uploadedPreview = (await (await call('/admin/letter-editor/preview', upload)).json()).data
  assert.equal(paragraphs(uploadedPreview.blocks)[1].text, '[[Nama]]')
  const create = form({ name: 'Synthetic catalog service', requirements: [{ label: 'Test surat', field_type: 'file', is_letter: true, accepted_formats: 'docx' }] })
  create.append('template_0', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'test.docx')
  const response = await call('/admin/services', create)
  assert.equal(response.status, 201)
  const service = (await response.json()).data
  const source = { service_id: String(service.id), requirement_id: String(service.requirements[0].id) }
  const savedPreview = (await (await call('/admin/letter-editor/preview', form(source))).json()).data
  const savedRender = await call('/admin/letter-editor/render', form({ ...source, draft: { version: savedPreview.version, changes: { p0: 'ADMIN EDIT', p1: '[[Nama Pemohon]]' }, confirmed: true } }))
  assert.equal(savedRender.status, 200)
  const editedBytes = Buffer.from(await savedRender.arrayBuffer())
  const update = form({ ...service, requirements: service.requirements })
  update.append('template_0', new Blob([editedBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'edited.docx')
  const updated = await call('/admin/services/' + service.id, update, 'PUT')
  assert.equal(updated.status, 200)
  const current = (await updated.json()).data
  const citizen = (await (await call(`/services/${service.id}/templates/${current.requirements[0].id}/editor`, undefined, 'GET', false)).json()).data
  assert.equal(paragraphs(citizen.blocks)[0].editable, false)
  assert.equal(paragraphs(citizen.blocks)[1].fieldLabel, 'Nama Pemohon')

  const builtins = (await (await call('/admin/services')).json()).data.find((item) => item.is_builtin)
  const saved = await call('/admin/services/' + builtins.id, { ...builtins, name: 'Admin-customized builtin', is_active: false }, 'PUT')
  assert.equal(saved.status, 200)
  const savedData = (await saved.json()).data
  await ensureBuiltinLetters()
  const afterRestart = (await (await call('/admin/services/' + builtins.id)).json()).data
  assert.equal(afterRestart.name, 'Admin-customized builtin')
  assert.equal(afterRestart.is_active, 0)
  assert.deepEqual(afterRestart.requirements.map((item) => item.id), savedData.requirements.map((item) => item.id))
  console.log('PASS: private five-letter catalog, admin preview/edit, original sources unchanged, temporary cleanup, upload/saved-template editing, public marker restrictions, service save and restart preservation.')
}
run().catch((err) => { console.error(err); process.exitCode = 1 }).finally(async () => { if (server) await new Promise((resolve) => server.close(resolve)); await pool.end() })
