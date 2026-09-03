const authService = require('../services/authService')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

const COOKIE_NAME = 'admin_token'
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}

async function login(req, res) {
  const username = cleanText(req.body.username, 80)?.toLowerCase()
  const password = String(req.body.password || '')
  if (!username || !password) throw new AppError('Username dan kata sandi wajib diisi', 400)

  const { admin, token } = await authService.authenticate(username, password)
  res.cookie(COOKIE_NAME, token, cookieOptions())
  return sendSuccess(res, { data: admin, message: 'Berhasil masuk' })
}

function me(req, res) {
  return sendSuccess(res, { data: req.admin, message: 'Sesi admin aktif' })
}

function logout(req, res) {
  const options = cookieOptions()
  delete options.maxAge
  res.clearCookie(COOKIE_NAME, options)
  return sendSuccess(res, { message: 'Berhasil keluar' })
}

module.exports = { login, me, logout }
