// Local integration test. Uses synthetic letters, never residents' documents.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const jwt = require('jsonwebtoken')
const JSZip = require('jszip')
const { DOMParser } = require('@xmldom/xmldom')
const { pool } = require('../src/config/database')
const { templatesDirectory, privateDirectory } = require('../src/config/storage')
const base = `http://127.0.0.1:${process.env.PORT || 5000}/api`
const serviceIds = []
const applicationIds = []
const paths = new Set()
const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
let cookie

async function call(route, method = 'GET', body, admin = false) {
  const response = await fetch(base + route, {
    method, headers: { ...(admin ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, ...(await response.json()) }
}
function allParagraphs(blocks) {
  return blocks.flatMap((block) => block.type === 'paragraph' ? [block] : block.rows.flat().flatMap((cell) => allParagraphs(cell.blocks)))
}

async function run() {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(base + '/health')).ok) break } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  const [[admin]] = await pool.query('SELECT id FROM admins WHERE is_active=TRUE LIMIT 1')
  cookie = 'admin_token=' + jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' })
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', `<w:document xmlns:w="${W}"><w:body><w:p><w:pPr><w:jc w:val="center"/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>SURAT PERNYATAAN</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Nama</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>[Nama warga]</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>Alamat: </w:t></w:r><w:r><w:t>[Alamat warga]</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`)
  zip.file('word/media/logo.png', png)
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  const form = new FormData()
  form.set('name', 'Online letter test ' + Date.now())
  form.set('requirements', JSON.stringify([
    ...['Pernyataan', 'Rekomendasi'].map((label) => ({ label, field_type: 'file', is_required: true, is_letter: true, accepted_formats: 'docx' })),
    { label: 'KTP', field_type: 'file', is_required: true, accepted_formats: 'png' },
  ]))
  for (const index of [0, 1]) form.append(`template_${index}`, new Blob([buffer], { type: mime }), 'template.docx')
  const created = await call('/admin/services', 'POST', form, true)
  assert.equal(created.status, 201, created.message)
  const service = created.data
  serviceIds.push(service.id)
  const [templates] = await pool.execute('SELECT template_stored_name FROM service_requirements WHERE service_type_id = ?', [service.id])
  templates.forEach((row) => { if (row.template_stored_name) paths.add(path.join(templatesDirectory, row.template_stored_name)) })
  const docs = []
  for (const requirement of service.requirements.slice(0, 2)) {
    const result = await call(`/services/${service.id}/templates/${requirement.id}/editor`)
    assert.equal(result.status, 200, result.message)
    assert.equal(requirement.can_edit_online, true)
    const paragraphs = allParagraphs(result.data.blocks)
    assert.equal(paragraphs[0].text, 'SURAT PERNYATAAN', 'Property tabs must not appear in text')
    assert.equal(paragraphs[2].text, '[Nama warga]')
    docs.push(result.data)
  }
  const drafts = Object.fromEntries(service.requirements.slice(0, 2).map((requirement, i) => [requirement.id, {
    version: docs[i].version, confirmed: true, changes: { p0: 'SURAT ISIAN WARGA', p2: 'Warga Uji & Keluarga <contoh>', p3: 'Alamat: Baris satu\nBaris dua\tRT 001' },
  }]))
  const payload = (letters) => {
    const data = new FormData()
    data.set('full_name', 'Synthetic online applicant')
    data.set('whatsapp', '080000000000')
    data.set('letters_json', JSON.stringify(letters))
    data.append(`requirement_${service.requirements[2].id}`, new Blob([png], { type: 'image/png' }), 'ktp-sintetis.png')
    return data
  }
  const before = (await fs.readdir(privateDirectory)).sort()
  const invalid = structuredClone(drafts)
  invalid[service.requirements[1].id].version = 'outdated'
  assert.equal((await call(`/services/${service.id}/applications`, 'POST', payload(invalid))).status, 409)
  assert.deepEqual((await fs.readdir(privateDirectory)).sort(), before, 'Generated and uploaded files from rejected request are cleaned up')
  invalid[service.requirements[1].id] = { ...drafts[service.requirements[1].id], confirmed: false }
  assert.equal((await call(`/services/${service.id}/applications`, 'POST', payload(invalid))).status, 400)
  invalid[service.requirements[1].id] = { ...drafts[service.requirements[1].id], changes: { p999: 'Unknown paragraph' } }
  assert.equal((await call(`/services/${service.id}/applications`, 'POST', payload(invalid))).status, 400)
  assert.equal((await call(`/services/${service.id}/applications`, 'POST', payload({ 999999: drafts[service.requirements[0].id] }))).status, 409)
  const submitted = await call(`/services/${service.id}/applications`, 'POST', payload(drafts))
  assert.equal(submitted.status, 201, submitted.message)
  applicationIds.push(submitted.data.id)
  const [stored] = await pool.execute('SELECT stored_name FROM application_files WHERE application_id = ?', [submitted.data.id])
  stored.forEach((file) => paths.add(path.join(privateDirectory, file.stored_name)))
  const detail = await call(`/admin/applications/${submitted.data.id}`, 'GET', undefined, true)
  assert.equal(detail.data.files.length, 3)
  for (const file of detail.data.files.filter((item) => item.original_name.endsWith('.docx'))) {
    assert.equal((await fetch(`${base}/admin/application-files/${file.id}`)).status, 401)
    const result = await fetch(`${base}/admin/application-files/${file.id}`, { headers: { Cookie: cookie } })
    assert.equal(result.status, 200)
    const generated = await JSZip.loadAsync(Buffer.from(await result.arrayBuffer()))
    assert.deepEqual(await generated.file('word/media/logo.png').async('nodebuffer'), png)
    const xml = await generated.file('word/document.xml').async('string')
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    assert.ok(document.documentElement.textContent.includes('Warga Uji & Keluarga <contoh>'))
    assert.equal(document.getElementsByTagNameNS(W, 'tbl').length, 1)
    assert.equal(document.getElementsByTagNameNS(W, 'br').length, 1)
    assert.equal(document.getElementsByTagNameNS(W, 'tab').length, 2, 'Original tab stop plus newly typed tab retained')
    assert.ok(!xml.includes('[Nama warga]'))
  }
  const source = await fetch(`${base}/services/${service.id}/templates/${service.requirements[0].id}`)
  assert.deepEqual(Buffer.from(await source.arrayBuffer()), buffer, 'Original template never modified')
  const hidden = await call(`/admin/services/${service.id}`, 'PUT', { ...service, is_active: false }, true)
  assert.equal(hidden.status, 200)
  assert.equal((await call(`/services/${service.id}/templates/${hidden.data.requirements[0].id}/editor`)).status, 404)
  console.log('PASS: editor parsing, tables, original formatting/media, multiple online letters + KTP, generated DOCX content, private downloads, stale drafts, confirmation, validation and failure cleanup.')
}

run().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => {
  for (const id of applicationIds) await pool.execute('DELETE FROM service_applications WHERE id = ?', [id])
  for (const id of serviceIds) await pool.execute('DELETE FROM service_types WHERE id = ?', [id])
  for (const file of paths) await fs.unlink(file).catch(() => {})
  await pool.end()
  console.log('Synthetic test records and files removed.')
})
