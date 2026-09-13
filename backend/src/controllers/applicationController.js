const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const applicationModel = require('../models/applicationModel')
const { privateDirectory } = require('../config/storage')
const serviceModel = require('../models/serviceModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText, isValidEmail } = require('../utils/validation')
const { generateLetter, generateNativeLetter } = require('../services/letterDocument')
const { isBuiltinService } = require('../services/builtinLetters')

function trackingCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  return `TJ-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function removeUploadedFiles(files = []) {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})))
}

async function submitApplication(req, res) {
  const generatedFiles = []
  try {
    const service = await serviceModel.findById(req.params.id)
    if (!service) throw new AppError('Layanan tidak ditemukan atau sedang tidak aktif', 404)

    const fullName = cleanText(req.body.full_name, 180)
    const whatsapp = cleanText(req.body.whatsapp, 30)
    const email = cleanText(req.body.email, 180)
    if (!fullName || !whatsapp) throw new AppError('Nama lengkap dan nomor WhatsApp wajib diisi', 400)
    if (!isValidEmail(email)) throw new AppError('Format email tidak valid', 400)

    const uploadedByField = new Map((req.files || []).map((file) => [file.fieldname, file]))
    if (uploadedByField.size !== (req.files || []).length) throw new AppError('Lampiran tidak boleh duplikat', 400)
    const nativeUploads = []
    let letters = {}
    try { letters = req.body.letters_json ? JSON.parse(req.body.letters_json) : {} }
    catch { throw new AppError('Format isian surat tidak valid', 400) }
    if (!letters || typeof letters !== 'object' || Array.isArray(letters) || Object.keys(letters).length > 20) throw new AppError('Maksimal 20 surat per pengajuan', 400)
    const validLetterIds = new Set(service.requirements.filter((item) => item.field_type === 'file' && item.template_stored_name).map((item) => String(item.id)))
    if (Object.keys(letters).some((id) => !validLetterIds.has(id))) throw new AppError('Persyaratan surat sudah berubah. Muat ulang layanan', 409)
    const letterRequirements = service.requirements.filter((item) => item.field_type === 'file' && item.template_stored_name)
    if (isBuiltinService(service) && !Object.keys(letters).length) {
      throw new AppError('Pilih dan isi minimal satu jenis surat', 400)
    }
    const values = []
    const files = []

    for (const requirement of service.requirements) {
      const fieldName = `requirement_${requirement.id}`
      if (requirement.field_type === 'file') {
        if (letters[requirement.id]) {
          if (uploadedByField.has(fieldName)) throw new AppError('Surat tidak boleh dilampirkan dua kali', 400)
          const draft = letters[requirement.id]
          const nativeFile = uploadedByField.get(`letter_${requirement.id}`)
          if (draft.format === 'docx' && !nativeFile) throw new AppError('Dokumen hasil edit belum disertakan', 400)
          const generated = draft.format === 'docx'
            ? await generateNativeLetter(requirement, draft, await fs.readFile(nativeFile.path))
            : await generateLetter(requirement, draft)
          if (draft.format === 'docx') nativeUploads.push(nativeFile)
          generatedFiles.push(generated)
          files.push({ ...generated, requirementId: requirement.id })
          continue
        }
        const file = uploadedByField.get(fieldName)
        if (requirement.is_required && !file) throw new AppError(`${requirement.label} wajib ${requirement.template_stored_name ? 'diisi melalui editor surat' : 'diunggah'}`, 400)
        if (!file) continue
        const allowed = (requirement.accepted_formats || '').toLowerCase().split(',').map((item) => item.trim())
        const extension = path.extname(file.originalname).slice(1).toLowerCase()
        if (!allowed.includes(extension)) throw new AppError(`Format file ${requirement.label} tidak diizinkan`, 400)
        if (file.size > Number(requirement.max_file_size_mb || 5) * 1024 * 1024) {
          throw new AppError(`Ukuran ${requirement.label} melebihi batas`, 400)
        }
        files.push({ ...file, requirementId: requirement.id })
      } else {
        const value = cleanText(req.body[fieldName], 20000)
        if (requirement.is_required && !value) throw new AppError(`${requirement.label} wajib diisi`, 400)
        if (value) values.push({ requirementId: requirement.id, value })
      }
    }

    if (files.length - generatedFiles.length + nativeUploads.length !== (req.files || []).length || files.length > 20) {
      throw new AppError('Lampiran tidak sesuai persyaratan terbaru. Muat ulang formulir dan pilih ulang dokumen', 400)
    }
    const data = await applicationModel.create({
      serviceId: service.id,
      trackingCode: trackingCode(),
      fullName,
      nik: cleanText(req.body.nik, 20),
      whatsapp,
      email,
      address: cleanText(req.body.address, 5000),
      values,
      files,
    })
    await removeUploadedFiles(nativeUploads)
    return sendSuccess(res, { data, status: 201, message: 'Pengajuan berhasil dikirim' })
  } catch (error) {
    await removeUploadedFiles(req.files)
    await removeUploadedFiles(generatedFiles)
    throw error
  }
}

async function trackApplication(req, res) {
  const code = cleanText(req.body.tracking_code, 24)
  const whatsapp = cleanText(req.body.whatsapp, 30)
  if (!code || !whatsapp) throw new AppError('Kode pelacakan dan nomor WhatsApp wajib diisi', 400)
  const data = await applicationModel.findForTracking(code, whatsapp)
  if (!data) throw new AppError('Pengajuan tidak ditemukan. Periksa kembali kode dan nomor WhatsApp', 404)
  return sendSuccess(res, { data, message: 'Status pengajuan berhasil ditemukan' })
}

async function getApplications(_req, res) {
  return sendSuccess(res, { data: await applicationModel.findAll() })
}

async function getApplication(req, res) {
  const data = await applicationModel.findDetail(req.params.id)
  if (!data) throw new AppError('Pengajuan tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function updateApplicationStatus(req, res) {
  const allowed = new Set(['diajukan', 'diperiksa', 'revisi', 'disetujui', 'selesai', 'ditolak'])
  const status = cleanText(req.body.status, 30)
  if (!allowed.has(status)) throw new AppError('Status pengajuan tidak valid', 400)
  const note = cleanText(req.body.note, 10000)
  if (status === 'revisi' && !note) throw new AppError('Catatan revisi wajib diisi', 400)
  const data = await applicationModel.updateStatus(req.params.id, status, note, req.admin.id)
  if (!data) throw new AppError('Pengajuan tidak ditemukan', 404)
  return sendSuccess(res, { data, message: 'Status pengajuan berhasil diperbarui' })
}

async function downloadApplicationFile(req, res, next) {
  const file = await applicationModel.findFile(req.params.id)
  if (!file) throw new AppError('Dokumen tidak ditemukan', 404)
  const filePath = path.join(privateDirectory, path.basename(file.stored_name))
  return res.download(filePath, file.original_name, (error) => {
    if (error && !res.headersSent) next(new AppError('Dokumen tidak dapat dibuka', 404))
  })
}

module.exports = {
  submitApplication,
  trackApplication,
  getApplications,
  getApplication,
  updateApplicationStatus,
  downloadApplicationFile,
}
