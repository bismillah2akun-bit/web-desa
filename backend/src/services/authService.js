const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const adminModel = require('../models/adminModel')
const AppError = require('../utils/AppError')

const TOKEN_LIFETIME = '8h'

function getJwtSecret() {
  return process.env.JWT_SECRET || 'development-secret-change-me'
}

function toPublicAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.display_name,
    role: admin.role,
  }
}

async function authenticate(username, password) {
  const admin = await adminModel.findByUsername(username)
  const isValid = admin && admin.is_active && await bcrypt.compare(password, admin.password_hash)

  if (!isValid) throw new AppError('Username atau kata sandi tidak sesuai', 401)

  const publicAdmin = toPublicAdmin(admin)
  const token = jwt.sign(publicAdmin, getJwtSecret(), { expiresIn: TOKEN_LIFETIME })
  await adminModel.updateLastLogin(admin.id)

  return { admin: publicAdmin, token }
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret())
}

async function ensureDefaultAdmin() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'TanjungjayaAdmin123!'
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Administrator Desa'
  const passwordHash = await bcrypt.hash(password, 12)

  await adminModel.ensureAdmin({ username, displayName, passwordHash })
}

module.exports = { authenticate, verifyToken, ensureDefaultAdmin }
