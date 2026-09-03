const adminDataModel = require('../models/adminDataModel')
const { createWorkbook } = require('../services/excelExportService')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

async function getGuestbook(_req, res) {
  return sendSuccess(res, { data: await adminDataModel.findGuestbook() })
}

async function updateGuestbookStatus(req, res) {
  const allowed = new Set(['baru', 'dibaca', 'selesai'])
  const status = cleanText(req.body.status, 30)
  if (!allowed.has(status)) throw new AppError('Status buku tamu tidak valid', 400)
  const data = await adminDataModel.updateGuestbookStatus(req.params.id, status)
  if (!data) throw new AppError('Data buku tamu tidak ditemukan', 404)
  return sendSuccess(res, { data, message: 'Status buku tamu berhasil diperbarui' })
}

async function exportExcel(_req, res) {
  const buffer = await createWorkbook(await adminDataModel.getExportData())
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="data-desa-tanjungjaya-${date}.xlsx"`)
  return res.send(buffer)
}

module.exports = { getGuestbook, updateGuestbookStatus, exportExcel }
