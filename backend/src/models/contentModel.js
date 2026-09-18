const { pool: db } = require('../config/database')
const { withImages } = require('../utils/newsImages')

const SPATIAL_COLUMNS = `
  id,
  name,
  category,
  address,
  description,
  image_url,
  ST_Longitude(location) AS longitude,
  ST_Latitude(location) AS latitude
`

async function findVillageProfile() {
  const [rows] = await db.query('SELECT * FROM village_profile ORDER BY id LIMIT 1')
  return rows[0] || null
}

async function updateVillageProfile(profile) {
  await db.execute(
    `UPDATE village_profile
     SET name = ?, district = ?, regency = ?, province = ?, postal_code = ?,
         area_size_ha = ?, hamlet_count = ?, boundary_north = ?, boundary_east = ?,
         boundary_south = ?, boundary_west = ?, history = ?, vision = ?, mission = ?,
         welcome_title = ?, welcome_message = ?, village_head_name = ?, welcome_image_url = ?, hero_image_url = ?, login_image_url = ?
     WHERE id = ?`,
    [
      profile.name,
      profile.district,
      profile.regency,
      profile.province,
      profile.postalCode,
      profile.areaSizeHa,
      profile.hamletCount,
      profile.boundaryNorth,
      profile.boundaryEast,
      profile.boundarySouth,
      profile.boundaryWest,
      profile.history,
      profile.vision,
      profile.mission,
      profile.welcomeTitle,
      profile.welcomeMessage,
      profile.villageHeadName,
      profile.welcomeImageUrl,
      profile.heroImageUrl,
      profile.loginImageUrl,
      profile.id,
    ],
  )

  return findVillageProfile()
}

async function findAllNews() {
  const [rows] = await db.query('SELECT * FROM news WHERE is_published = TRUE ORDER BY published_at DESC')
  return rows.map(withImages)
}

async function findNewsById(id) {
  const [rows] = await db.execute('SELECT * FROM news WHERE id = ? AND is_published = TRUE', [id])
  return withImages(rows[0])
}

async function findSpatialRecords(table) {
  const allowedTables = new Set(['facilities', 'potentials'])
  if (!allowedTables.has(table)) throw new Error('Nama tabel spasial tidak diizinkan')

  const [rows] = await db.query(`SELECT ${SPATIAL_COLUMNS} FROM ${table} ORDER BY id`)
  return rows
}

async function createPotential(potential) {
  const [result] = await db.execute(
    `INSERT INTO potentials
      (name, category, address, description, image_url, location)
     VALUES (?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326))`,
    [potential.name, potential.category, potential.address, potential.description,
      potential.imageUrl, potential.longitude, potential.latitude],
  )
  const [rows] = await db.execute(`SELECT ${SPATIAL_COLUMNS} FROM potentials WHERE id = ?`, [result.insertId])
  return rows[0]
}

async function updatePotential(id, potential) {
  const [result] = await db.execute(
    `UPDATE potentials
     SET name = ?, category = ?, address = ?, description = ?, image_url = ?,
         location = ST_SRID(POINT(?, ?), 4326)
     WHERE id = ?`,
    [potential.name, potential.category, potential.address, potential.description,
      potential.imageUrl, potential.longitude, potential.latitude, id],
  )
  if (!result.affectedRows) return null
  const [rows] = await db.execute(`SELECT ${SPATIAL_COLUMNS} FROM potentials WHERE id = ?`, [id])
  return rows[0]
}

