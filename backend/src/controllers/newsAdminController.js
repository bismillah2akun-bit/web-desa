const fs = require('fs')
const path = require('path')
const newsModel = require('../models/newsAdminModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function removeUploadedImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/news/')) return
  const storageRoot = path.resolve(process.env.STORAGE_PATH || path.resolve(__dirname, '../../storage'))
  const filePath = path.join(storageRoot, 'public/news', path.basename(imageUrl))
  fs.rmSync(filePath, { force: true })
}

function payload(body, existingId = null, uploadedImage = null) {
  const title = cleanText(body.title, 255)
  if (!title) throw new AppError('Judul berita wajib diisi', 400)
  const publishedAt = body.published_at ? new Date(body.published_at) : new Date()
  if (Number.isNaN(publishedAt.getTime())) throw new AppError('Tanggal terbit tidak valid', 400)

  return {
    title,
    slug: `${slugify(title)}-${existingId || Date.now().toString(36)}`,
    category: cleanText(body.category, 80),
    summary: cleanText(body.summary, 5000),
    content: cleanText(body.content, 50000),
    imageUrl: uploadedImage || cleanText(body.image_url, 2000),
    isPublished: body.is_published !== false && body.is_published !== 'false',
    publishedAt,
  }
}

async function getAll(_req, res) {
  return sendSuccess(res, { data: await newsModel.findAll() })
}

async function getOne(req, res) {
  const data = await newsModel.findById(req.params.id)
  if (!data) throw new AppError('Berita tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function create(req, res) {
  const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : null
  try {
    const data = await newsModel.create(payload(req.body, null, imageUrl))
    return sendSuccess(res, { data, status: 201, message: 'Berita berhasil dibuat' })
  } catch (error) {
    removeUploadedImage(imageUrl)
    throw error
  }
}

async function update(req, res) {
  const existing = await newsModel.findById(req.params.id)
  if (!existing) throw new AppError('Berita tidak ditemukan', 404)
  const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : null
  try {
    const data = await newsModel.update(req.params.id, payload(req.body, req.params.id, imageUrl))
    if (imageUrl && existing.image_url !== imageUrl) removeUploadedImage(existing.image_url)
    return sendSuccess(res, { data, message: 'Berita berhasil diperbarui' })
  } catch (error) {
    removeUploadedImage(imageUrl)
    throw error
  }
}

async function remove(req, res) {
  const existing = await newsModel.findById(req.params.id)
  if (!existing || !await newsModel.remove(req.params.id)) throw new AppError('Berita tidak ditemukan', 404)
  removeUploadedImage(existing.image_url)
  return sendSuccess(res, { message: 'Berita berhasil dihapus' })
}

module.exports = { getAll, getOne, create, update, remove }
