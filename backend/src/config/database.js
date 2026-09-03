const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'profil_desa',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'profil_desa',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'mysql123',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

async function testConnection() {
  await pool.query('SELECT 1')
}

async function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, '../../sql/init.sql')
  const statements = fs.readFileSync(schemaPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) await pool.query(statement)
}

module.exports = { pool, testConnection, initializeDatabase }
