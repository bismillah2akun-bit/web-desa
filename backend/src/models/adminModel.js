const { pool: db } = require('../config/database')

async function findByUsername(username) {
  const [rows] = await db.execute(
    `SELECT id, username, display_name, password_hash, role, is_active
     FROM admins
     WHERE LOWER(username) = ?
     LIMIT 1`,
    [username],
  )
  return rows[0] || null
}

async function updateLastLogin(id) {
  await db.execute('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [id])
}

async function ensureAdmin({ username, displayName, passwordHash }) {
  await db.execute(
    `INSERT INTO admins (username, display_name, password_hash)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       password_hash = IF(password_hash = '', VALUES(password_hash), password_hash),
       updated_at = NOW()`,
    [username, displayName, passwordHash],
  )
}

module.exports = { findByUsername, updateLastLogin, ensureAdmin }
