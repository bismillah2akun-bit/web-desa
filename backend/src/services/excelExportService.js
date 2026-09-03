const ExcelJS = require('exceljs')

const titles = {
  applications: 'Pengajuan Layanan',
  guestbook: 'Buku Tamu',
  contacts: 'Pesan Kontak',
  news: 'Kabar Informasi',
  services: 'Daftar Layanan',
  demographics: 'Demografi',
  areas: 'Data RT RW',
}

function label(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function addSheet(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(titles[name])
  const keys = rows.length ? Object.keys(rows[0]) : ['data']
  worksheet.columns = keys.map((key) => ({ header: label(key), key, width: 22 }))
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D32' } }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(keys.length).letter}1` }

  for (const row of rows) worksheet.addRow(row)
  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true }
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7F2' } }
    }
  })
}

async function createWorkbook(data) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Website Desa Tanjungjaya'
  workbook.created = new Date()
  for (const [name, rows] of Object.entries(data)) addSheet(workbook, name, rows)
  return workbook.xlsx.writeBuffer()
}

module.exports = { createWorkbook }
