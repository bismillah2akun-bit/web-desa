// Integration QA: isolated MySQL only. Never point this script at the village DB.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { once } = require('node:events')
const Zip = require('jszip')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const jwt = require('jsonwebtoken')
if (process.env.DB_NAME !== 'desa_catalog_test' || !process.env.STORAGE_PATH?.startsWith('/tmp/desa-letter-qa.')) throw new Error('Use an isolated QA database/storage')
const { pool } = require('../src/config/database')
const { privateDirectory, templatesDirectory } = require('../src/config/storage')
const app = require('../src/app')
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const results = []
let server, browser
const services = [], applications = []
async function check(name, action) {
  try { await action(); results.push({ name, passed: true }); console.log('PASS:', name) }
  catch (error) { results.push({ name, passed: false, error: error.message.slice(0, 350) }); console.log('FAIL:', name, error.message.slice(0, 350)) }
}
async function changeText(bytes, from, to) {
  const zip = await Zip.loadAsync(bytes)
  const doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml')
  const node = [...doc.getElementsByTagNameNS(W, 't')].find((t) => t.textContent === from)
  assert.ok(node, 'Test text exists')
  node.textContent = to
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc))
  return zip.generateAsync({ type: 'nodebuffer' })
}
async function run() {
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}/api`
  const cookie = 'admin_token=' + jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '15m' })
  const call = (route, body, admin = false, method = body ? 'POST' : 'GET') => fetch(base + route, {
    method, headers: { ...(admin ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  const form = (fields) => { const f = new FormData(); for (const [key, value] of Object.entries(fields)) f.set(key, value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value)); return f }
  const status = async (response, expected) => { assert.equal(response.status, expected, response.status === expected ? undefined : (await response.json()).message); return response }
  const zip = new Zip()
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  const p = (text, i) => `<w:p w14:paraId="${(i + 1).toString(16).padStart(8, '0')}"><w:r><w:t>${text}</w:t></w:r></w:p>`
  zip.file('word/document.xml', `<w:document xmlns:w="${W}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w:body>${['PEMERINTAH DESA UJI', 'KECAMATAN UJI', 'DESA UJI', 'Sekretariat Desa Uji', 'SURAT UJI OTOMATIS', 'Tanjungjaya, 18 September 2026', '[[Nama]]'].map(p).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>`)
  const original = await zip.generateAsync({ type: 'nodebuffer' })
  const create = form({ name: 'QA native letters', requirements: [
    { label: 'Surat utama', field_type: 'file', is_required: true, is_letter: true, accepted_formats: 'docx' },
    { label: 'Surat tambahan', field_type: 'file', is_required: false, is_letter: true, accepted_formats: 'docx' },
    { label: 'KTP sintetis', field_type: 'file', is_required: true, accepted_formats: 'png' },
  ] })
  for (const i of [0, 1]) create.append(`template_${i}`, new Blob([original], { type: MIME }), 'qa-template.docx')
  const service = (await (await status(await call('/admin/services', create, true), 201)).json()).data
  services.push(service.id)
  const [main, extra, ktp] = service.requirements
  const source = { service_id: String(service.id), requirement_id: String(main.id) }
  let publicDoc, edited, draft
  await check('Admin upload/create, native preview and source unchanged', async () => {
    publicDoc = (await (await status(await call(`/services/${service.id}/templates/${main.id}/editor?native=1`), 200)).json()).data
    assert.ok(publicDoc.docx); assert.deepEqual(publicDoc.fields, ['Nama']); assert.deepEqual(publicDoc.dateFields, ['Tanggal surat'])
    const fetched = await call(`/services/${service.id}/templates/${main.id}`)
    assert.ok(Buffer.from(await fetched.arrayBuffer()).equals(original))
  })
  if (!publicDoc) throw new Error('Cannot continue without native preview')
  const bytes = Buffer.from(publicDoc.docx, 'base64')
  edited = await changeText(await changeText(bytes, 'Tanjungjaya, 18 September 2026', 'Tanjungjaya, 19 September 2026'), '[[Nama]]', 'Warga QA & Keluarga')
  draft = { version: publicDoc.version, confirmed: true, format: 'docx' }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')
  function submission({ content = edited, metadata = draft, second = false, duplicate = false, omitFile = false, omitKtp = false } = {}) {
    const letters = { [main.id]: metadata }; if (second) letters[extra.id] = draft
    const payload = form({ full_name: 'Warga QA sintetis', whatsapp: '080000000000', letters_json: letters })
    if (!omitFile) payload.append(`letter_${main.id}`, new Blob([content], { type: MIME }), 'qa-isian.docx')
    if (second) payload.append(`letter_${extra.id}`, new Blob([content], { type: MIME }), 'qa-kedua.docx')
    if (duplicate) payload.append(`letter_${main.id}`, new Blob([content], { type: MIME }), 'duplicate.docx')
    if (!omitKtp) payload.append(`requirement_${ktp.id}`, new Blob([png], { type: 'image/png' }), 'ktp-sintetis.png')
    return payload
  }
  const submit = (payload) => call(`/services/${service.id}/applications`, payload)
  async function rejected(name, payload, code = 400) {
    await check(name, async () => {
      const before = (await fs.readdir(privateDirectory)).sort()
      await status(await submit(payload), code)
      assert.deepEqual((await fs.readdir(privateDirectory)).sort(), before, 'Rejected uploads must be cleaned')
    })
  }
  await rejected('Reject empty required letter field + cleanup', submission({ content: bytes }))
  await rejected('Reject unconfirmed draft + cleanup', submission({ metadata: { ...draft, confirmed: false } }))
  await rejected('Reject stale template + cleanup', submission({ metadata: { ...draft, version: 'stale' } }), 409)
  await rejected('Reject missing DOCX', submission({ omitFile: true }))
  await rejected('Reject missing KTP + generated-file cleanup', submission({ omitKtp: true }))
  await rejected('Reject duplicate attachment + cleanup', submission({ duplicate: true }))
  await rejected('Reject corrupt DOCX + cleanup', submission({ content: Buffer.from('not a docx') }))
  await rejected('Reject altered letterhead', submission({ content: await changeText(edited, 'PEMERINTAH DESA UJI', 'KOP DIUBAH') }))
  await rejected('Reject altered fixed content', submission({ content: await changeText(edited, 'SURAT UJI OTOMATIS', 'JUDUL DIUBAH') }))
  await rejected('Reject invalid signing date', submission({ content: await changeText(edited, 'Tanjungjaya, 19 September 2026', 'Tanjungjaya, kapan saja') }))
  await rejected('Reject field over 180 characters', submission({ content: await changeText(bytes, '[[Nama]]', 'a'.repeat(181)) }))
  const macro = await Zip.loadAsync(edited); macro.file('word/vbaProject.bin', 'test')
  await rejected('Reject macro document', submission({ content: await macro.generateAsync({ type: 'nodebuffer' }) }))
  let application
  await check('Submit two native letters + KTP, persist MySQL, admin private downloads', async () => {
    application = (await (await status(await submit(submission({ second: true })), 201)).json()).data
    applications.push(application.id)
    const detail = (await (await status(await call(`/admin/applications/${application.id}`, undefined, true), 200)).json()).data
    assert.equal(detail.files.length, 3)
    for (const file of detail.files) {
      await status(await call(`/admin/application-files/${file.id}`), 401)
      const response = await status(await call(`/admin/application-files/${file.id}`, undefined, true), 200)
      const data = Buffer.from(await response.arrayBuffer())
      if (file.mime_type === MIME) {
        const output = await Zip.loadAsync(data)
        const xml = new DOMParser().parseFromString(await output.file('word/document.xml').async('string'), 'application/xml')
        assert.ok(xml.documentElement.textContent.includes('Warga QA & Keluarga'))
        assert.ok(xml.documentElement.textContent.includes('Tanjungjaya, 19 September 2026'))
        assert.ok(xml.documentElement.textContent.includes('PEMERINTAH DESA UJI'))
        assert.ok(!xml.documentElement.textContent.includes('[[Nama]]'))
      } else assert.ok(data.equals(png))
    }
    const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM application_files WHERE application_id=?', [application.id])
    assert.equal(count.total, 3)
    const stored = await fs.readdir(privateDirectory)
    assert.equal(stored.filter((name) => name !== 'templates').length, 3, 'Input DOCX files should be removed after generation')
  })
  await check('Public tracking code works with correct WhatsApp only', async () => {
    assert.ok(application)
    await status(await call('/applications/track', { tracking_code: application.trackingCode, whatsapp: '080000000000' }), 200)
    await status(await call('/applications/track', { tracking_code: application.trackingCode, whatsapp: '080000000099' }), 404)
  })
  await check('Admin native edit/render, service update after applications, history retained', async () => {
    const preview = (await (await status(await call('/admin/letter-editor/preview?native=1', form(source), true), 200)).json()).data
    const updateBytes = await changeText(Buffer.from(preview.docx, 'base64'), 'SURAT UJI OTOMATIS', 'SURAT UJI DIPERBARUI')
    const render = form({ ...source, draft: { version: preview.version, confirmed: true, format: 'docx' } })
    render.append('template_1', new Blob([updateBytes], { type: MIME }), 'edited.docx')
    const response = await status(await call('/admin/letter-editor/render', render, true), 200)
    const file = Buffer.from(await response.arrayBuffer())
    const update = form({ ...service, requirements: service.requirements })
    update.append('template_0', new Blob([file], { type: MIME }), 'updated.docx')
    const changed = (await (await status(await call(`/admin/services/${service.id}`, update, true, 'PUT'), 200)).json()).data
    const previewAgain = (await (await status(await call(`/services/${service.id}/templates/${changed.requirements[0].id}/editor?native=1`), 200)).json()).data
    assert.notEqual(previewAgain.version, publicDoc.version)
    const detail = (await (await status(await call(`/admin/applications/${application.id}`, undefined, true), 200)).json()).data
    assert.equal(detail.files.length, 3)
    await status(await submit(submission()), 409)
  })
  await check('Admin native preview/render requires authentication', async () => {
    await status(await call('/admin/letter-editor/preview?native=1', form(source)), 401)
    await status(await call('/admin/letter-editor/render', form(source)), 401)
  })
  await browserChecks(publicDoc)
  await check('Full citizen UI: fill form, edit letter, attach KTP, submit to MySQL', async () => {
    const current = (await (await status(await call(`/admin/services/${service.id}`, undefined, true), 200)).json()).data
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
    const errors = []; page.on('pageerror', (error) => errors.push(error.message))
    // Redirect every API request to the isolated QA backend before loading the app.
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url())
      const response = await route.fetch({ url: base + url.pathname.replace(/^\/api/, '') + url.search })
      await route.fulfill({ response })
    })
    await page.goto(`${process.env.VITE_TEST_URL || 'http://localhost:5173'}/layanan?layanan=${service.id}&surat=${current.requirements[0].id}`)
    const field = page.getByText('[[Nama]]', { exact: true })
    await field.click(); await page.keyboard.press('Home'); await page.keyboard.press('Shift+End'); await page.keyboard.type('WARGA QA UI')
    await page.getByLabel('Saya sudah memeriksa isian surat ini.').check()
    await page.getByRole('button', { name: 'Gunakan surat ini', exact: true }).click()
    await page.locator('dialog.letter-editor').waitFor({ state: 'detached' })
    const citizenForm = page.locator('form').filter({ has: page.locator('input[name="full_name"]') })
    await citizenForm.locator('input[name="full_name"]').fill('Warga QA UI')
    await citizenForm.locator('input[name="whatsapp"]').fill('080000000000')
    await citizenForm.locator('input[type="file"]').setInputFiles({ name: 'ktp-sintetis.png', mimeType: 'image/png', buffer: png })
    const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/services/${service.id}/applications`) && response.request().method() === 'POST')
    await citizenForm.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click()
    const response = await responsePromise
    const result = await response.json()
    assert.equal(response.status(), 201, result.message)
    applications.push(result.data.id)
    await page.getByText('Pengajuan berhasil dikirim', { exact: true }).waitFor()
    const detail = (await (await call(`/admin/applications/${result.data.id}`, undefined, true)).json()).data
    assert.equal(detail.files.length, 2)
    assert.deepEqual(errors, [])
    await page.close()
    await check('Admin UI shows submitted letter count and opens DOCX preview', async () => {
      const adminPage = await browser.newPage({ viewport: { width: 1440, height: 950 } })
      const pageErrors = []; adminPage.on('pageerror', (error) => pageErrors.push(error.message))
      await adminPage.route('**/api/**', async (route) => {
        const url = new URL(route.request().url())
        const headers = { ...route.request().headers(), Cookie: cookie }
        const response = await route.fetch({ url: base + url.pathname.replace(/^\/api/, '') + url.search, headers })
        await route.fulfill({ response })
      })
      await adminPage.goto(`${process.env.VITE_TEST_URL || 'http://localhost:5173'}/admin/pengajuan`)
      await adminPage.getByRole('heading', { name: 'Daftar pengajuan' }).waitFor()
      const applicationCard = adminPage.getByRole('button').filter({ hasText: result.data.trackingCode })
      await applicationCard.getByText('1 surat', { exact: true }).waitFor()
      await applicationCard.getByText('1 lampiran', { exact: true }).waitFor()
      await applicationCard.click()
      await adminPage.getByRole('heading', { name: 'Surat dan lampiran warga' }).waitFor()
      assert.equal(await adminPage.getByText('Surat hasil isian warga', { exact: false }).count(), 1)
      await adminPage.getByRole('button', { name: 'Lihat surat', exact: true }).click()
      await adminPage.getByRole('heading', { name: 'Surat utama' }).waitFor()
      await adminPage.locator('.letter-native-editor').waitFor({ timeout: 30000 })
      await adminPage.getByText('WARGA QA UI', { exact: true }).waitFor()
      assert.equal(await adminPage.locator('.letter-native-editor [role="toolbar"]').count(), 0)
      await adminPage.getByRole('button', { name: 'Tutup pratinjau' }).click()
      assert.deepEqual(pageErrors, [])
      await adminPage.close()
    })
  })
}

async function browserChecks(documentData) {
  const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
  browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] })
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
  const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  let failNetwork = false
  await page.route('**/__qa-data', (route) => failNetwork ? route.abort('failed') : route.fulfill({ json: documentData }))
  await page.route('**/__qa-editor', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
    const {default:R}=await import('/node_modules/.vite/deps/react.js');const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');const {default:Letter}=await import('/src/pages/LetterEditor.jsx');
    const load=()=>fetch('/__qa-data').then(r=>r.json());
    function Test(){const [draft,setDraft]=R.useState(null),[open,setOpen]=R.useState(true);window.qaDraft=draft;return open?R.createElement(Letter,{requirement:{id:1,label:'Surat QA'},draft,onDraftChange:setDraft,loadDocument:load,onClose:()=>setOpen(false),onUse:d=>{setDraft(d);setOpen(false)}}):R.createElement('button',{onClick:()=>setOpen(true)},'Buka kembali');}
    createRoot(document.getElementById('root')).render(R.createElement(Test));
  </script></body></html>` }))
  const url = `${process.env.VITE_TEST_URL || 'http://localhost:5173'}/__qa-editor`
  await check('Browser open/edit, header lock, hidden toolbar, preview, draft reopen', async () => {
    await page.goto(url); await page.getByText('[[Nama]]', { exact: true }).waitFor()
    await page.getByText('[[Nama]]', { exact: true }).click()
    await page.keyboard.press('Home'); await page.keyboard.press('Shift+End'); await page.keyboard.type('WARGA QA BROWSER')
    await page.getByText('WARGA QA BROWSER', { exact: true }).waitFor()
    assert.equal(await page.locator('.letter-native-editor [role="toolbar"]').count(), 0)
    assert.equal(await page.locator('.letter-native-editor [class*="ruler"]').count(), 0)
    await page.getByRole('button', { name: 'Pratinjau', exact: true }).click()
    await page.getByText('WARGA QA BROWSER', { exact: true }).click(); await page.keyboard.type('FORBIDDEN')
    assert.equal(await page.getByText(/FORBIDDEN/).count(), 0)
    await page.getByRole('button', { name: 'Edit dokumen', exact: true }).click()
    await page.getByLabel('Saya sudah memeriksa isian surat ini.').check()
    await page.getByRole('button', { name: 'Gunakan surat ini', exact: true }).click()
    await page.getByRole('button', { name: 'Buka kembali', exact: true }).waitFor()
    assert.ok(await page.evaluate(() => window.qaDraft.confirmed && window.qaDraft.file.size > 0))
    await page.getByRole('button', { name: 'Buka kembali', exact: true }).click()
    await page.getByText('WARGA QA BROWSER', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Kembali ke pengajuan', exact: true }).click()
    await page.getByRole('button', { name: 'Buka kembali', exact: true }).waitFor()
    assert.ok(await page.evaluate(() => window.qaDraft.file.size > 0))
    assert.deepEqual(errors, [])
  })
  await check('Mobile document, scrolling and return button', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(url)
    // A click trial retries across the font-metric re-pagination without editing.
    await page.getByText('[[Nama]]', { exact: true }).click({ trial: true })
    assert.ok(await page.getByText('[[Nama]]', { exact: true }).isVisible())
    await page.getByRole('button', { name: 'Kembali ke pengajuan', exact: true }).click()
    await page.getByRole('button', { name: 'Buka kembali', exact: true }).waitFor()
  })
  await check('Network failure shows retry and recovers', async () => {
    failNetwork = true; await page.goto(url)
    await page.getByRole('button', { name: 'Coba lagi', exact: true }).waitFor()
    failNetwork = false; await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
    await page.getByText('[[Nama]]', { exact: true }).waitFor()
  })
}

run().catch((error) => { results.push({ name: 'Test setup', passed: false, error: error.message }); console.error(error.message) }).finally(async () => {
  if (browser) await browser.close()
  if (server) await new Promise((resolve) => server.close(resolve))
  for (const id of applications) await pool.execute('DELETE FROM service_applications WHERE id=?', [id])
  for (const id of services) await pool.execute('DELETE FROM service_types WHERE id=?', [id])
  await pool.end()
  await fs.rm(privateDirectory, { recursive: true, force: true })
  const report = path.join(process.env.STORAGE_PATH, 'native-workflow-results.json')
  await fs.writeFile(report, JSON.stringify(results, null, 2))
  console.log(`RESULT: ${results.filter((test) => test.passed).length}/${results.length} passed. Report: ${report}`)
  if (results.some((test) => !test.passed)) process.exitCode = 1
})
