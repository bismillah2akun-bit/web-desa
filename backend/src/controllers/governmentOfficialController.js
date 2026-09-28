const fs = require('node:fs')
const path = require('node:path')
const model = require('../models/governmentOfficialModel')
const categoryModel = require('../models/officialCategoryModel')
const { officialsDirectory, areasDirectory } = require('../config/storage')
const { DEFAULT_CATEGORY } = require('../utils/officialCategories')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

// Foto lama pengurus RT/RW (hasil migrasi) masih berada di folder /uploads/areas/.
const PHOTO_DIRECTORIES = {
  '/uploads/officials/': officialsDirectory,
  '/uploads/areas/': areasDirectory,
}

function removePhoto(photoUrl) {
  const prefix = Object.keys(PHOTO_DIRECTORIES).find((item) => photoUrl?.startsWith(item))
  if (!prefix) return
  fs.rmSync(path.join(PHOTO_DIRECTORIES[prefix], path.basename(photoUrl)), { force: true })
}

async function payload(body, photoUrl = null) {
  const category = cleanText(body.category, 40) || DEFAULT_CATEGORY
  if (!await categoryModel.findBySlug(category)) throw new AppError('Kategori tidak dikenal', 400)
  const position = cleanText(body.position, 180)
  if (!position) throw new AppError('Jabatan wajib diisi', 400)
  const sortOrder = Number(body.sort_order ?? 0)
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new AppError('Urutan tampil harus berupa angka nol atau lebih', 400)
  }
  return {
    category,
    position,
    name: cleanText(body.name, 180),
    description: cleanText(body.description, 3000),
    photoUrl,
    sortOrder,
    isActive: body.is_active !== false && body.is_active !== 'false',
  }
}

async function getPublic(req, res) {
  const category = /^[a-z0-9_]{1,40}$/.test(req.query.category || '') ? req.query.category : null
  return sendSuccess(res, { data: await model.findAll({ publicOnly: true, category }) })
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await model.findAll() })
}

async function create(req, res) {
  const photoUrl = req.file ? `/uploads/officials/${req.file.filename}` : null
  try {
    return sendSuccess(res, {
      data: await model.create(await payload(req.body, photoUrl)),
      status: 201,
      message: 'Data berhasil ditambahkan',
    })
  } catch (error) {
    removePhoto(photoUrl)
    throw error
  }
}

async function update(req, res) {
  const current = await model.findById(req.params.id)
  if (!current) throw new AppError('Data tidak ditemukan', 404)
  const uploadedPhoto = req.file ? `/uploads/officials/${req.file.filename}` : null
  const removeRequested = req.body.remove_photo === 'true'
  const photoUrl = uploadedPhoto || (removeRequested ? null : current.photo_url)
  try {
    const data = await model.update(req.params.id, await payload(req.body, photoUrl))
    if ((uploadedPhoto || removeRequested) && current.photo_url !== photoUrl) removePhoto(current.photo_url)
    return sendSuccess(res, { data, message: 'Data berhasil diperbarui' })
  } catch (error) {
    removePhoto(uploadedPhoto)
    throw error
  }
}

async function remove(req, res) {
  const current = await model.findById(req.params.id)
  if (!current || !await model.remove(req.params.id)) {
    throw new AppError('Data tidak ditemukan', 404)
  }
  removePhoto(current.photo_url)
  return sendSuccess(res, { message: 'Data berhasil dihapus' })
}

module.exports = { getPublic, getAll, create, update, remove }
