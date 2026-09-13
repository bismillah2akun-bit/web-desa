// Membagi dokumen contoh resmi menjadi template bawaan per jenis surat.
// Jalankan: node scripts/build-builtin-letter-templates.cjs /path/ke/kumpulan-surat.docx
const fs = require('node:fs/promises')
const path = require('node:path')
const JSZip = require('jszip')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')

const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('Masukkan lokasi Kumpulan_Surat_Keterangan_Desa_Tanjungjaya.docx')

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const outputDirectory = path.resolve(__dirname, '../assets/letter-templates')
const pages = [
  { filename: 'surat-keterangan-usaha.docx', start: 0, end: 25, names: { JAKARIA: 'NAMA PEMOHON' } },
  { filename: 'surat-keterangan-pindah.docx', start: 26, end: 51, names: {
    RANGGA: 'NAMA PEMOHON',
    'NENG NOVI YULIANTI': 'NAMA PENGIKUT 1',
    'ZAHIRA AL-MUTIA': 'NAMA PENGIKUT 2',
    'MUHAMMAD ATHAR ALHAQQI': 'NAMA PENGIKUT 3',
  } },
  { filename: 'surat-pengantar-skck.docx', start: 52, end: 81, names: { 'N IKA KARTIKA': 'NAMA PEMOHON' } },
  { filename: 'surat-kematian.docx', start: 82, end: 109, names: { 'AI ROHAENI': 'NAMA ALMARHUM/ALMARHUMAH' } },
  { filename: 'surat-keterangan-kelahiran.docx', start: 110, end: null, names: {
    'GILANG HILDA ARUSQI': 'NAMA ANAK',
    'ABDUL HAKIM': 'NAMA AYAH',
    'ETI MARLINA': 'NAMA IBU',
  } },
]

const elementChildren = (node) => Array.from(node.childNodes || []).filter((child) => child.nodeType === 1)

async function main() {
  const source = await fs.readFile(path.resolve(sourcePath))
  await fs.mkdir(outputDirectory, { recursive: true })

  for (const page of pages) {
    const zip = await JSZip.loadAsync(source)
    const xml = await zip.file('word/document.xml').async('string')
    const document = new DOMParser().parseFromString(xml, 'application/xml')
    const body = document.getElementsByTagNameNS(W, 'body')[0]
    const bodyChildren = elementChildren(body)
    const section = bodyChildren.find((child) => child.localName === 'sectPr')
    const content = bodyChildren.filter((child) => child.localName !== 'sectPr')
    const selected = new Set(content.slice(page.start, page.end ?? content.length))

    for (const child of content) if (!selected.has(child)) body.removeChild(child)
    if (section) body.appendChild(section)

    const found = new Set()
    for (const paragraph of Array.from(body.getElementsByTagNameNS(W, 'p'))) {
      const textNodes = Array.from(paragraph.getElementsByTagNameNS(W, 't'))
      const text = textNodes.map((node) => node.textContent).join('').trim()
      const field = page.names[text]
      if (!field) continue
      textNodes.forEach((node) => { node.textContent = '' })
      textNodes[0].textContent = `[[${field}]]`
      textNodes[0].setAttribute('xml:space', 'preserve')
      found.add(text)
    }

    const missing = Object.keys(page.names).filter((name) => !found.has(name))
    if (missing.length) throw new Error(`${page.filename}: nama tidak ditemukan: ${missing.join(', ')}`)

    zip.file('word/document.xml', new XMLSerializer().serializeToString(document))
    await fs.writeFile(path.join(outputDirectory, page.filename), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
  }

  console.log(`Lima template dibuat di ${outputDirectory}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
