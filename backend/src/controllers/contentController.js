const contentModel = require('../models/contentModel')
const { createFeatureCollection } = require('../services/geoJsonService')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')

async function getProfile(req, res) {
  const data = await contentModel.findVillageProfile()
  return sendSuccess(res, { data })
}

async function getNews(req, res) {
  const data = await contentModel.findAllNews()
  return sendSuccess(res, { data })
}

async function getNewsDetail(req, res) {
  const data = await contentModel.findNewsById(req.params.id)
  if (!data) throw new AppError('Berita tidak ditemukan', 404)
  return sendSuccess(res, { data })
}

async function getFacilities(req, res) {
  const data = await contentModel.findSpatialRecords('facilities')
  return sendSuccess(res, { data })
}

async function getPotentials(req, res) {
  const data = await contentModel.findSpatialRecords('potentials')
  return sendSuccess(res, { data })
}

async function getMapGeoJson(req, res) {
  const [facilities, potentials] = await Promise.all([
    contentModel.findSpatialRecords('facilities'),
    contentModel.findSpatialRecords('potentials'),
  ])
  return sendSuccess(res, { data: createFeatureCollection(facilities, potentials) })
}

async function getDemographics(req, res) {
  const data = await contentModel.findDemographics()
  return sendSuccess(res, { data })
}

module.exports = {
  getProfile,
  getNews,
  getNewsDetail,
  getFacilities,
  getPotentials,
  getMapGeoJson,
  getDemographics,
}