async function deletePotential(id) {
  const [result] = await db.execute('DELETE FROM potentials WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function findDemographics() {
  const [summaryRows] = await db.query(`
    SELECT
      id,
      male_population,
      female_population,
      CASE
        WHEN male_population IS NULL AND female_population IS NULL THEN NULL
        ELSE COALESCE(male_population, 0) + COALESCE(female_population, 0)
      END AS total_population,
      household_count,
      rw_count,
      rt_count,
      data_year,
      source,
      status,
      updated_at
    FROM demographic_summary
    ORDER BY id DESC
    LIMIT 1
  `)

  const [areas] = await db.query(`
    SELECT
      id,
      rw_number,
      rt_number,
      household_count,
      male_population,
      female_population,
      CASE
        WHEN male_population IS NULL AND female_population IS NULL THEN NULL
        ELSE COALESCE(male_population, 0) + COALESCE(female_population, 0)
      END AS total_population,
      data_year,
      source,
      status,
      photo_url,
      updated_at
    FROM administrative_areas
    ORDER BY LPAD(rw_number, 10, '0'), LPAD(rt_number, 10, '0')
  `)

  return { summary: summaryRows[0] || null, areas }
}

async function updateDemographicSummary(summary) {
  await db.execute(
    `UPDATE demographic_summary
     SET male_population = ?, female_population = ?, household_count = ?,
         rw_count = ?, rt_count = ?, data_year = ?, source = ?, status = ?
     WHERE id = ?`,
    [
      summary.malePopulation,
      summary.femalePopulation,
      summary.householdCount,
      summary.rwCount,
      summary.rtCount,
      summary.dataYear,
      summary.source,
      summary.status,
      summary.id,
    ],
  )

  return findDemographics()
}

async function createAdministrativeArea(area) {
  const [result] = await db.execute(
    `INSERT INTO administrative_areas
      (rw_number, rt_number, household_count, male_population, female_population,
      data_year, source, status, photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [area.rwNumber, area.rtNumber, area.householdCount, area.malePopulation,
      area.femalePopulation, area.dataYear, area.source, area.status, area.photoUrl],
  )
  const [rows] = await db.execute('SELECT * FROM administrative_areas WHERE id = ?', [result.insertId])
  return rows[0]
}

async function updateAdministrativeArea(id, area) {
  const [result] = await db.execute(
    `UPDATE administrative_areas
     SET rw_number = ?, rt_number = ?, household_count = ?, male_population = ?,
         female_population = ?, data_year = ?, source = ?, status = ?, photo_url = ?
     WHERE id = ?`,
    [area.rwNumber, area.rtNumber, area.householdCount, area.malePopulation,
      area.femalePopulation, area.dataYear, area.source, area.status, area.photoUrl, id],
  )
  if (!result.affectedRows) return null
  const [rows] = await db.execute('SELECT * FROM administrative_areas WHERE id = ?', [id])
  return rows[0]
}

async function deleteAdministrativeArea(id) {
  const [result] = await db.execute('DELETE FROM administrative_areas WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function findNeighborhoodOfficials({ activeOnly = false } = {}) {
  const [rows] = await db.query(`SELECT id, level, number, name, photo_url, sort_order, is_active
    FROM neighborhood_officials ${activeOnly ? 'WHERE is_active = TRUE' : ''}
    ORDER BY FIELD(level, 'rw', 'rt'), LPAD(number, 10, '0'), sort_order, id`)
  return rows
}

async function createNeighborhoodOfficial(item) {
  const [result] = await db.execute(`INSERT INTO neighborhood_officials
    (level, number, name, photo_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
  [item.level, item.number, item.name, item.photoUrl, item.sortOrder, item.isActive])
  const [rows] = await db.execute('SELECT * FROM neighborhood_officials WHERE id = ?', [result.insertId])
  return rows[0]
}

async function updateNeighborhoodOfficial(id, item) {
  const [result] = await db.execute(`UPDATE neighborhood_officials SET level=?, number=?, name=?, photo_url=?, sort_order=?, is_active=? WHERE id=?`,
    [item.level, item.number, item.name, item.photoUrl, item.sortOrder, item.isActive, id])
  if (!result.affectedRows) return null
  const [rows] = await db.execute('SELECT * FROM neighborhood_officials WHERE id = ?', [id])
  return rows[0]
}

async function deleteNeighborhoodOfficial(id) {
  const [result] = await db.execute('DELETE FROM neighborhood_officials WHERE id = ?', [id])
  return result.affectedRows > 0
}

module.exports = {
  findVillageProfile,
  updateVillageProfile,
  findAllNews,
  findNewsById,
  findSpatialRecords,
  createPotential,
  updatePotential,
  deletePotential,
  findDemographics,
  updateDemographicSummary,
  createAdministrativeArea,
  updateAdministrativeArea,
  deleteAdministrativeArea,
  findNeighborhoodOfficials,
  createNeighborhoodOfficial,
  updateNeighborhoodOfficial,
  deleteNeighborhoodOfficial,
}
