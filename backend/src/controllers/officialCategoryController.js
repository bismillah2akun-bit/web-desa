const model = require('../models/officialCategoryModel')
const { DEFAULT_CATEGORY } = require('../utils/officialCategories')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function parse(body) {
  const name = cleanText(body.name, 80)
  if (!name) throw new AppError('Nama lembaga wajib diisi', 400)
  return {
    name,
    title: cleanText(body.title, 150) || name,
    description: cleanText(body.description, 1000),
  }
}

// Kode internal dari nama, misalnya "Posyandu Melati" -> "posyandu_melati". Tidak berubah walau nama diganti.
function slugify(name) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  return base || 'lembaga'
}

async function uniqueSlug(name) {
  const base = slugify(name)
  let slug = base
  for (let index = 2; await model.findBySlug(slug); index += 1) slug = `${base}_${index}`
  return slug
}

function duplicateName(error) {
  if (error.code === 'ER_DUP_ENTRY') throw new AppError('Nama lembaga sudah ada', 400)
  throw error
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await model.findAll() })
}

async function create(req, res) {
  const input = parse(req.body)
  try {
    const data = await model.create({ ...input, slug: await uniqueSlug(input.name) })
    return sendSuccess(res, { data, status: 201, message: 'Lembaga berhasil ditambahkan' })
  } catch (error) {
    return duplicateName(error)
  }
}

async function update(req, res) {
  if (!await model.findById(req.params.id)) throw new AppError('Lembaga tidak ditemukan', 404)
  try {
    const data = await model.update(req.params.id, parse(req.body))
    return sendSuccess(res, { data, message: 'Lembaga berhasil diperbarui' })
  } catch (error) {
    return duplicateName(error)
  }
}

async function remove(req, res) {
  const current = await model.findById(req.params.id)
  if (!current) throw new AppError('Lembaga tidak ditemukan', 404)
  if (current.slug === DEFAULT_CATEGORY) throw new AppError('Kategori utama tidak dapat dihapus', 400)
  const total = await model.countOfficials(current.slug)
  if (total > 0) {
    throw new AppError(`Masih ada ${total} data di lembaga ini. Pindahkan atau hapus dulu datanya.`, 400)
  }
  await model.remove(req.params.id)
  return sendSuccess(res, { message: 'Lembaga berhasil dihapus' })
}

module.exports = { getAll, create, update, remove }
