const { pool: db } = require('../config/database')

async function findAll({ includeInactive = false } = {}) {
  const where = includeInactive
    ? 'WHERE service.deleted_at IS NULL'
    : 'WHERE service.deleted_at IS NULL AND service.is_active = TRUE'
  const [services] = await db.query(`
    SELECT service.*
    FROM service_types service
    ${where}
    ORDER BY service.name
  `)

  if (!services.length) return []

  const ids = services.map((service) => service.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [requirements] = await db.query(
    `SELECT * FROM service_requirements
     WHERE service_type_id IN (${placeholders}) AND is_active = TRUE
     ORDER BY service_type_id, sort_order, id`,
    ids,
  )

  return services.map((service) => ({
    ...service,
    requirements: requirements
      .filter((requirement) => requirement.service_type_id === service.id)
      .map((requirement) => ({
        ...requirement,
        options: requirement.options_json || [],
        options_json: undefined,
      })),
  }))
}

async function create(service) {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      `INSERT INTO service_types (name, slug, description, estimated_days, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [service.name, service.slug, service.description, service.estimatedDays, service.isActive],
    )

    for (const requirement of service.requirements) {
      await connection.execute(
        `INSERT INTO service_requirements
          (service_type_id, label, field_name, field_type, instructions, options_json,
           is_required, accepted_formats, max_file_size_mb, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          requirement.label,
          requirement.fieldName,
          requirement.fieldType,
          requirement.instructions,
          JSON.stringify(requirement.options),
          requirement.isRequired,
          requirement.acceptedFormats,
          requirement.maxFileSizeMb,
          requirement.sortOrder,
        ],
      )
    }

    await connection.commit()
    return result.insertId
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function findById(id, { includeInactive = false } = {}) {
  const services = await findAll({ includeInactive })
  return services.find((service) => service.id === Number(id)) || null
}

async function update(id, service) {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()
    const [result] = await connection.execute(
      `UPDATE service_types
       SET name = ?, description = ?, estimated_days = ?, is_active = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [service.name, service.description, service.estimatedDays, service.isActive, id],
    )
    if (!result.affectedRows) {
      await connection.rollback()
      return null
    }

    const [applications] = await connection.execute(
      'SELECT id FROM service_applications WHERE service_type_id = ? LIMIT 1', [id],
    )
    if (applications.length) {
      await connection.execute(
        'UPDATE service_requirements SET is_active = FALSE WHERE service_type_id = ? AND is_active = TRUE',
        [id],
      )
    } else {
      await connection.execute('DELETE FROM service_requirements WHERE service_type_id = ?', [id])
    }
    for (const requirement of service.requirements) {
      await connection.execute(
        `INSERT INTO service_requirements
          (service_type_id, label, field_name, field_type, instructions, options_json,
           is_required, accepted_formats, max_file_size_mb, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, requirement.label, requirement.fieldName, requirement.fieldType,
          requirement.instructions, JSON.stringify(requirement.options), requirement.isRequired,
          requirement.acceptedFormats, requirement.maxFileSizeMb, requirement.sortOrder],
      )
    }

    await connection.commit()
    return findById(id, { includeInactive: true })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function remove(id) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.execute(
      'SELECT id FROM service_types WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [id],
    )
    if (!rows.length) {
      await connection.rollback()
      return null
    }
    const [applications] = await connection.execute(
      'SELECT id FROM service_applications WHERE service_type_id = ? LIMIT 1', [id],
    )
    const archived = applications.length > 0
    if (archived) {
      await connection.execute(
        'UPDATE service_types SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id],
      )
    } else {
      await connection.execute('DELETE FROM service_types WHERE id = ?', [id])
    }
    await connection.commit()
    return { archived }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { findAll, findById, create, update, remove }
