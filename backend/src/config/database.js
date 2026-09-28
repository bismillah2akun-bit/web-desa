const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
const { SEED_CATEGORIES } = require('../utils/officialCategories')

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

// Data Ketua RT/RW dulu ada di tabel sendiri (neighborhood_officials).
// Sekarang dipindah ke government_officials dengan kategori 'rtrw'. Tabel lama TIDAK dihapus,
// hanya diganti nama menjadi neighborhood_officials_backup. Aman dijalankan berulang.
async function migrateNeighborhoodOfficials() {
  const [legacy] = await pool.query("SHOW TABLES LIKE 'neighborhood_officials'")
  if (!legacy.length) return
  await pool.query(`INSERT INTO government_officials (category, position, name, description, photo_url, sort_order, is_active)
    SELECT 'rtrw',
           CONCAT('Ketua ', UPPER(n.level), ' ', IF(CHAR_LENGTH(n.number) < 2, CONCAT('0', n.number), n.number)),
           n.name, NULL, n.photo_url, n.sort_order, n.is_active
    FROM neighborhood_officials n
    WHERE NOT EXISTS (
      SELECT 1 FROM government_officials g
      WHERE g.category = 'rtrw'
        AND g.position = CONCAT('Ketua ', UPPER(n.level), ' ', IF(CHAR_LENGTH(n.number) < 2, CONCAT('0', n.number), n.number))
        AND COALESCE(g.name, '') = n.name
    )
    ORDER BY FIELD(n.level, 'rw', 'rt'), LPAD(n.number, 10, '0'), n.sort_order, n.id`)
  await pool.query('RENAME TABLE neighborhood_officials TO neighborhood_officials_backup')
}

// Daftar lembaga (Pemerintahan, RT/RW, BPD, dst) disimpan di database supaya admin bisa menambah sendiri.
async function ensureOfficialCategories() {
  await pool.query(`CREATE TABLE IF NOT EXISTS official_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(40) NOT NULL,
    name VARCHAR(80) NOT NULL,
    title VARCHAR(150) NOT NULL,
    eyebrow VARCHAR(80) NOT NULL DEFAULT 'Lembaga Desa',
    singular VARCHAR(80) NULL,
    position_hint VARCHAR(150) NULL,
    description TEXT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_official_category_slug (slug),
    UNIQUE KEY uq_official_category_name (name)
  ) ENGINE=InnoDB`)
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM official_categories')
  if (total > 0) return
  let order = 1
  for (const item of SEED_CATEGORIES) {
    await pool.query(
      `INSERT INTO official_categories (slug, name, title, eyebrow, singular, position_hint, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.slug, item.name, item.title, item.eyebrow, item.singular, item.position_hint, item.description, order],
    )
    order += 1
  }
}

async function initializeDatabase() {
  const [tables] = await pool.query('SHOW TABLES')
  const existingTables = new Set(tables.map((row) => Object.values(row)[0]))
  const schemaPath = path.resolve(__dirname, '../../sql/init.sql')
  const statements = fs.readFileSync(schemaPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    // Seed only newly created tables so deleted or renamed content stays that way after restart.
    const seedTable = statement.match(/^INSERT\s+(?:IGNORE\s+)?INTO\s+([a-z_]+)/i)?.[1]
    if (seedTable && existingTables.has(seedTable)) continue
    await pool.query(statement)
  }
  const [newsColumns] = await pool.query("SHOW COLUMNS FROM news LIKE 'image_urls'")
  if (!newsColumns.length) {
    await pool.query('ALTER TABLE news ADD COLUMN image_urls JSON NULL')
  }
  const [columns] = await pool.query("SHOW COLUMNS FROM service_types LIKE 'deleted_at'")
  if (!columns.length) {
    await pool.query('ALTER TABLE service_types ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL')
  }
  const [requirementColumns] = await pool.query("SHOW COLUMNS FROM service_requirements LIKE 'is_active'")
  if (!requirementColumns.length) {
    await pool.query('ALTER TABLE service_requirements ADD COLUMN is_active BOOLEAN DEFAULT TRUE')
  }
  const [requirementIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'uq_service_requirement_field'")
  for (const name of ['template_stored_name', 'template_original_name']) {
    const [templateColumns] = await pool.query(`SHOW COLUMNS FROM service_requirements LIKE '${name}'`)
    if (!templateColumns.length) await pool.query(`ALTER TABLE service_requirements ADD COLUMN ${name} VARCHAR(255) NULL`)
  }
  if (requirementIndexes.length) {
    const [typeIndexes] = await pool.query("SHOW INDEX FROM service_requirements WHERE Key_name = 'idx_service_requirements_type'")
    if (!typeIndexes.length) {
      await pool.query('ALTER TABLE service_requirements ADD INDEX idx_service_requirements_type (service_type_id)')
    }
    await pool.query('ALTER TABLE service_requirements DROP INDEX uq_service_requirement_field')
  }
  const profileColumns = [
    ['welcome_title', 'VARCHAR(255) NULL'],
    ['welcome_message', 'TEXT NULL'],
    ['village_head_name', 'VARCHAR(180) NULL'],
    ['welcome_image_url', 'TEXT NULL'],
    ['hero_image_url', 'TEXT NULL'],
    ['login_image_url', 'TEXT NULL'],
  ]
  for (const [name, definition] of profileColumns) {
    const [profileColumn] = await pool.query(`SHOW COLUMNS FROM village_profile LIKE '${name}'`)
    if (!profileColumn.length) await pool.query(`ALTER TABLE village_profile ADD COLUMN ${name} ${definition}`)
  }
  const [officialPhotoColumn] = await pool.query("SHOW COLUMNS FROM government_officials LIKE 'photo_url'")
  if (!officialPhotoColumn.length) {
    await pool.query('ALTER TABLE government_officials ADD COLUMN photo_url TEXT NULL AFTER description')
  }
  const [areaPhotoColumn] = await pool.query("SHOW COLUMNS FROM administrative_areas LIKE 'photo_url'")
  if (!areaPhotoColumn.length) {
    await pool.query('ALTER TABLE administrative_areas ADD COLUMN photo_url TEXT NULL AFTER status')
  }
  const [officialCategoryColumn] = await pool.query("SHOW COLUMNS FROM government_officials LIKE 'category'")
  if (!officialCategoryColumn.length) {
    await pool.query("ALTER TABLE government_officials ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'pemerintahan' AFTER id")
  }
  await ensureOfficialCategories()
  await migrateNeighborhoodOfficials()
  await pool.query(`UPDATE village_profile
    SET welcome_title = COALESCE(NULLIF(welcome_title, ''), 'Bersama membangun desa yang terbuka dan berdaya'),
        welcome_message = COALESCE(NULLIF(welcome_message, ''), 'Selamat datang di portal Desa Tanjungjaya. Website ini disiapkan sebagai ruang informasi, pengenalan potensi, dan akses layanan bagi warga.')
    WHERE id = (SELECT id FROM (SELECT id FROM village_profile ORDER BY id LIMIT 1) AS current_profile)`)
}

module.exports = { pool, testConnection, initializeDatabase }
