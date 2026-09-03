const { pool: db } = require('../config/database')

async function create(application) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      `INSERT INTO service_applications
        (service_type_id, tracking_code, full_name, nik, whatsapp, email, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [application.serviceId, application.trackingCode, application.fullName,
        application.nik, application.whatsapp, application.email, application.address],
    )

    for (const value of application.values) {
      await connection.execute(
        `INSERT INTO application_values (application_id, requirement_id, value_text)
         VALUES (?, ?, ?)`,
        [result.insertId, value.requirementId, value.value],
      )
    }

    for (const file of application.files) {
      await connection.execute(
        `INSERT INTO application_files
          (application_id, requirement_id, stored_name, original_name, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, file.requirementId, file.filename, file.originalname, file.mimetype, file.size],
      )
    }

    await connection.execute(
      `INSERT INTO application_status_history (application_id, status, note)
       VALUES (?, 'diajukan', 'Pengajuan diterima oleh sistem')`,
      [result.insertId],
    )

    await connection.commit()
    return { id: result.insertId, trackingCode: application.trackingCode, status: 'diajukan' }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function findAll() {
  const [applications] = await db.query(`
    SELECT application.*, service.name AS service_name
    FROM service_applications application
    JOIN service_types service ON service.id = application.service_type_id
    ORDER BY application.submitted_at DESC
  `)
  return applications
}

async function findDetail(id) {
  const [applications] = await db.execute(
    `SELECT application.*, service.name AS service_name
     FROM service_applications application
     JOIN service_types service ON service.id = application.service_type_id
     WHERE application.id = ?`,
    [id],
  )
  if (!applications[0]) return null

  const [[values], [files], [history]] = await Promise.all([
    db.execute(`SELECT value.id, value.value_text, requirement.label, requirement.field_type
      FROM application_values value
      JOIN service_requirements requirement ON requirement.id = value.requirement_id
      WHERE value.application_id = ? ORDER BY requirement.sort_order`, [id]),
    db.execute(`SELECT file.id, file.original_name, file.mime_type, file.file_size, requirement.label
      FROM application_files file
      JOIN service_requirements requirement ON requirement.id = file.requirement_id
      WHERE file.application_id = ? ORDER BY requirement.sort_order`, [id]),
    db.execute(`SELECT status, note, created_at FROM application_status_history
      WHERE application_id = ? ORDER BY created_at, id`, [id]),
  ])
  return { ...applications[0], values, files, history }
}

async function findForTracking(code, whatsapp) {
  const [rows] = await db.execute(
    `SELECT application.id
     FROM service_applications application
     WHERE UPPER(application.tracking_code) = UPPER(?)
       AND REPLACE(REPLACE(REPLACE(application.whatsapp, ' ', ''), '-', ''), '+62', '0') =
           REPLACE(REPLACE(REPLACE(?, ' ', ''), '-', ''), '+62', '0')
     LIMIT 1`,
    [code, whatsapp],
  )
  if (!rows[0]) return null
  const detail = await findDetail(rows[0].id)
  return {
    trackingCode: detail.tracking_code,
    serviceName: detail.service_name,
    fullName: detail.full_name,
    status: detail.status,
    adminNote: detail.admin_note,
    submittedAt: detail.submitted_at,
    updatedAt: detail.updated_at,
    history: detail.history,
  }
}

async function updateStatus(id, status, note, adminId) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      'UPDATE service_applications SET status = ?, admin_note = ? WHERE id = ?',
      [status, note, id],
    )
    if (!result.affectedRows) {
      await connection.rollback()
      return null
    }
    await connection.execute(
      `INSERT INTO application_status_history (application_id, status, note, changed_by)
       VALUES (?, ?, ?, ?)`,
      [id, status, note, adminId],
    )
    await connection.commit()
    return findDetail(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function findFile(id) {
  const [rows] = await db.execute('SELECT * FROM application_files WHERE id = ?', [id])
  return rows[0] || null
}

module.exports = { create, findAll, findDetail, findForTracking, updateStatus, findFile }
