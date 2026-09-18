const fs = require('fs')
const path = require('path')
const contentModel = require('../models/contentModel')
const { potentialsDirectory, profileDirectory, areasDirectory } = require('../config/storage')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { cleanText } = require('../utils/validation')

function nullableInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(`${field} harus berupa angka bulat antara ${min} dan ${max}`, 400)
  }

  return parsed
}

function removeUploadedProfileImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/profile/')) return
  fs.rmSync(path.join(profileDirectory, path.basename(imageUrl)), { force: true })
}

function uploadedProfileImage(req, name) {
  return req.files?.[name]?.[0] ? `/uploads/profile/${req.files[name][0].filename}` : null
}

async function updateProfile(req, res) {
  const current = await contentModel.findVillageProfile()
  if (!current) throw new AppError('Profil desa belum tersedia', 404)

  const profile = {
    id: current.id,
    name: cleanText(req.body.name, 150),
    district: cleanText(req.body.district, 120),
    regency: cleanText(req.body.regency, 120),
    province: cleanText(req.body.province, 120),
    postalCode: cleanText(req.body.postal_code, 10),
    areaSizeHa: req.body.area_size_ha === '' || req.body.area_size_ha == null
      ? null
      : Number(req.body.area_size_ha),
    hamletCount: nullableInteger(req.body.hamlet_count, 'Jumlah dusun'),
    boundaryNorth: cleanText(req.body.boundary_north, 255),
    boundaryEast: cleanText(req.body.boundary_east, 255),
    boundarySouth: cleanText(req.body.boundary_south, 255),
    boundaryWest: cleanText(req.body.boundary_west, 255),
    history: cleanText(req.body.history, 20000),
    vision: cleanText(req.body.vision, 10000),
    mission: cleanText(req.body.mission, 20000),
    welcomeTitle: cleanText(req.body.welcome_title, 255),
    welcomeMessage: cleanText(req.body.welcome_message, 10000),
    villageHeadName: cleanText(req.body.village_head_name, 180),
    welcomeImageUrl: uploadedProfileImage(req, 'welcome_image') || current.welcome_image_url,
    heroImageUrl: uploadedProfileImage(req, 'hero_image') || current.hero_image_url,
    loginImageUrl: uploadedProfileImage(req, 'login_image') || current.login_image_url,
  }

  if (!profile.name) throw new AppError('Nama desa wajib diisi', 400)
  if (profile.areaSizeHa !== null && (!Number.isFinite(profile.areaSizeHa) || profile.areaSizeHa < 0)) {
    throw new AppError('Luas wilayah harus berupa angka positif', 400)
  }

  try {
    const data = await contentModel.updateVillageProfile(profile)
    if (uploadedProfileImage(req, 'welcome_image') && current.welcome_image_url !== profile.welcomeImageUrl) removeUploadedProfileImage(current.welcome_image_url)
    if (uploadedProfileImage(req, 'hero_image') && current.hero_image_url !== profile.heroImageUrl) removeUploadedProfileImage(current.hero_image_url)
    if (uploadedProfileImage(req, 'login_image') && current.login_image_url !== profile.loginImageUrl) removeUploadedProfileImage(current.login_image_url)
    return sendSuccess(res, { data, message: 'Profil desa berhasil diperbarui' })
  } catch (error) {
    if (uploadedProfileImage(req, 'welcome_image')) removeUploadedProfileImage(profile.welcomeImageUrl)
    if (uploadedProfileImage(req, 'hero_image')) removeUploadedProfileImage(profile.heroImageUrl)
    if (uploadedProfileImage(req, 'login_image')) removeUploadedProfileImage(profile.loginImageUrl)
    throw error
  }
}

async function updateDemographics(req, res) {
  const current = await contentModel.findDemographics()
  if (!current.summary) throw new AppError('Ringkasan demografi belum tersedia', 404)

  const allowedStatuses = new Set(['belum_diverifikasi', 'terverifikasi'])
  const status = cleanText(req.body.status, 30) || 'belum_diverifikasi'
  if (!allowedStatuses.has(status)) throw new AppError('Status data demografi tidak valid', 400)

  const summary = {
    id: current.summary.id,
    malePopulation: nullableInteger(req.body.male_population, 'Jumlah laki-laki'),
    femalePopulation: nullableInteger(req.body.female_population, 'Jumlah perempuan'),
    householdCount: nullableInteger(req.body.household_count, 'Jumlah KK'),
    rwCount: nullableInteger(req.body.rw_count, 'Jumlah RW'),
    rtCount: nullableInteger(req.body.rt_count, 'Jumlah RT'),
    dataYear: nullableInteger(req.body.data_year, 'Tahun data', { min: 1900, max: 2200 }),
    source: cleanText(req.body.source, 2000),
    status,
  }

  const data = await contentModel.updateDemographicSummary(summary)
  return sendSuccess(res, { data, message: 'Data demografi berhasil diperbarui' })
}

