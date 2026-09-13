const fs = require('fs/promises')
const path = require('path')
const serviceModel = require('../models/serviceModel')
const { pool } = require('../config/database')
const { templatesDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')
const { editorDocument, nativeEditorDocument } = require('../services/letterDocument')
const { isBuiltinService } = require('../services/builtinLetters')

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'date', 'select', 'file'])
const FILE_FORMATS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])

function createSlug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function presentService(service) {
  if (!service) return null
  return {
    ...service,
    is_builtin: isBuiltinService(service),
    requirements: service.requirements.map(({ template_stored_name, ...requirement }) => ({
      ...requirement,
      has_template: Boolean(template_stored_name),
      can_edit_online: path.extname(template_stored_name || '').toLowerCase() === '.docx',
      instructions: template_stored_name && requirement.instructions === 'Unduh template, isi melalui Word atau aplikasi dokumen, lalu unggah surat yang sudah diisi.'
        ? 'Buka editor surat, lengkapi isian, lalu pilih Gunakan surat ini. Surat otomatis dilampirkan saat pengajuan dikirim.'
        : requirement.instructions,
    })),
  }
}

function parseRequirement(item, index) {
  if (!item || typeof item !== 'object') throw new AppError('Persyaratan tidak valid', 400)
  const label = cleanText(item.label, 180)
  const fieldType = cleanText(item.field_type, 20)
  if (!label || !FIELD_TYPES.has(fieldType)) throw new AppError(`Persyaratan ke-${index + 1} belum lengkap`, 400)
  const options = Array.isArray(item.options) ? item.options.map((option) => cleanText(option, 120)).filter(Boolean) : []
  if (fieldType === 'select' && !options.length) throw new AppError(`Pilihan untuk persyaratan “${label}” wajib diisi`, 400)
  const formats = (cleanText(item.accepted_formats, 255) || 'pdf,jpg,jpeg,png').toLowerCase().split(',').map((value) => value.trim())
  const size = Number(item.max_file_size_mb || 5)
  if (fieldType === 'file' && (formats.some((value) => !FILE_FORMATS.has(value)) || !Number.isInteger(size) || size < 1 || size > 20)) {
    throw new AppError(`Format ${label} harus PDF, DOC, DOCX, JPG, JPEG, atau PNG; ukuran 1–20 MB`, 400)
  }
  return {
    label,
    fieldName: createSlug(cleanText(item.field_name, 190) || label).replaceAll('-', '_'),
    fieldType,
    instructions: cleanText(item.instructions, 2000),
    options,
    isRequired: item.is_required !== false && item.is_required !== 0,
    acceptedFormats: fieldType === 'file' ? [...new Set(formats)].join(',') : null,
    maxFileSizeMb: fieldType === 'file' ? size : null,
    sortOrder: index,
    templateStoredName: null,
    templateOriginalName: null,
  }
}

function parseService(req, existing) {
  const body = req.body
  const name = cleanText(body.name, 180)
  if (!name) throw new AppError('Nama layanan wajib diisi', 400)
  let items = body.requirements
  if (typeof items === 'string') {
    try { items = JSON.parse(items) } catch { throw new AppError('Format persyaratan tidak valid', 400) }
  }
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new AppError('Tambahkan 1–50 persyaratan layanan', 400)
  const requirements = items.map(parseRequirement)
  const uploads = new Map()
  for (const file of req.files || []) {
    const index = Number(file.fieldname.replace('template_', ''))
    if (!requirements[index] || requirements[index].fieldType !== 'file' || uploads.has(index)) {
      throw new AppError('Template harus terhubung ke satu persyaratan upload dokumen', 400)
    }
    uploads.set(index, file)
  }
  requirements.forEach((requirement, index) => {
    const item = items[index]
    const file = uploads.get(index)
    const previous = existing?.requirements.find((row) => row.id === Number(item.id))
    if (item.id && !previous) throw new AppError('Persyaratan sudah berubah. Muat ulang layanan sebelum menyimpan', 400)
    if (file) {
      requirement.templateStoredName = file.filename
      requirement.templateOriginalName = path.basename(file.originalname).slice(0, 255)
    } else if (requirement.fieldType === 'file' && !item.remove_template && previous?.template_stored_name) {
      requirement.templateStoredName = previous.template_stored_name
      requirement.templateOriginalName = previous.template_original_name
    }
    if (item.is_letter && !requirement.templateStoredName) throw new AppError(`Unggah template untuk surat “${requirement.label}”`, 400)
  })
  const estimatedDays = body.estimated_days === '' || body.estimated_days == null ? null : Number(body.estimated_days)
  if (estimatedDays !== null && (!Number.isInteger(estimatedDays) || estimatedDays < 0 || estimatedDays > 365)) {
    throw new AppError('Estimasi proses harus antara 0 sampai 365 hari', 400)
  }
  return {
    name,
    description: cleanText(body.description, 5000),
    estimatedDays,
    isActive: ![false, 'false', 0, '0'].includes(body.is_active),
    requirements,
  }
}

