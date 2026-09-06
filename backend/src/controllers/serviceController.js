const serviceModel = require('../models/serviceModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'date', 'select', 'file'])

function createSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseRequirement(item, index) {
  const label = cleanText(item.label, 180)
  const fieldType = cleanText(item.field_type, 20)
  if (!label || !FIELD_TYPES.has(fieldType)) {
    throw new AppError(`Persyaratan ke-${index + 1} belum lengkap`, 400)
  }

  const fieldName = createSlug(cleanText(item.field_name, 190) || label).replaceAll('-', '_')
  const options = Array.isArray(item.options)
    ? item.options.map((option) => cleanText(option, 120)).filter(Boolean)
    : []

  if (fieldType === 'select' && !options.length) {
    throw new AppError(`Pilihan untuk persyaratan “${label}” wajib diisi`, 400)
  }

  return {
    label,
    fieldName,
    fieldType,
    instructions: cleanText(item.instructions, 2000),
    options,
    isRequired: item.is_required !== false,
    acceptedFormats: fieldType === 'file'
      ? cleanText(item.accepted_formats, 255) || 'pdf,jpg,jpeg,png'
      : null,
    maxFileSizeMb: fieldType === 'file' ? Number(item.max_file_size_mb || 5) : null,
    sortOrder: index,
  }
}

async function getPublicServices(_req, res) {
  const data = await serviceModel.findAll()
  return sendSuccess(res, { data })
}

async function getAdminServices(_req, res) {
  const data = await serviceModel.findAll({ includeInactive: true })
  return sendSuccess(res, { data })
}

async function createService(req, res) {
  const name = cleanText(req.body.name, 180)
  if (!name) throw new AppError('Nama layanan wajib diisi', 400)

  const requirements = Array.isArray(req.body.requirements)
    ? req.body.requirements.map(parseRequirement)
    : []
  if (!requirements.length) throw new AppError('Tambahkan minimal satu persyaratan layanan', 400)

  const estimatedDays = req.body.estimated_days === '' ? null : Number(req.body.estimated_days)
  if (estimatedDays !== null && (!Number.isInteger(estimatedDays) || estimatedDays < 0 || estimatedDays > 365)) {
    throw new AppError('Estimasi proses harus antara 0 sampai 365 hari', 400)
  }

  try {
    const id = await serviceModel.create({
      name,
      slug: `${createSlug(name)}-${Date.now().toString(36)}`,
      description: cleanText(req.body.description, 5000),
      estimatedDays,
      isActive: req.body.is_active !== false,
      requirements,
    })
    const services = await serviceModel.findAll({ includeInactive: true })
    const data = services.find((service) => service.id === id)
    return sendSuccess(res, { data, status: 201, message: 'Layanan berhasil dibuat' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Nama kolom persyaratan harus unik', 400)
    throw error
  }
}

function parseService(body) {
  const name = cleanText(body.name, 180)
  if (!name) throw new AppError('Nama layanan wajib diisi', 400)
  const requirements = Array.isArray(body.requirements) ? body.requirements.map(parseRequirement) : []
  if (!requirements.length) throw new AppError('Tambahkan minimal satu persyaratan layanan', 400)
  const estimatedDays = body.estimated_days === '' || body.estimated_days == null
    ? null
    : Number(body.estimated_days)
  if (estimatedDays !== null && (!Number.isInteger(estimatedDays) || estimatedDays < 0 || estimatedDays > 365)) {
    throw new AppError('Estimasi proses harus antara 0 sampai 365 hari', 400)
  }
  return {
    name,
    description: cleanText(body.description, 5000),
    estimatedDays,
    isActive: body.is_active !== false,
    requirements,
  }
}

async function getService(req, res) {
  const data = await serviceModel.findById(req.params.id, { includeInactive: true })
  if (!data) throw new AppError('Layanan tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function updateService(req, res) {
  try {
    const data = await serviceModel.update(req.params.id, parseService(req.body))
    if (!data) throw new AppError('Layanan tidak ditemukan', 404)
    return sendSuccess(res, { data, message: 'Layanan berhasil diperbarui' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Nama kolom persyaratan harus unik', 400)
    throw error
  }
}

async function deleteService(req, res) {
  const result = await serviceModel.remove(req.params.id)
  if (!result) throw new AppError('Layanan tidak ditemukan', 404)
  return sendSuccess(res, {
    data: result,
    message: result.archived
      ? 'Layanan diarsipkan. Pengajuan dan dokumen warga tetap tersimpan dan dapat diproses.'
      : 'Layanan berhasil dihapus',
  })
}

module.exports = {
  getPublicServices,
  getAdminServices,
  getService,
  createService,
  updateService,
  deleteService,
}
