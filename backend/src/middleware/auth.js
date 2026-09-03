const AppError = require('../utils/AppError')
const { verifyToken } = require('../services/authService')

function requireAuth(req, _res, next) {
  const token = req.cookies?.admin_token

  if (!token) {
    return next(new AppError('Silakan masuk sebagai admin', 401))
  }

  try {
    req.admin = verifyToken(token)
    return next()
  } catch (_error) {
    return next(new AppError('Sesi admin tidak valid atau telah berakhir', 401))
  }
}

module.exports = { requireAuth }
