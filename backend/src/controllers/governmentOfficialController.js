const fs = require('node:fs')
const path = require('node:path')
const model = require('../models/governmentOfficialModel')
const { officialsDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function removePhoto(photoUrl) {
  if (!photoUrl?.startsWith('/uploads/officials/')) return
  fs.rmSync(path.join(officialsDirectory, path.basename(photoUrl)), { force: true })
}

function payload(body, photoUrl = null) {
  const position = cleanText(body.position, 180)
  if (!position) throw new AppError('Jabatan wajib diisi', 400)
  const sortOrder = Number(body.sort_order ?? 0)
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new AppError('Urutan tampil harus berupa angka nol atau lebih', 400)
  }
  return {
    position,
    name: cleanText(body.name, 180),
    description: cleanText(body.description, 3000),
    photoUrl,
    sortOrder,
    isActive: body.is_active !== false && body.is_active !== 'false',
  }
}

async function getPublic(_req, res) {
  return sendSuccess(res, { data: await model.findAll({ publicOnly: true }) })
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await model.findAll() })
}

async function create(req, res) {
  const photoUrl = req.file ? `/uploads/officials/${req.file.filename}` : null
  try {
    return sendSuccess(res, {
      data: await model.create(payload(req.body, photoUrl)),
      status: 201,
      message: 'Perangkat desa berhasil ditambahkan',
    })
  } catch (error) {
    removePhoto(photoUrl)
    throw error
  }
}

async function update(req, res) {
  const current = await model.findById(req.params.id)
  if (!current) throw new AppError('Data perangkat desa tidak ditemukan', 404)
  const uploadedPhoto = req.file ? `/uploads/officials/${req.file.filename}` : null
  const removeRequested = req.body.remove_photo === 'true'
  const photoUrl = uploadedPhoto || (removeRequested ? null : current.photo_url)
  try {
    const data = await model.update(req.params.id, payload(req.body, photoUrl))
    if ((uploadedPhoto || removeRequested) && current.photo_url !== photoUrl) removePhoto(current.photo_url)
    return sendSuccess(res, { data, message: 'Perangkat desa berhasil diperbarui' })
  } catch (error) {
    removePhoto(uploadedPhoto)
    throw error
  }
}

async function remove(req, res) {
  const current = await model.findById(req.params.id)
  if (!current || !await model.remove(req.params.id)) {
    throw new AppError('Data perangkat desa tidak ditemukan', 404)
  }
  removePhoto(current.photo_url)
  return sendSuccess(res, { message: 'Perangkat desa berhasil dihapus' })
}

module.exports = { getPublic, getAll, create, update, remove }
