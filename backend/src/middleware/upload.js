const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const storageRoot = path.resolve(process.env.STORAGE_PATH || path.resolve(__dirname, '../../storage'))
const privateDirectory = path.join(storageRoot, 'private')
const newsDirectory = path.join(storageRoot, 'public/news')
fs.mkdirSync(privateDirectory, { recursive: true })
fs.mkdirSync(newsDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
  },
})

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])

const applicationUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error('Hanya PDF, JPG, dan PNG yang diizinkan'))
    return callback(null, true)
  },
})

const newsImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, newsDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedImages.has(file.mimetype)) {
      const error = new Error('Gambar harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

module.exports = { applicationUpload, newsImageUpload }
