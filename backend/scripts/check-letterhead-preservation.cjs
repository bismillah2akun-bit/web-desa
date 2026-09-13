// No database needed; only temporary copies of the five source documents are edited.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const Zip = require('jszip')
const { DOMParser } = require('@xmldom/xmldom')
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const flatten = (blocks) => blocks.flatMap((block) => block.type === 'paragraph' ? [block] : block.rows.flat().flatMap((cell) => flatten(cell.blocks)))

async function run() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'desa-letterhead-check-'))
  process.env.STORAGE_PATH = directory
  const { templatesDirectory } = require('../src/config/storage')
  const { editorDocument, generateLetter } = require('../src/services/letterDocument')
  await fs.mkdir(templatesDirectory, { recursive: true })
  try {
    const sources = path.resolve(__dirname, '../assets/service-letter-sources')
    for (const name of (await fs.readdir(sources)).filter((value) => value.endsWith('.docx'))) {
      const original = await fs.readFile(path.join(sources, name))
      await fs.copyFile(path.join(sources, name), path.join(templatesDirectory, name))
      const requirement = { template_stored_name: name, template_original_name: name, label: 'Preservation test' }
      const editor = await editorDocument(requirement, { templateMode: true })
      const blocks = flatten(editor.blocks)
      const header = blocks.filter((block) => block.headerLocked)
      assert.ok(header.length >= 4, name)
      assert.ok(header.every((block) => !block.editable))
      assert.ok(header.some((block) => block.positionedImages.length), 'Anchored logo exposed without an extra text row')
      for (const templateMode of [false, true]) await assert.rejects(
        generateLetter(requirement, { version: editor.version, changes: { [header[0].id]: 'Move header' }, confirmed: true }, { templateMode }),
        (error) => error.status === 400 && error.message.includes('Kop surat dikunci'),
      )
      const editable = blocks.find((block) => block.editable)
      const file = await generateLetter(requirement, { version: editor.version, changes: { [editable.id]: 'TEST BODY CHANGE\nBaris isi tambahan' }, confirmed: true }, { templateMode: true })
      const before = await Zip.loadAsync(original)
      const after = await Zip.loadAsync(await fs.readFile(file.path))
      const parse = async (zip) => new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml')
      const beforeDoc = await parse(before), afterDoc = await parse(after)
      const beforeP = Array.from(beforeDoc.getElementsByTagNameNS(W, 'p'))
      const afterP = Array.from(afterDoc.getElementsByTagNameNS(W, 'p'))
      for (const block of header) {
        const index = Number(block.id.slice(1))
        assert.equal(afterP[index].toString(), beforeP[index].toString(), 'Header XML, drawings and position remain unchanged')
      }
      assert.equal(afterDoc.getElementsByTagNameNS(W, 'sectPr')[0]?.toString(), beforeDoc.getElementsByTagNameNS(W, 'sectPr')[0]?.toString())
      for (const entry of Object.keys(before.files).filter((name) => /word\/(media\/|header|footer)/.test(name) && !before.files[name].dir)) {
        assert.deepEqual(await after.file(entry).async('nodebuffer'), await before.file(entry).async('nodebuffer'))
      }
      console.log('PASS:', name, '— kop locked, body editable, source positions/media/margins retained')
    }
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
}
run().catch((error) => { console.error(error); process.exitCode = 1 })
