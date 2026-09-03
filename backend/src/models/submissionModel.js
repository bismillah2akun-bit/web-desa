const { pool: db } = require('../config/database')

async function createContact({ name, email, phone, subject, message }) {
  const [result] = await db.execute(
    `INSERT INTO contacts (name, email, phone, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, phone, subject, message],
  )
  return { id: result.insertId }
}

async function createGuestbookEntry(entry) {
  const [result] = await db.execute(
    `INSERT INTO guestbook
      (name, institution, address, phone, email, visit_purpose, message, visit_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))`,
    [
      entry.name,
      entry.institution,
      entry.address,
      entry.phone,
      entry.email,
      entry.visitPurpose,
      entry.message,
      entry.visitDate,
    ],
  )
  const [rows] = await db.execute(
    `SELECT id, visit_date, created_at
     FROM guestbook
     WHERE id = ?`,
    [result.insertId],
  )

  return {
    id: rows[0].id,
    visitDate: rows[0].visit_date,
    recordedAt: rows[0].created_at,
    timezone: 'Asia/Jakarta',
  }
}

module.exports = { createContact, createGuestbookEntry }
