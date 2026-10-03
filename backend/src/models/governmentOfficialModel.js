const { pool: db } = require('../config/database')

async function findAll({ publicOnly = false, category = null } = {}) {
  const conditions = []
  const params = []
  if (publicOnly) conditions.push('is_active = TRUE')
  if (category) {
    conditions.push('category = ?')
    params.push(category)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const [rows] = await db.query(
    `SELECT * FROM government_officials ${where} ORDER BY sort_order, id`,
    params,
  )
  return rows
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM government_officials WHERE id = ?', [id])
  return rows[0] || null
}

async function create(item) {
  const [result] = await db.execute(
    `INSERT INTO government_officials (category, position, name, description, photo_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.category, item.position, item.name, item.description, item.photoUrl, item.sortOrder, item.isActive],
  )
  return findById(result.insertId)
}

async function update(id, item) {
  const [result] = await db.execute(
    `UPDATE government_officials
     SET category = ?, position = ?, name = ?, description = ?, photo_url = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [item.category, item.position, item.name, item.description, item.photoUrl, item.sortOrder, item.isActive, id],
  )
  return result.affectedRows ? findById(id) : null
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM government_officials WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { findAll, findById, create, update, remove }
