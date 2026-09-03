const submissionModel = require('../models/submissionModel')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText, requireFields, isValidEmail } = require('../utils/validation')

async function submitContact(req, res) {
  const payload = {
    name: cleanText(req.body.name, 150),
    email: cleanText(req.body.email, 180),
    phone: cleanText(req.body.phone, 30),
    subject: cleanText(req.body.subject, 255),
    message: cleanText(req.body.message, 5000),
  }
  const missing = requireFields(payload, ['name', 'email', 'subject', 'message'])

  if (missing.length) throw new AppError('Nama, email, subjek, dan pesan wajib diisi', 400)
  if (!isValidEmail(payload.email)) throw new AppError('Format email tidak valid', 400)

  const data = await submissionModel.createContact(payload)
  return sendSuccess(res, { data, message: 'Pesan berhasil dikirim', status: 201 })
}

async function submitGuestbook(req, res) {
  const payload = {
    name: cleanText(req.body.name, 150),
    institution: cleanText(req.body.institution, 180),
    address: cleanText(req.body.address, 2000),
    phone: cleanText(req.body.phone, 30),
    email: cleanText(req.body.email, 180),
    visitPurpose: cleanText(req.body.visit_purpose, 255),
    message: cleanText(req.body.message, 5000),
    visitDate: cleanText(req.body.visit_date, 10),
  }

  if (!payload.name || !payload.visitPurpose) {
    throw new AppError('Nama dan tujuan kunjungan wajib diisi', 400)
  }
  if (!isValidEmail(payload.email)) throw new AppError('Format email tidak valid', 400)

  const data = await submissionModel.createGuestbookEntry(payload)
  return sendSuccess(res, { data, message: 'Data kunjungan berhasil dicatat', status: 201 })
}

module.exports = { submitContact, submitGuestbook }
