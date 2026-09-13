const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const { templatesDirectory } = require('../config/storage')
const serviceModel = require('../models/serviceModel')
const { editorDocument, generateLetter, nativeEditorDocument, generateNativeLetter } = require('../services/letterDocument')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')

// Sources contain example personal data: never serve this directory statically.
const directory = path.resolve(__dirname, '../../assets/service-letter-sources')
async function catalog() {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile() && /\.docx$/i.test(entry.name)).map((entry) => ({
    id: Buffer.from(entry.name).toString('base64url'),
    filename: entry.name,
    label: ({ 'SKU.docx': 'Surat Keterangan Usaha', 'SKCK.docx': 'Surat Pengantar SKCK' })[entry.name] || entry.name.replace(/\.docx$/i, ''),
  })).sort((a, b) => a.label.localeCompare(b.label, 'id'))
}
async function getCatalog(_req, res) {
  res.set('Cache-Control', 'no-store')
  return sendSuccess(res, { data: await catalog() })
}
async function withSource(req, action) {
  const temporary = (req.files || []).map((file) => file.path)
  try {
    const sourceFiles = (req.files || []).filter((file) => file.fieldname === 'template_0')
    const edits = (req.files || []).filter((file) => file.fieldname === 'template_1')
    const sources = Number(Boolean(req.body.catalog_id)) + Number(Boolean(sourceFiles.length)) + Number(Boolean(req.body.service_id || req.body.requirement_id))
    if (sources !== 1 || sourceFiles.length > 1 || edits.length > 1 || sourceFiles.length + edits.length !== (req.files || []).length) throw new AppError('Pilih satu sumber template surat', 400)
    let requirement
    if (sourceFiles.length) {
      requirement = { template_stored_name: sourceFiles[0].filename, template_original_name: sourceFiles[0].originalname }
    } else if (req.body.catalog_id) {
      const item = (await catalog()).find((entry) => entry.id === req.body.catalog_id)
      if (!item) throw new AppError('Surat dalam katalog tidak ditemukan', 404)
      const filename = `${crypto.randomUUID()}.docx`
      const target = path.join(templatesDirectory, filename)
      temporary.push(target)
      await fs.copyFile(path.join(directory, item.filename), target)
      requirement = { template_stored_name: filename, template_original_name: item.filename }
    } else {
      const service = await serviceModel.findById(req.body.service_id, { includeInactive: true })
      requirement = service?.requirements.find((item) => item.id === Number(req.body.requirement_id))
      if (!requirement?.template_stored_name) throw new AppError('Template layanan tidak ditemukan. Muat ulang layanan', 404)
    }
    return await action({ ...requirement, label: 'Template surat' })
  } finally {
    await Promise.all(temporary.map((file) => fs.unlink(file).catch(() => {})))
  }
}
async function preview(req, res) {
  res.set('Cache-Control', 'no-store')
  const data = await withSource(req, (requirement) => req.query.native === '1'
    ? nativeEditorDocument(requirement, { templateMode: true }) : editorDocument(requirement, { templateMode: true }))
  return sendSuccess(res, { data })
}
async function render(req, res, next) {
  const generated = await withSource(req, async (requirement) => {
    let draft
    try { draft = JSON.parse(req.body.draft) } catch { throw new AppError('Isian template tidak valid', 400) }
    if (draft.format === 'docx') {
      const file = req.files?.find((item) => item.fieldname === 'template_1')
      if (!file) throw new AppError('Dokumen hasil edit belum disertakan', 400)
      return generateNativeLetter(requirement, draft, await fs.readFile(file.path), { templateMode: true })
    }
    return generateLetter(requirement, draft, { templateMode: true })
  })
  if (generated.size > 10 * 1024 * 1024) {
    await fs.unlink(generated.path).catch(() => {})
    throw new AppError('Hasil template melebihi batas 10 MB', 400)
  }
  res.set('Cache-Control', 'no-store')
  return res.download(generated.path, 'template-surat.docx', (error) => {
    fs.unlink(generated.path).catch(() => {})
    if (error && !res.headersSent) next(new AppError('Hasil template tidak dapat dikirim', 500))
  })
}
module.exports = { getCatalog, preview, render }