// Historical requirements may still reference a template after the service is edited.
async function cleanupTemplates(names) {
  for (const name of new Set(names.filter(Boolean))) {
    try {
      const [references] = await pool.execute('SELECT id FROM service_requirements WHERE template_stored_name = ? LIMIT 1', [name])
      if (!references.length) await fs.unlink(path.join(templatesDirectory, path.basename(name))).catch((error) => {
        if (error.code !== 'ENOENT') throw error
      })
    } catch (error) {
      console.error('Could not clean up unused service template:', error.code)
    }
  }
}

async function getPublicServices(_req, res) {
  return sendSuccess(res, { data: (await serviceModel.findAll()).map(presentService) })
}

async function getAdminServices(_req, res) {
  return sendSuccess(res, { data: (await serviceModel.findAll({ includeInactive: true })).map(presentService) })
}

async function saveService(req, res, editing) {
  let id
  let previous
  try {
    previous = editing ? await serviceModel.findById(req.params.id, { includeInactive: true }) : null
    if (editing && !previous) throw new AppError('Layanan tidak ditemukan', 404)
    const service = parseService(req, previous)
    id = editing
      ? await serviceModel.update(req.params.id, service)
      : await serviceModel.create({ ...service, slug: `${createSlug(service.name)}-${Date.now().toString(36)}` })
    if (!id) throw new AppError('Layanan tidak ditemukan', 404)
  } catch (error) {
    await cleanupTemplates((req.files || []).map((file) => file.filename))
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Nama kolom persyaratan harus unik', 400)
    throw error
  }
  await cleanupTemplates((previous?.requirements || []).map((item) => item.template_stored_name))
  const data = presentService(await serviceModel.findById(id, { includeInactive: true }))
  return sendSuccess(res, { data, status: editing ? 200 : 201, message: editing ? 'Layanan berhasil diperbarui' : 'Layanan berhasil dibuat' })
}

async function getService(req, res) {
  const data = presentService(await serviceModel.findById(req.params.id, { includeInactive: true }))
  if (!data) throw new AppError('Layanan tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function deleteService(req, res) {
  const previous = await serviceModel.findById(req.params.id, { includeInactive: true })
  if (isBuiltinService(previous)) throw new AppError('Layanan surat bawaan tersimpan permanen dan tidak dapat dihapus', 409)
  const result = await serviceModel.remove(req.params.id)
  if (!result) throw new AppError('Layanan tidak ditemukan', 404)
  await cleanupTemplates((previous?.requirements || []).map((item) => item.template_stored_name))
  return sendSuccess(res, {
    data: result,
    message: result.archived
      ? 'Layanan diarsipkan. Pengajuan dan dokumen warga tetap tersimpan dan dapat diproses.'
      : 'Layanan berhasil dihapus',
  })
}

async function downloadTemplate(req, res, next) {
  const service = await serviceModel.findById(req.params.id, { includeInactive: Boolean(req.admin) })
  const requirement = service?.requirements.find((item) => item.id === Number(req.params.requirementId))
  if (!requirement?.template_stored_name) throw new AppError('Template surat tidak ditemukan atau layanan tidak aktif', 404)
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Cache-Control', 'no-store')
  return res.download(path.join(templatesDirectory, path.basename(requirement.template_stored_name)), requirement.template_original_name, (error) => {
    if (error && !res.headersSent) next(new AppError('Template belum tersedia. Hubungi admin desa', 404))
  })
}

async function getTemplateEditor(req, res) {
  const service = await serviceModel.findById(req.params.id)
  const requirement = service?.requirements.find((item) => item.id === Number(req.params.requirementId))
  if (!requirement?.template_stored_name) throw new AppError('Template surat tidak ditemukan atau layanan tidak aktif', 404)
  res.set('Cache-Control', 'no-store')
  const document = await (req.query.native === '1' ? nativeEditorDocument(requirement) : editorDocument(requirement))
  return sendSuccess(res, { data: { ...document, serviceName: service.name, label: requirement.label } })
}

module.exports = {
  getPublicServices, getAdminServices, getService, deleteService, downloadTemplate, getTemplateEditor,
  createService: (req, res) => saveService(req, res, false),
  updateService: (req, res) => saveService(req, res, true),
}
