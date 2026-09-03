const { pool: db } = require('../config/database')

async function findGuestbook() {
  const [rows] = await db.query('SELECT * FROM guestbook ORDER BY created_at DESC')
  return rows
}

async function updateGuestbookStatus(id, status) {
  const [result] = await db.execute('UPDATE guestbook SET status = ? WHERE id = ?', [status, id])
  if (!result.affectedRows) return null
  const [rows] = await db.execute('SELECT * FROM guestbook WHERE id = ?', [id])
  return rows[0]
}

async function getExportData() {
  const queries = await Promise.all([
    db.query(`SELECT application.tracking_code AS kode, service.name AS layanan,
      application.full_name AS nama, application.nik, application.whatsapp,
      application.email, application.address AS alamat, application.status,
      application.admin_note AS catatan_admin, application.submitted_at AS diajukan_pada,
      application.updated_at AS diperbarui_pada
      FROM service_applications application
      JOIN service_types service ON service.id = application.service_type_id
      ORDER BY application.submitted_at DESC`),
    db.query(`SELECT name AS nama, institution AS instansi, address AS alamat, phone AS telepon,
      email, visit_purpose AS tujuan_kunjungan, message AS pesan, visit_date AS tanggal_kunjungan,
      status, created_at AS dicatat_pada FROM guestbook ORDER BY created_at DESC`),
    db.query(`SELECT name AS nama, email, phone AS telepon, subject AS subjek, message AS pesan,
      status, created_at AS diterima_pada FROM contacts ORDER BY created_at DESC`),
    db.query(`SELECT title AS judul, category AS kategori, summary AS ringkasan,
      is_published AS ditampilkan, published_at AS tanggal_terbit, updated_at AS diperbarui_pada
      FROM news ORDER BY published_at DESC`),
    db.query(`SELECT name AS layanan, description AS deskripsi, estimated_days AS estimasi_hari,
      is_active AS aktif, created_at AS dibuat_pada, updated_at AS diperbarui_pada
      FROM service_types ORDER BY name`),
    db.query(`SELECT male_population AS laki_laki, female_population AS perempuan,
      household_count AS jumlah_kk, rw_count AS jumlah_rw, rt_count AS jumlah_rt,
      data_year AS tahun_data, source AS sumber, status, updated_at AS diperbarui_pada
      FROM demographic_summary ORDER BY id DESC`),
    db.query(`SELECT rw_number AS rw, rt_number AS rt, household_count AS jumlah_kk,
      male_population AS laki_laki, female_population AS perempuan, data_year AS tahun_data,
      source AS sumber, status, updated_at AS diperbarui_pada
      FROM administrative_areas ORDER BY rw_number, rt_number`),
  ])

  const [applications, guestbook, contacts, news, services, demographics, areas] = queries.map(([rows]) => rows)
  return { applications, guestbook, contacts, news, services, demographics, areas }
}

module.exports = { findGuestbook, updateGuestbookStatus, getExportData }
