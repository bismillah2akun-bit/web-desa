const fs = require('fs')
const path = require('path')
const newsModel = require('../models/newsAdminModel')
const { newsDirectory } = require('../config/storage')
const { imagesFor } = require('../utils/newsImages')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function removeImages(urls) {
  for (const url of urls) {
    if (!url?.startsWith('/uploads/news/')) continue
    try {
      fs.rmSync(path.join(newsDirectory, path.basename(url)), { force: true })
    } catch (error) {
      // A filesystem cleanup failure must not invalidate an already committed update.
      console.error('Gagal membersihkan gambar berita:', error.code)
    }
  }
}

function uploadedImages(req) {
  return [...(req.files?.images || []), ...(req.files?.image || [])]
    .map((file) => `/uploads/news/${file.filename}`)
}

function resolveImages(body, existing, uploaded, legacyUpload) {
  const saved = imagesFor(existing)
  if (body.image_order === undefined) {
    // Older clients send a single cover; normal text/status edits keep the gallery.
    const images = legacyUpload ? [...uploaded, ...saved.slice(1)] : [...saved, ...uploaded]
    if (images.length > 10) throw new AppError('Maksimal 10 gambar untuk satu berita', 400)
    return images
  }
  let order
  try { order = JSON.parse(body.image_order) } catch { throw new AppError('Daftar gambar tidak valid', 400) }
  if (!Array.isArray(order) || order.length > 10) throw new AppError('Maksimal 10 gambar untuk satu berita', 400)
  const usedUploads = new Set()
  const images = order.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new AppError('Daftar gambar tidak valid', 400)
    if (typeof entry.existing === 'string' && saved.includes(entry.existing)) return entry.existing
    if (Number.isInteger(entry.upload) && entry.upload >= 0 && entry.upload < uploaded.length) {
      usedUploads.add(entry.upload)
      return uploaded[entry.upload]
    }
    throw new AppError('Gambar tidak ditemukan atau bukan milik berita ini', 400)
  })
  if (usedUploads.size !== uploaded.length || new Set(images).size !== images.length) {
    throw new AppError('Daftar gambar mengandung duplikasi atau unggahan tidak terpakai', 400)
  }
  return images
}

function payload(body, existingId, images) {
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
    images,
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
  const uploaded = uploadedImages(req)
  let id
  try {
    const images = resolveImages(req.body, null, uploaded, false)
    id = await newsModel.create(payload(req.body, null, images))
  } catch (error) {
    removeImages(uploaded)
    throw error
  }
  return sendSuccess(res, { data: await newsModel.findById(id), status: 201, message: 'Berita berhasil dibuat' })
}

async function update(req, res) {
  const uploaded = uploadedImages(req)
  let previous
  let images
  try {
    const existing = await newsModel.findById(req.params.id)
    if (!existing) throw new AppError('Berita tidak ditemukan', 404)
    previous = imagesFor(existing)
    images = resolveImages(req.body, existing, uploaded, Boolean(req.files?.image?.length))
    await newsModel.update(req.params.id, payload(req.body, req.params.id, images))
  } catch (error) {
    removeImages(uploaded)
    throw error
  }
  removeImages(previous.filter((url) => !images.includes(url)))
  return sendSuccess(res, { data: await newsModel.findById(req.params.id), message: 'Berita berhasil diperbarui' })
}

async function remove(req, res) {
  const existing = await newsModel.findById(req.params.id)
  if (!existing || !await newsModel.remove(req.params.id)) throw new AppError('Berita tidak ditemukan', 404)
  removeImages(imagesFor(existing))
  return sendSuccess(res, { message: 'Berita berhasil dihapus' })
}

module.exports = { getAll, getOne, create, update, remove }
