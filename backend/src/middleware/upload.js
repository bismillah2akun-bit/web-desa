const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { privateDirectory, templatesDirectory, newsDirectory, potentialsDirectory, profileDirectory, officialsDirectory, areasDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')

fs.mkdirSync(privateDirectory, { recursive: true })
fs.mkdirSync(templatesDirectory, { recursive: true })
fs.mkdirSync(newsDirectory, { recursive: true })
fs.mkdirSync(potentialsDirectory, { recursive: true })
fs.mkdirSync(profileDirectory, { recursive: true })
fs.mkdirSync(officialsDirectory, { recursive: true })
fs.mkdirSync(areasDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
  },
})

const documentTypes = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
}

function isAllowedDocument(file) {
  return documentTypes[path.extname(file.originalname).toLowerCase()]?.includes(file.mimetype)
}

const applicationUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedDocument(file)) return callback(new AppError('Hanya PDF, DOC, DOCX, JPG, dan PNG yang diizinkan', 400))
    return callback(null, true)
  },
})

const serviceTemplateUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, templatesDirectory),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!/^template_\d+$/.test(file.fieldname) || !['.doc', '.docx', '.pdf'].includes(path.extname(file.originalname).toLowerCase()) || !isAllowedDocument(file)) {
      return callback(new AppError('Template surat harus berformat DOC, DOCX, atau PDF', 400))
    }
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
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
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

const potentialImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, potentialsDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(file.mimetype)) {
      const error = new Error('Gambar harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, profileDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => {
    if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(file.mimetype)) {
      const error = new Error('Gambar harus berformat JPG, PNG, atau WEBP')
      error.status = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

const officialImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, officialsDirectory),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
    if (types[extension] !== file.mimetype) {
      return callback(new AppError('Foto perangkat desa harus berformat JPG, PNG, atau WEBP', 400))
    }
    return callback(null, true)
  },
})

const areaImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, areasDirectory),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
    const extension = path.extname(file.originalname).toLowerCase()
    if (types[extension] !== file.mimetype) return callback(new AppError('Foto RT/RW harus berformat JPG, PNG, atau WEBP', 400))
    return callback(null, true)
  },
})

module.exports = { applicationUpload, serviceTemplateUpload, newsImageUpload, potentialImageUpload, profileImageUpload, officialImageUpload, areaImageUpload }
