function sendSuccess(res, { data = null, message = 'Berhasil mengambil data', status = 200 } = {}) {
  return res.status(status).json({ success: true, message, data })
}

function sendError(res, { message = 'Terjadi kesalahan pada server', status = 500, data = null } = {}) {
  return res.status(status).json({ success: false, message, data })
}

module.exports = { sendSuccess, sendError }
