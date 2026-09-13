const fs = require('node:fs/promises')
const path = require('node:path')
const { pool } = require('../config/database')
const { templatesDirectory } = require('../config/storage')

const BUILTIN_SERVICE_SLUG = 'surat-keterangan-desa-tanjungjaya'
const assetDirectory = path.resolve(__dirname, '../../assets/letter-templates')
const letters = [
  ['surat_usaha', 'Surat Keterangan Usaha', 'surat-keterangan-usaha.docx'],
  ['surat_pindah', 'Surat Keterangan Pindah', 'surat-keterangan-pindah.docx'],
  ['surat_pengantar_skck', 'Surat Pengantar SKCK', 'surat-pengantar-skck.docx'],
  ['surat_kematian', 'Surat Kematian', 'surat-kematian.docx'],
  ['surat_kelahiran', 'Surat Keterangan Kelahiran', 'surat-keterangan-kelahiran.docx'],
].map(([fieldName, label, filename]) => ({ fieldName, label, filename: `builtin-${filename}`, assetName: filename }))

function isBuiltinService(service) {
  return service?.slug === BUILTIN_SERVICE_SLUG
}

async function copyTemplates() {
  await fs.mkdir(templatesDirectory, { recursive: true })
  await Promise.all(letters.map((letter) => fs.copyFile(
    path.join(assetDirectory, letter.assetName),
    path.join(templatesDirectory, letter.filename),
    require('node:fs').constants.COPYFILE_EXCL,
  ).catch((error) => { if (error.code !== 'EEXIST') throw error })))
}

async function ensureBuiltinLetters() {
  await copyTemplates()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT id FROM service_types WHERE slug = ? LIMIT 1 FOR UPDATE', [BUILTIN_SERVICE_SLUG])
    let serviceId = rows[0]?.id
    if (serviceId) {
      // Seed once. Admin edits, requirement versions and visibility must survive restarts.
      await connection.commit()
      return
    } else {
      const [created] = await connection.execute(
        'INSERT INTO service_types (name, slug, description, estimated_days, is_active) VALUES (?, ?, ?, ?, TRUE)',
        ['Pembuatan Surat Keterangan', BUILTIN_SERVICE_SLUG, 'Pilih satu atau beberapa surat yang dibutuhkan, lalu isi nama pada format resmi Desa Tanjungjaya.', 1],
      )
      serviceId = created.insertId
    }

    for (const [index, letter] of letters.entries()) {
      const [requirements] = await connection.execute(
        'SELECT id FROM service_requirements WHERE service_type_id = ? AND field_name = ? AND is_active = TRUE ORDER BY id DESC LIMIT 1',
        [serviceId, letter.fieldName],
      )
      const values = [letter.label, 'Pilih surat ini, isi kolom nama, lalu periksa hasilnya.', 'docx', 10, index, letter.filename, letter.assetName]
      if (requirements.length) {
        await connection.execute(`UPDATE service_requirements SET label = ?, field_type = 'file', instructions = ?, options_json = NULL,
          is_required = FALSE, accepted_formats = ?, max_file_size_mb = ?, sort_order = ?, template_stored_name = ?, template_original_name = ?
          WHERE id = ?`, [...values, requirements[0].id])
      } else {
        await connection.execute(`INSERT INTO service_requirements
          (service_type_id, label, field_name, field_type, instructions, is_required, accepted_formats,
           max_file_size_mb, sort_order, template_stored_name, template_original_name)
          VALUES (?, ?, ?, 'file', ?, FALSE, ?, ?, ?, ?, ?)`, [serviceId, letter.label, letter.fieldName, ...values.slice(1)])
      }
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { BUILTIN_SERVICE_SLUG, ensureBuiltinLetters, isBuiltinService }
