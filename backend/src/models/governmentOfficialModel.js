const { pool: db } = require('../config/database')

async function findAll({ publicOnly = false } = {}) {
  const where = publicOnly ? 'WHERE is_active = TRUE' : ''
  const [rows] = await db.query(
    `SELECT * FROM government_officials ${where} ORDER BY sort_order, id`,
  )
  return rows
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM government_officials WHERE id = ?', [id])
  return rows[0] || null
}

async function create(item) {
  const [result] = await db.execute(
    `INSERT INTO government_officials (position, name, description, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [item.position, item.name, item.description, item.sortOrder, item.isActive],
  )
  return findById(result.insertId)
}

async function update(id, item) {
  const [result] = await db.execute(
    `UPDATE government_officials
     SET position = ?, name = ?, description = ?, sort_order = ?, is_active = ?
     WHERE id = ?`,
    [item.position, item.name, item.description, item.sortOrder, item.isActive, id],
  )
  return result.affectedRows ? findById(id) : null
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM government_officials WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { findAll, findById, create, update, remove }
