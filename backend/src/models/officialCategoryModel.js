const { pool: db } = require('../config/database')

async function findAll() {
  const [rows] = await db.query('SELECT * FROM official_categories ORDER BY sort_order, id')
  return rows
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM official_categories WHERE id = ?', [id])
  return rows[0] || null
}

async function findBySlug(slug) {
  const [rows] = await db.execute('SELECT * FROM official_categories WHERE slug = ?', [slug])
  return rows[0] || null
}

async function create(item) {
  const [orderRows] = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM official_categories')
  const [result] = await db.execute(
    `INSERT INTO official_categories (slug, name, title, eyebrow, singular, position_hint, description, sort_order)
     VALUES (?, ?, ?, 'Lembaga Desa', NULL, NULL, ?, ?)`,
    [item.slug, item.name, item.title, item.description, orderRows[0].next],
  )
  return findById(result.insertId)
}

async function update(id, item) {
  const [result] = await db.execute(
    'UPDATE official_categories SET name = ?, title = ?, description = ? WHERE id = ?',
    [item.name, item.title, item.description, id],
  )
  return result.affectedRows ? findById(id) : null
}

async function countOfficials(slug) {
  const [rows] = await db.execute('SELECT COUNT(*) AS total FROM government_officials WHERE category = ?', [slug])
  return Number(rows[0].total)
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM official_categories WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { findAll, findById, findBySlug, create, update, countOfficials, remove }