function parseArea(body) {
  const rwNumber = cleanText(body.rw_number, 10)
  const rtNumber = cleanText(body.rt_number, 10)
  if (!rwNumber || !rtNumber) throw new AppError('Nomor RW dan RT wajib diisi', 400)
  const status = cleanText(body.status, 30) || 'belum_diverifikasi'
  if (!new Set(['belum_diverifikasi', 'terverifikasi']).has(status)) {
    throw new AppError('Status data RT/RW tidak valid', 400)
  }
  return {
    rwNumber,
    rtNumber,
    householdCount: nullableInteger(body.household_count, 'Jumlah KK'),
    malePopulation: nullableInteger(body.male_population, 'Jumlah laki-laki'),
    femalePopulation: nullableInteger(body.female_population, 'Jumlah perempuan'),
    dataYear: nullableInteger(body.data_year, 'Tahun data', { min: 1900, max: 2200 }),
    source: cleanText(body.source, 2000),
    status,
  }
}

function removeUploadedAreaPhoto(photoUrl) {
  if (!photoUrl?.startsWith('/uploads/areas/')) return
  fs.rmSync(path.join(areasDirectory, path.basename(photoUrl)), { force: true })
}

function parseAreaWithPhoto(body, photoUrl) {
  return { ...parseArea(body), photoUrl }
}

function removeUploadedPotential(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/potentials/')) return
  fs.rmSync(path.join(potentialsDirectory, path.basename(imageUrl)), { force: true })
}

function parsePotential(body, uploadedImage = null) {
  const name = cleanText(body.name, 180)
  if (!name) throw new AppError('Nama potensi wajib diisi', 400)
  const longitude = Number(body.longitude)
  const latitude = Number(body.latitude)
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError('Bujur harus berupa angka antara -180 dan 180', 400)
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError('Lintang harus berupa angka antara -90 dan 90', 400)
  }
  return {
    name,
    category: cleanText(body.category, 80),
    address: cleanText(body.address, 5000),
    description: cleanText(body.description, 10000),
    imageUrl: uploadedImage || cleanText(body.image_url, 2000),
    longitude,
    latitude,
  }
}

async function createPotential(req, res) {
  const imageUrl = req.file ? `/uploads/potentials/${req.file.filename}` : null
  try {
    const data = await contentModel.createPotential(parsePotential(req.body, imageUrl))
    return sendSuccess(res, { data, status: 201, message: 'Potensi lokal berhasil ditambahkan' })
  } catch (error) {
    removeUploadedPotential(imageUrl)
    throw error
  }
}

async function updatePotential(req, res) {
  const existing = await contentModel.findSpatialRecords('potentials')
  const current = existing.find((item) => String(item.id) === String(req.params.id))
  if (!current) throw new AppError('Potensi lokal tidak ditemukan', 404)
  const imageUrl = req.file ? `/uploads/potentials/${req.file.filename}` : null
  try {
    const data = await contentModel.updatePotential(req.params.id, parsePotential(req.body, imageUrl))
    if (imageUrl && current.image_url !== imageUrl) removeUploadedPotential(current.image_url)
    return sendSuccess(res, { data, message: 'Potensi lokal berhasil diperbarui' })
  } catch (error) {
    removeUploadedPotential(imageUrl)
    throw error
  }
}

async function deletePotential(req, res) {
  const existing = await contentModel.findSpatialRecords('potentials')
  const current = existing.find((item) => String(item.id) === String(req.params.id))
  if (!current || !await contentModel.deletePotential(req.params.id)) {
    throw new AppError('Potensi lokal tidak ditemukan', 404)
  }
  removeUploadedPotential(current.image_url)
  return sendSuccess(res, { message: 'Potensi lokal berhasil dihapus' })
}

async function createArea(req, res) {
  const uploadedPhoto = req.file ? `/uploads/areas/${req.file.filename}` : null
  try {
    const data = await contentModel.createAdministrativeArea(parseAreaWithPhoto(req.body, uploadedPhoto))
    return sendSuccess(res, { data, status: 201, message: 'Data RT/RW berhasil ditambahkan' })
  } catch (error) {
    removeUploadedAreaPhoto(uploadedPhoto)
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Kombinasi RW dan RT tersebut sudah tersedia', 400)
    throw error
  }
}

