const dashboardModel = require('../models/dashboardModel')
const { sendSuccess } = require('../utils/apiResponse')

async function getDashboard(_req, res) {
  const data = await dashboardModel.getSummary()
  return sendSuccess(res, {
    data,
    message: 'Ringkasan dashboard berhasil diambil',
  })
}

module.exports = { getDashboard }
