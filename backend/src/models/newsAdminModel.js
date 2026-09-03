const { pool: db } = require('../config/database')

async function findAll() {
  const [rows] = await db.query('SELECT * FROM news ORDER BY published_at DESC, id DESC')
  return rows
}

async function findById(id) {
  const [rows] = await db.execute('SELECT * FROM news WHERE id = ?', [id])
  return rows[0] || null
}

async function create(news) {
  const [result] = await db.execute(
    `INSERT INTO news
      (title, slug, category, summary, content, image_url, is_published, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [news.title, news.slug, news.category, news.summary, news.content, news.imageUrl, news.isPublished, news.publishedAt],
  )
  return findById(result.insertId)
}

async function update(id, news) {
  await db.execute(
    `UPDATE news
     SET title = ?, slug = ?, category = ?, summary = ?, content = ?, image_url = ?,
         is_published = ?, published_at = ?
     WHERE id = ?`,
    [news.title, news.slug, news.category, news.summary, news.content, news.imageUrl, news.isPublished, news.publishedAt, id],
  )
  return findById(id)
}

async function remove(id) {
  const [result] = await db.execute('DELETE FROM news WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = { findAll, findById, create, update, remove }
