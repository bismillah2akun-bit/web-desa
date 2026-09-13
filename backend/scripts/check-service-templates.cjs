// Run inside the local backend container; creates and removes only synthetic fixtures.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const jwt = require('jsonwebtoken')
const JSZip = require('jszip')
const { pool } = require('../src/config/database')
const { templatesDirectory, privateDirectory } = require('../src/config/storage')
const base = `http://127.0.0.1:${process.env.PORT || 5000}/api`
const serviceIds = []
const applicationIds = []
const createdPaths = new Set()
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
let cookie
let document

async function call(route, method = 'GET', body, authenticated = true) {
  const response = await fetch(base + route, {
    method,
    headers: { ...(authenticated ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, ...(await response.json()) }
}

function serviceForm(requirements, files = [[0, document], [1, document]]) {
  const form = new FormData()
  form.set('name', 'Template integration fixture ' + Date.now())
  form.set('is_active', 'true')
  form.set('requirements', JSON.stringify(requirements || ['Rekomendasi', 'Pernyataan'].map((label) => ({
    label, field_type: 'file', is_letter: true, is_required: true, accepted_formats: 'doc,docx,pdf', max_file_size_mb: 5,
  }))))
  files.forEach(([index, data]) => form.append(`template_${index}`, new Blob([data], { type: mime }), `template-${index}.docx`))
  return form
}

async function download(service, requirement, admin = false) {
  return fetch(`${base}/${admin ? 'admin/' : ''}services/${service.id}/templates/${requirement.id}`, { headers: admin ? { Cookie: cookie } : {} })
}

async function rememberFiles(id) {
  const [rows] = await pool.execute('SELECT template_stored_name FROM service_requirements WHERE service_type_id = ?', [id])
  for (const row of rows) if (row.template_stored_name) createdPaths.add(path.join(templatesDirectory, row.template_stored_name))
}

async function run() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Template kosong pengujian. Nama: ...</w:t></w:r></w:p></w:body></w:document>')
  document = await zip.generateAsync({ type: 'nodebuffer' })
  const [[admin]] = await pool.query('SELECT id FROM admins WHERE is_active = TRUE LIMIT 1')
  cookie = 'admin_token=' + jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  const before = (await fs.readdir(templatesDirectory)).sort()
  assert.equal((await call('/admin/services', 'POST', serviceForm(), false)).status, 401)
  const invalid = serviceForm()
  invalid.set('name', '')
  assert.equal((await call('/admin/services', 'POST', invalid)).status, 400)
  assert.equal((await call('/admin/services', 'POST', serviceForm(undefined, []))).status, 400)
  assert.equal((await call('/admin/services', 'POST', serviceForm(undefined, [[7, document]]))).status, 400)
  assert.equal((await call('/admin/services', 'POST', serviceForm(undefined, [[0, document], [0, document]]))).status, 400)
  assert.equal((await call('/admin/services', 'POST', serviceForm(undefined, [[0, Buffer.alloc(10 * 1024 * 1024 + 1)]]))).status, 400)
  const invalidType = serviceForm(undefined, [])
  invalidType.append('template_0', new Blob(['<script>bad</script>'], { type: 'text/html' }), 'test.html')
  assert.equal((await call('/admin/services', 'POST', invalidType)).status, 400)
  assert.deepEqual((await fs.readdir(templatesDirectory)).sort(), before, 'Failed uploads cleaned up')

  const created = await call('/admin/services', 'POST', serviceForm())
  assert.equal(created.status, 201, created.message)
  let service = created.data
  serviceIds.push(service.id)
  await rememberFiles(service.id)
  assert.equal(service.requirements.length, 2)
  for (const requirement of service.requirements) {
    assert.equal(requirement.has_template, true)
    assert.equal(requirement.template_stored_name, undefined)
    const file = await download(service, requirement)
    assert.equal(file.status, 200)
    assert.match(file.headers.get('content-disposition'), /attachment/)
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), document)
  }
  assert.equal((await call('/services', 'GET', undefined, false)).data.find((item) => item.id === service.id).requirements[0].has_template, true)
  const other = await call('/admin/services', 'POST', serviceForm([{ label: 'Catatan', field_type: 'text' }], []))
  assert.equal(other.status, 201)
  serviceIds.push(other.data.id)
  assert.equal((await download(other.data, service.requirements[0])).status, 404)
  assert.equal((await call(`/admin/services/${other.data.id}`, 'PUT', { ...other.data, requirements: service.requirements })).status, 400)

  const edited = await call(`/admin/services/${service.id}`, 'PUT', { ...service, description: 'Text edit preserves templates' })
  assert.equal(edited.status, 200, edited.message)
  service = edited.data
  for (const requirement of service.requirements) assert.equal((await download(service, requirement)).status, 200)
  const hidden = await call(`/admin/services/${service.id}`, 'PUT', { ...service, is_active: false })
  assert.equal(hidden.status, 200)
  service = hidden.data
  assert.equal((await download(service, service.requirements[0])).status, 404)
  assert.equal((await download(service, service.requirements[0], true)).status, 200)
  service = (await call(`/admin/services/${service.id}`, 'PUT', { ...service, is_active: true })).data

  const apply = () => {
    const form = new FormData()
    form.set('full_name', 'Synthetic template applicant')
    form.set('whatsapp', '080000000000')
    return form
  }
  assert.equal((await call(`/services/${service.id}/applications`, 'POST', apply(), false)).status, 400)
  const submission = apply()
  for (const requirement of service.requirements) submission.append(`requirement_${requirement.id}`, new Blob([document], { type: mime }), 'hasil-isian.docx')
  const submitted = await call(`/services/${service.id}/applications`, 'POST', submission, false)
  assert.equal(submitted.status, 201, submitted.message)
  applicationIds.push(submitted.data.id)
  const [stored] = await pool.execute('SELECT stored_name FROM application_files WHERE application_id = ?', [submitted.data.id])
  stored.forEach((file) => createdPaths.add(path.join(privateDirectory, file.stored_name)))
  const detail = await call(`/admin/applications/${submitted.data.id}`)
  assert.equal(detail.data.files.length, 2)
  const documentRoute = `${base}/admin/application-files/${detail.data.files[0].id}`
  assert.equal((await fetch(documentRoute)).status, 401)
  const privateDocument = await fetch(documentRoute, { headers: { Cookie: cookie } })
  assert.equal(privateDocument.status, 200)
  assert.deepEqual(Buffer.from(await privateDocument.arrayBuffer()), document)

  const oldRequirement = service.requirements[0]
  const replacement = serviceForm(service.requirements, [[0, document]])
  const replaced = await call(`/admin/services/${service.id}`, 'PUT', replacement)
  assert.equal(replaced.status, 200, replaced.message)
  service = replaced.data
  await rememberFiles(service.id)
  assert.equal((await download(service, oldRequirement)).status, 404)
  assert.equal((await call(`/admin/applications/${submitted.data.id}`)).data.files.length, 2)
  for (const requirement of service.requirements) assert.equal((await download(service, requirement)).status, 200)
  const cleared = await call(`/admin/services/${service.id}`, 'PUT', { ...service, requirements: service.requirements.map((item) => ({ ...item, remove_template: true })) })
  assert.equal(cleared.status, 200)
  assert.ok(cleared.data.requirements.every((item) => !item.has_template))
  const removed = await call(`/admin/services/${service.id}`, 'DELETE')
  assert.equal(removed.data.archived, true)
  assert.equal((await call(`/admin/applications/${submitted.data.id}`)).data.files.length, 2)
  console.log('PASS: multiple templates, download bytes, authorization, validation/cleanup, unchanged templates, inactive service, DOCX application, private download, historical edits, remove and archive.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  for (const id of applicationIds) await pool.execute('DELETE FROM service_applications WHERE id = ?', [id])
  for (const id of serviceIds) await pool.execute('DELETE FROM service_types WHERE id = ?', [id])
  for (const file of createdPaths) await fs.unlink(file).catch(() => {})
  await pool.end()
  console.log('Synthetic records and files cleaned up.')
})
