const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const JSZip = require('jszip')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')
const { templatesDirectory, privateDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const elements = (node, name) => Array.from(node.getElementsByTagNameNS(W, name))
const children = (node) => Array.from(node.childNodes || []).filter((child) => child.nodeType === 1)
const value = (node, name) => elements(node, name)[0]?.getAttributeNS(W, 'val') || ''
const invalid = (message) => new AppError(message, 400)
const fieldMarker = (text) => text.trim().match(/^\[\[([^\]\r\n]{1,80})\]\]$/)?.[1]

// XML namespace placement / attribute order may change during a DOCX round-trip.
function canonicalXml(node) {
  if (node.nodeType === 3) return node.textContent.trim() ? node.textContent : ''
  if (node.nodeType !== 1) return ''
  const attributes = Array.from(node.attributes || []).filter((attribute) => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
    .map((attribute) => [attribute.namespaceURI || '', attribute.localName, attribute.value]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return JSON.stringify([node.namespaceURI, node.localName, attributes, Array.from(node.childNodes).map(canonicalXml)])
}

function parseXml(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw invalid('Template XML tidak aman')
  try {
    return new DOMParser({ onError: (level) => { if (level !== 'warning') throw invalid('Struktur template tidak valid') } }).parseFromString(xml, 'application/xml')
  } catch { throw invalid('Struktur template DOCX tidak valid') }
}

async function readEntry(entry, maxSize = 3 * 1024 * 1024) {
  if (!entry) return null
  return new Promise((resolve, reject) => {
    const buffers = []
    let size = 0
    const stream = entry.nodeStream()
    stream.on('data', (chunk) => {
      size += chunk.length
      if (size > maxSize) {
        stream.destroy()
        reject(invalid('Isi template terlalu besar untuk editor web'))
        return
      }
      buffers.push(chunk)
    })
    stream.on('error', () => reject(invalid('Isi DOCX rusak atau tidak dapat dibaca')))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })
}

function ownElements(paragraph, name) {
  return elements(paragraph, name).filter((node) => {
    let parent = node.parentNode
    while (parent && parent !== paragraph) {
      if (parent.namespaceURI === W && ['pPr', 'rPr'].includes(parent.localName)) return false
      if (parent.namespaceURI === W && parent.localName === 'p') return false
      parent = parent.parentNode
    }
    return parent === paragraph
  })
}

function paragraphText(paragraph) {
  const texts = new Set(ownElements(paragraph, 't'))
  let result = ''
  function walk(node) {
    if (node.namespaceURI === W && ['pPr', 'rPr'].includes(node.localName)) return
    if (texts.has(node)) result += node.textContent
    else if (node.namespaceURI === W && ['tab', 'br'].includes(node.localName)) result += node.localName === 'tab' ? '\t' : '\n'
    else if (node === paragraph || !(node.namespaceURI === W && node.localName === 'p')) children(node).forEach(walk)
  }
  walk(paragraph)
  return result
}

function letterheadIds(records) {
  const rows = [...records];
  const start = rows.findIndex(([, node]) => /^PEMERINTAH\s+(KABUPATEN|KOTA|DESA|PROVINSI)\b/i.test(paragraphText(node).trim()))
  if (start < 0 || start > 5) return new Set()
  const end = rows.findIndex(([, node], index) => index >= start && index < start + 12 && /^Sekretariat\b/i.test(paragraphText(node).trim()))
  if (end < 0) return new Set()
  let last = end
  while (rows[last + 1] && !paragraphText(rows[last + 1][1]).trim()) last++
  return new Set(rows.slice(0, last + 1).map(([id]) => id))
}

async function loadTemplate(requirement) {
  if (path.extname(requirement.template_stored_name || '').toLowerCase() !== '.docx') {
    throw invalid('Editor web membutuhkan template DOCX. Silakan hubungi admin agar template DOC/PDF diganti ke DOCX')
  }
  let input
  try { input = await fs.readFile(path.join(templatesDirectory, path.basename(requirement.template_stored_name))) }
  catch { throw new AppError('Template surat tidak ditemukan. Hubungi admin desa', 404) }
  return readDocument(input)
}

async function readDocument(input) {
  if (input.length > 10 * 1024 * 1024) throw invalid('Template maksimal 10 MB')
  let zip
  try { zip = await JSZip.loadAsync(input) } catch { throw invalid('Berkas bukan dokumen DOCX yang valid') }
  const entries = Object.values(zip.files)
  if (entries.length > 500 || entries.reduce((total, entry) => total + (entry._data?.uncompressedSize || 0), 0) > 30 * 1024 * 1024) {
    throw invalid('Template terlalu kompleks atau terlalu besar untuk editor web')
  }
  if (entries.some((entry) => /vbaProject|word\/embeddings\//i.test(entry.name))) throw invalid('Template dengan macro atau objek tertanam tidak didukung')
  for (const entry of entries) {
    if (entry.dir) continue
    if (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) throw invalid('Nama berkas dalam DOCX tidak aman')
    if (!/\.(xml|rels)$/i.test(entry.name)) continue
    const text = (await readEntry(entry)).toString('utf8')
    const part = parseXml(text)
    if (/macroEnabled|\bDDEAUTO\b|\bINCLUDETEXT\b|\bINCLUDEPICTURE\b/i.test(text) || elements(part, 'altChunk').length) throw invalid('Dokumen memuat konten aktif yang tidak didukung')
    if (entry.name.endsWith('.rels')) {
      for (const rel of Array.from(part.getElementsByTagName('Relationship'))) {
        if (rel.getAttribute('TargetMode') !== 'External') continue
        if (!rel.getAttribute('Type').endsWith('/hyperlink') || !/^(https?:|mailto:)/i.test(rel.getAttribute('Target'))) throw invalid('Dokumen tidak boleh memuat gambar, font, atau template dari sumber eksternal')
      }
    }
  }
  const xml = await readEntry(zip.file('word/document.xml'))
  if (!xml) throw invalid('Isi dokumen DOCX tidak ditemukan')
  const document = parseXml(xml.toString('utf8'))
  const body = elements(document, 'body')[0]
  if (!body) throw invalid('Isi surat tidak ditemukan')
  const paragraphs = elements(body, 'p')
  if (paragraphs.length > 1000) throw invalid('Template maksimal 1.000 paragraf. Pisahkan kumpulan surat menjadi template per surat')
  const records = new Map(paragraphs.map((paragraph, index) => [`p${index}`, paragraph]))
  const editableFields = new Map([...records].flatMap(([id, paragraph]) => {
    const label = fieldMarker(paragraphText(paragraph))
    return label ? [[id, label]] : []
  }))
  return { zip, document, body, records, editableFields, lockedHeader: letterheadIds(records), version: crypto.createHash('sha256').update(input).digest('hex') }
}

// Word content controls lock the letterhead in the native editor, without moving it
// into a different HTML layout. Locks are also checked on the server when saving.
async function nativeEditorDocument(requirement, { templateMode = false } = {}) {
  const loaded = await loadTemplate(requirement)
  const { document, records, lockedHeader, editableFields } = loaded
  for (const [id, paragraph] of records) {
    if (!lockedHeader.has(id) && (templateMode || !editableFields.size || editableFields.has(id))) continue
    const wrapper = document.createElementNS(W, 'w:sdt')
    const props = document.createElementNS(W, 'w:sdtPr')
    for (const [name, val] of [['tag', `desa-lock-${id}`], ['lock', 'sdtContentLocked']]) {
      const property = document.createElementNS(W, `w:${name}`)
      property.setAttributeNS(W, 'w:val', val)
      props.appendChild(property)
    }
    wrapper.appendChild(props)
    const content = document.createElementNS(W, 'w:sdtContent')
    wrapper.appendChild(content)
    paragraph.parentNode.replaceChild(wrapper, paragraph)
    content.appendChild(paragraph)
  }
  loaded.zip.file('word/document.xml', new XMLSerializer().serializeToString(document))
  const buffer = await loaded.zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { version: loaded.version, filename: requirement.template_original_name, docx: buffer.toString('base64'), fields: [...editableFields.values()] }
}

async function generateNativeLetter(requirement, draft, input, { templateMode = false } = {}) {
  const original = await loadTemplate(requirement)
  if (draft?.confirmed !== true) throw invalid('Periksa surat sebelum menyimpan')
  if (draft.version !== original.version) throw new AppError('Template sudah berubah. Buka kembali editor surat', 409)
  const edited = await readDocument(input)
  const serialize = (node) => new XMLSerializer().serializeToString(node)
  const changes = {}
  for (const [id, paragraph] of original.records) {
    const current = edited.records.get(id)
    if (!templateMode && original.editableFields.size) {
      if (!current || original.records.size !== edited.records.size) throw invalid('Struktur formulir surat tidak boleh diubah')
      if (original.editableFields.has(id)) {
        const text = paragraphText(current)
        if (fieldMarker(text)) throw invalid(`${original.editableFields.get(id)} wajib diisi`)
        changes[id] = text
      } else if (paragraphText(current) !== paragraphText(paragraph)) throw invalid('Bagian tetap pada surat tidak boleh diubah')
    }
    if (!original.lockedHeader.has(id)) continue
    if (!current || paragraphText(current) !== paragraphText(paragraph)
      || elements(current, 'drawing').map(canonicalXml).join('') !== elements(paragraph, 'drawing').map(canonicalXml).join('')) {
      throw invalid('Kop surat dikunci. Jangan mengubah teks atau posisi logo pada kop')
    }
    // Preserve the original paragraph properties/runs exactly, including spacing.
    current.parentNode.replaceChild(edited.document.importNode(paragraph, true), current)
  }
  // Fill-only citizen templates retain all original formatting, not uploaded markup.
  if (!templateMode && original.editableFields.size) {
    return generateLetter(requirement, { version: draft.version, confirmed: true, changes })
  }
  // A header's image relationship must not be retargeted by an uploaded document.
  for (const entry of Object.values(original.zip.files)) {
    if (entry.dir || !/^(word\/(media\/|header|footer)|word\/_rels\/(document|header|footer).*\.rels)/.test(entry.name)) continue
    const before = await readEntry(entry, 10 * 1024 * 1024)
    const after = await readEntry(edited.zip.file(entry.name), 10 * 1024 * 1024)
    const equal = after && (before.equals(after) || (/\.xml(?:\.rels)?$|\.rels$/.test(entry.name)
      && canonicalXml(parseXml(before.toString()).documentElement) === canonicalXml(parseXml(after.toString()).documentElement)))
    if (!equal) throw invalid('Gambar dan relasi kop asli harus tetap sama; ubah hanya isi surat')
  }
  // Page setup is deliberately fixed: resizing the editor is display zoom only.
  const originalSections = elements(original.body, 'sectPr')
  const editedSections = elements(edited.body, 'sectPr')
  if (originalSections.length !== editedSections.length) throw invalid('Bagian halaman surat tidak boleh ditambah atau dihapus')
  editedSections.forEach((section, index) => section.parentNode.replaceChild(edited.document.importNode(originalSections[index], true), section))
  for (const wrapper of elements(edited.body, 'sdt')) {
    if (!/^desa-lock-p\d+$/.test(value(wrapper, 'tag'))) continue
    const content = elements(wrapper, 'sdtContent')[0]
    if (!content) throw invalid('Penguncian surat tidak valid')
    while (content.firstChild) wrapper.parentNode.insertBefore(content.firstChild, wrapper)
    wrapper.parentNode.removeChild(wrapper)
  }
  edited.zip.file('word/document.xml', serialize(edited.document))
  const buffer = await edited.zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const filename = `${crypto.randomUUID()}.docx`
  const filePath = path.join(privateDirectory, filename)
  await fs.writeFile(filePath, buffer, { flag: 'wx' })
  return { filename, path: filePath, originalname: `${requirement.label.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 150)}-isian.docx`, mimetype: MIME, size: buffer.length }
}

async function editorDocument(requirement, { templateMode = false } = {}) {
  const loaded = await loadTemplate(requirement)
  const { zip, body, records, editableFields, lockedHeader, version } = loaded
  const identifiers = new Map([...records].map(([id, paragraph]) => [paragraph, id]))
  const images = new Map()
  const relsBuffer = await readEntry(zip.file('word/_rels/document.xml.rels'))
  if (relsBuffer) {
    const rels = parseXml(relsBuffer.toString('utf8'))
    for (const rel of Array.from(rels.getElementsByTagName('Relationship'))) {
      if (rel.getAttribute('TargetMode') === 'External') continue
      const target = path.posix.normalize(path.posix.join('word', rel.getAttribute('Target')))
      const extension = path.extname(target).toLowerCase()
      if (!target.startsWith('word/media/') || !['.png', '.jpg', '.jpeg'].includes(extension) || images.size >= 8) continue
      const data = await readEntry(zip.file(target), 2 * 1024 * 1024)
      if (data) images.set(rel.getAttribute('Id'), `data:image/${extension === '.png' ? 'png' : 'jpeg'};base64,${data.toString('base64')}`)
    }
  }
  function blocks(node) {
    return children(node).flatMap((child) => {
      if (child.namespaceURI !== W) return []
      if (child.localName === 'p') {
        const rawText = paragraphText(child)
        const id = identifiers.get(child)
        const fieldLabel = templateMode ? null : editableFields.get(id)
        const imageSources = []
        const positionedImages = []
        if (lockedHeader.has(id)) {
          for (const anchor of Array.from(child.getElementsByTagNameNS(WP, 'anchor'))) {
            const horizontal = anchor.getElementsByTagNameNS(WP, 'positionH')[0]
            const vertical = anchor.getElementsByTagNameNS(WP, 'positionV')[0]
            const extent = anchor.getElementsByTagNameNS(WP, 'extent')[0]
            const blip = anchor.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')[0]
            const ref = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
            if (horizontal?.getAttribute('relativeFrom') !== 'column' || vertical?.getAttribute('relativeFrom') !== 'paragraph' || !extent || !images.has(ref)) continue
            if (!horizontal.getElementsByTagNameNS(WP, 'posOffset').length || !vertical.getElementsByTagNameNS(WP, 'posOffset').length) continue
            positionedImages.push({ src: images.get(ref), left: Number(horizontal.textContent) / 9525,
              top: Number(vertical.textContent) / 9525, width: Number(extent.getAttribute('cx')) / 9525, height: Number(extent.getAttribute('cy')) / 9525 })
          }
        }
        for (const element of Array.from(child.getElementsByTagName('*'))) {
          const ref = element.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || element.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
          if (images.has(ref)) imageSources.push(images.get(ref))
        }
        return [{ type: 'paragraph', id, text: fieldLabel ? '' : rawText, editable: !lockedHeader.has(id) && (templateMode || !editableFields.size || Boolean(fieldLabel)),
          headerLocked: lockedHeader.has(id), positionedImages,
          fieldLabel: fieldLabel || null,
          align: value(child, 'jc'), bold: Boolean(elements(child, 'b').find((item) => !['0', 'false'].includes(item.getAttributeNS(W, 'val')))),
          size: Math.min(24, Math.max(6, Number(value(child, 'sz')) / 2 || 12)),
          images: [...new Set(imageSources)].filter((src) => !positionedImages.some((image) => image.src === src)),
        }]
      }
      if (child.localName === 'tbl') return [{ type: 'table', rows: children(child).filter((row) => row.localName === 'tr').map((row) => children(row).filter((cell) => cell.localName === 'tc').map((cell) => ({
        span: Math.min(10, Math.max(1, Number(value(cell, 'gridSpan')) || 1)), blocks: blocks(cell),
      }))) }]
      if (['sdt', 'sdtContent', 'customXml'].includes(child.localName)) return blocks(child)
      return []
    })
  }
  return { version, blocks: blocks(body), filename: requirement.template_original_name }
}

function validateChanges(loaded, draft, templateMode = false) {
  if (draft?.confirmed !== true) throw invalid('Periksa isian dan pilih Gunakan surat ini sebelum mengirim pengajuan')
  if (!draft || draft.version !== loaded.version) throw new AppError('Template surat sudah berubah. Buka editor lagi dan periksa ulang isian', 409)
  const changes = draft.changes
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).length > 1000) throw invalid('Isian surat tidak valid')
  let total = 0
  for (const [id, text] of Object.entries(changes)) {
    if (!loaded.records.has(id) || typeof text !== 'string' || text.length > 12000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) throw invalid('Teks surat tidak valid atau terlalu panjang')
    if (loaded.lockedHeader.has(id) && text !== paragraphText(loaded.records.get(id))) throw invalid('Kop surat dikunci agar teks, logo, dan posisinya tetap sesuai template asli')
    if (!templateMode && loaded.editableFields.size && !loaded.editableFields.has(id)) throw invalid('Bagian tetap pada format surat tidak boleh diubah')
    total += text.length
  }
  if (!templateMode && loaded.editableFields.size) {
    for (const [id, label] of loaded.editableFields) {
      const text = changes[id]?.trim()
      if (!text) throw invalid(`${label} wajib diisi`)
      if (text.length > 180 || /[\r\n\t]/.test(text)) throw invalid(`${label} maksimal 180 karakter dan harus satu baris`)
    }
  }
  if (total > 180000) throw invalid('Total isian surat terlalu panjang')
}

async function generateLetter(requirement, draft, { templateMode = false } = {}) {
  const loaded = await loadTemplate(requirement)
  validateChanges(loaded, draft, templateMode)
  for (const [id, text] of Object.entries(draft.changes)) {
    const paragraph = loaded.records.get(id)
    if (paragraphText(paragraph) === text) continue
    let texts = ownElements(paragraph, 't')
    if (!texts.length) {
      const run = loaded.document.createElementNS(W, 'w:r')
      const node = loaded.document.createElementNS(W, 'w:t')
      run.appendChild(node)
      paragraph.appendChild(run)
      texts = [node]
    }
    // Keep paragraph/table properties, original media and the first text run's style.
    for (const node of [...ownElements(paragraph, 'tab'), ...ownElements(paragraph, 'br')]) node.parentNode.removeChild(node)
    texts.forEach((node) => { node.textContent = ''; node.setAttribute('xml:space', 'preserve') })
    const parts = text.split(/([\n\t])/)
    texts[0].textContent = parts.shift()
    let cursor = texts[0]
    for (const part of parts) {
      const node = loaded.document.createElementNS(W, part === '\n' ? 'w:br' : part === '\t' ? 'w:tab' : 'w:t')
      if (!['\n', '\t'].includes(part)) { node.textContent = part; node.setAttribute('xml:space', 'preserve') }
      cursor.parentNode.insertBefore(node, cursor.nextSibling)
      cursor = node
    }
  }
  loaded.zip.file('word/document.xml', new XMLSerializer().serializeToString(loaded.document))
  const buffer = await loaded.zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  if (buffer.length > 20 * 1024 * 1024) throw invalid('Hasil surat terlalu besar')
  const filename = `${crypto.randomUUID()}.docx`
  const filePath = path.join(privateDirectory, filename)
  await fs.writeFile(filePath, buffer, { flag: 'wx' })
  return { filename, path: filePath, originalname: `${requirement.label.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 150)}-isian.docx`, mimetype: MIME, size: buffer.length }
}

module.exports = { editorDocument, generateLetter, nativeEditorDocument, generateNativeLetter }
