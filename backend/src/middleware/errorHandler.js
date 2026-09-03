const { sendError } = require('../utils/apiResponse')

function notFound(req, res) {
  return sendError(res, {
    status: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
  })
}

function errorHandler(error, _req, res, _next) {
  const status = error.name === 'MulterError' ? 400 : error.status || error.statusCode || 500
  const isServerError = status >= 500

  if (isServerError) {
    console.error(error)
  }

  return sendError(res, {
    status,
    message: isServerError ? 'Terjadi kesalahan pada server' : error.message,
  })
}

module.exports = { notFound, errorHandler }