async function updateArea(req, res) {
  const current = (await contentModel.findDemographics()).areas.find((area) => String(area.id) === String(req.params.id))
  if (!current) {
    if (req.file) removeUploadedAreaPhoto(`/uploads/areas/${req.file.filename}`)
    throw new AppError('Data RT/RW tidak ditemukan', 404)
  }
  const uploadedPhoto = req.file ? `/uploads/areas/${req.file.filename}` : null
  const removeRequested = String(req.body.remove_photo) === 'true'
  const photoUrl = uploadedPhoto || (removeRequested ? null : current.photo_url)
  try {
    const data = await contentModel.updateAdministrativeArea(req.params.id, parseAreaWithPhoto(req.body, photoUrl))
    if (!data) throw new AppError('Data RT/RW tidak ditemukan', 404)
    if ((uploadedPhoto || removeRequested) && current.photo_url !== photoUrl) removeUploadedAreaPhoto(current.photo_url)
    return sendSuccess(res, { data, message: 'Data RT/RW berhasil diperbarui' })
  } catch (error) {
    removeUploadedAreaPhoto(uploadedPhoto)
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('Kombinasi RW dan RT tersebut sudah tersedia', 400)
    throw error
  }
}

async function deleteArea(req, res) {
  const current = (await contentModel.findDemographics()).areas.find((area) => String(area.id) === String(req.params.id))
  if (!current || !await contentModel.deleteAdministrativeArea(req.params.id)) {
    throw new AppError('Data RT/RW tidak ditemukan', 404)
  }
  removeUploadedAreaPhoto(current.photo_url)
  return sendSuccess(res, { message: 'Data RT/RW berhasil dihapus' })
}

function parseNeighborhoodOfficial(body, photoUrl) {
  const level = cleanText(body.level, 5).toLowerCase()
  const number = cleanText(body.number, 10)
  const name = cleanText(body.name, 180)
  if (!['rw', 'rt'].includes(level) || !number || !name) throw new AppError('Jenis, nomor, dan nama pengurus wajib diisi', 400)
  return { level, number, name, photoUrl, sortOrder: nullableInteger(body.sort_order, 'Urutan tampil') || 0, isActive: String(body.is_active) !== 'false' }
}

async function getNeighborhoodOfficials(_req, res) {
  return sendSuccess(res, { data: await contentModel.findNeighborhoodOfficials() })
}

async function getPublicNeighborhoodOfficials(_req, res) {
  return sendSuccess(res, { data: await contentModel.findNeighborhoodOfficials({ activeOnly: true }) })
}

async function createNeighborhoodOfficial(req, res) {
  const uploadedPhoto = req.file ? `/uploads/areas/${req.file.filename}` : null
  try { return sendSuccess(res, { data: await contentModel.createNeighborhoodOfficial(parseNeighborhoodOfficial(req.body, uploadedPhoto)), status: 201, message: 'Pengurus RT/RW berhasil ditambahkan' }) }
  catch (error) { removeUploadedAreaPhoto(uploadedPhoto); if (error.code === 'ER_DUP_ENTRY') throw new AppError('Pengurus untuk nomor tersebut sudah ada', 400); throw error }
}

async function updateNeighborhoodOfficial(req, res) {
  const current = (await contentModel.findNeighborhoodOfficials()).find((item) => String(item.id) === String(req.params.id))
  const uploadedPhoto = req.file ? `/uploads/areas/${req.file.filename}` : null
  if (!current) { removeUploadedAreaPhoto(uploadedPhoto); throw new AppError('Pengurus RT/RW tidak ditemukan', 404) }
  const photoUrl = uploadedPhoto || (String(req.body.remove_photo) === 'true' ? null : current.photo_url)
  try {
    const data = await contentModel.updateNeighborhoodOfficial(req.params.id, parseNeighborhoodOfficial(req.body, photoUrl))
    if (uploadedPhoto || photoUrl === null) removeUploadedAreaPhoto(current.photo_url)
    return sendSuccess(res, { data, message: 'Pengurus RT/RW berhasil diperbarui' })
  } catch (error) { removeUploadedAreaPhoto(uploadedPhoto); if (error.code === 'ER_DUP_ENTRY') throw new AppError('Pengurus untuk nomor tersebut sudah ada', 400); throw error }
}

async function deleteNeighborhoodOfficial(req, res) {
  const current = (await contentModel.findNeighborhoodOfficials()).find((item) => String(item.id) === String(req.params.id))
  if (!current || !await contentModel.deleteNeighborhoodOfficial(req.params.id)) throw new AppError('Pengurus RT/RW tidak ditemukan', 404)
  removeUploadedAreaPhoto(current.photo_url)
  return sendSuccess(res, { message: 'Pengurus RT/RW berhasil dihapus' })
}

module.exports = { updateProfile, updateDemographics, createArea, updateArea, deleteArea, getNeighborhoodOfficials, getPublicNeighborhoodOfficials, createNeighborhoodOfficial, updateNeighborhoodOfficial, deleteNeighborhoodOfficial, createPotential, updatePotential, deletePotential }
