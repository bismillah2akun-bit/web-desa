// Isolated browser/round-trip smoke test; no database or resident data is changed.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const JSZip = require('jszip')
const { DOMParser } = require('@xmldom/xmldom')

async function run() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'desa-native-editor-'))
  process.env.STORAGE_PATH = directory
  const { templatesDirectory, privateDirectory } = require('../src/config/storage')
  await fs.mkdir(templatesDirectory, { recursive: true })
  await fs.mkdir(privateDirectory, { recursive: true })
  const { nativeEditorDocument, generateNativeLetter } = require('../src/services/letterDocument')
  const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
  const browser = await chromium.launch({ headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    page.on('pageerror', (error) => { errors.push(error.message); console.error('Browser error:', error.message) })
    page.on('console', (message) => { if (message.type() === 'error') console.error('Console:', message.text()) })
    page.on('requestfailed', (request) => console.error('Request failed:', request.url()))
    const sources = path.resolve(__dirname, '../assets/service-letter-sources')
    let source
    await page.route('**/__native-test', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><style>body{margin:0}#root{height:100vh}</style></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const {default:React}=await import('/node_modules/.vite/deps/react.js');
      const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {default:Editor}=await import('/src/components/NativeDocumentEditor.jsx');
      const data=await fetch('/__native-data').then(r=>r.json());
      window.testHeading=data.testHeading;
      createRoot(document.getElementById('root')).render(React.createElement(Editor,{bytes:Uint8Array.from(atob(data.docx),c=>c.charCodeAt(0)),filename:data.filename,onReady:e=>{window.testEditor=e},onChange:()=>{},onSave:()=>{}}));
    </script></body></html>` }))
    await page.route('**/__native-data', (route) => route.fulfill({ json: source }))
    for (const filename of (await fs.readdir(sources)).filter((name) => name.endsWith('.docx'))) {
      await fs.copyFile(path.join(sources, filename), path.join(templatesDirectory, filename))
      const requirement = { label: 'Uji editor', template_stored_name: filename, template_original_name: filename }
      source = await nativeEditorDocument(requirement, { templateMode: true })
      const originalZip = await JSZip.loadAsync(Buffer.from(source.docx, 'base64'))
      const originalXml = new DOMParser().parseFromString(await originalZip.file('word/document.xml').async('string'), 'application/xml')
      const paragraphText = (p) => Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent).join('')
      const headingNode = Array.from(originalXml.getElementsByTagName('w:p')).find((p) => paragraphText(p).trim().startsWith('PEMERINTAH'))
      source.testHeading = { paraId: headingNode.getAttribute('w14:paraId'), search: paragraphText(headingNode).trim() }
      await page.goto(`${process.env.VITE_TEST_URL || 'http://127.0.0.1:5189'}/__native-test`)
      await page.waitForFunction(() => Boolean(window.testEditor), null, { timeout: 30000 }).catch(async (error) => { console.log((await page.locator('body').innerText()).slice(0, 600)); throw error })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => window.testEditor.query({ type: 'paragraphs' }).length > 10)
      await page.waitForFunction(() => !document.body.innerText.includes('Loading image'), null, { timeout: 15000 })
      const bodyText = await page.evaluate(() => {
        const paragraphs = window.testEditor.query({ type: 'paragraphs' })
        const body = paragraphs.find((p) => /^(SURAT|PENGANTAR)/i.test(p.text.trim()))
        if (!body) throw new Error('Missing test body')
        return body.text
      })
      await page.getByText(source.testHeading.search, { exact: true }).first().click()
      await page.keyboard.type('FORBIDDEN HEADER')
      assert.equal(await page.getByText(/FORBIDDEN HEADER/).count(), 0, 'header typing is locked')
      await page.getByText(bodyText, { exact: true }).first().click()
      await page.keyboard.press('End')
      await page.keyboard.type(' UJI EDITOR')
      const result = await page.evaluate(async () => {
        const data = new Uint8Array(await window.testEditor.save())
        let binary = ''; for (const byte of data) binary += String.fromCharCode(byte)
        return btoa(binary)
      })
      const buffer = Buffer.from(result, 'base64')
      await generateNativeLetter(requirement, { version: source.version, confirmed: true }, buffer, { templateMode: true })
      await assert.rejects(generateNativeLetter(requirement, { version: 'stale', confirmed: true }, buffer), /berubah/)
      const zip = await JSZip.loadAsync(buffer)
      const xml = await zip.file('word/document.xml').async('string')
      assert.match(xml, /PEMERINTAH/)
      const savedXml = new DOMParser().parseFromString(xml, 'application/xml')
      assert.ok(Array.from(savedXml.getElementsByTagName('w:t')).map((node) => node.textContent).join('').includes('UJI EDITOR'), 'typed edit is saved')
      if (filename === 'Surat Kelahiran.docx') {
        await page.screenshot({ path: path.join(directory, 'editor-kelahiran.png') })
        console.log('Screenshot:', path.join(directory, 'editor-kelahiran.png'))
      }
      console.log('PASS native DOCX open/save + stale check:', filename)
    }
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
    // Keep screenshots only for visual review; delete all temporary documents.
    await fs.rm(path.join(directory, 'private'), { recursive: true, force: true })
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
