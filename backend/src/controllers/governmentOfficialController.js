const model = require('../models/governmentOfficialModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function payload(body) {
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
  return sendSuccess(res, {
    data: await model.create(payload(req.body)),
    status: 201,
    message: 'Perangkat desa berhasil ditambahkan',
  })
}

async function update(req, res) {
  const data = await model.update(req.params.id, payload(req.body))
  if (!data) throw new AppError('Data perangkat desa tidak ditemukan', 404)
  return sendSuccess(res, { data, message: 'Perangkat desa berhasil diperbarui' })
}

async function remove(req, res) {
  if (!await model.remove(req.params.id)) {
    throw new AppError('Data perangkat desa tidak ditemukan', 404)
  }
  return sendSuccess(res, { message: 'Perangkat desa berhasil dihapus' })
}

module.exports = { getPublic, getAll, create, update, remove }
