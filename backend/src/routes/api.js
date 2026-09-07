const express = require('express')

const authController = require('../controllers/authController')
const adminContentController = require('../controllers/adminContentController')
const adminDataController = require('../controllers/adminDataController')
const applicationController = require('../controllers/applicationController')
const contentController = require('../controllers/contentController')
const dashboardController = require('../controllers/dashboardController')
const governmentOfficialController = require('../controllers/governmentOfficialController')
const newsAdminController = require('../controllers/newsAdminController')
const submissionController = require('../controllers/submissionController')
const serviceController = require('../controllers/serviceController')
const { requireAuth } = require('../middleware/auth')
const { applicationUpload, newsImageUpload, potentialImageUpload, profileImageUpload } = require('../middleware/upload')
const asyncHandler = require('../utils/asyncHandler')
const { sendSuccess } = require('../utils/apiResponse')

const router = express.Router()

router.get('/health', (_req, res) => {
  return sendSuccess(res, {
    message: 'API Profil Desa Tanjungjaya aktif',
    data: { status: 'ok' },
  })
})

router.get('/profile', asyncHandler(contentController.getProfile))
router.get('/demographics', asyncHandler(contentController.getDemographics))
router.get('/officials', asyncHandler(governmentOfficialController.getPublic))
router.get('/news', asyncHandler(contentController.getNews))
router.get('/news/:id', asyncHandler(contentController.getNewsDetail))
router.get('/facilities', asyncHandler(contentController.getFacilities))
router.get('/potentials', asyncHandler(contentController.getPotentials))
router.get('/map/geojson', asyncHandler(contentController.getMapGeoJson))
router.get('/services', asyncHandler(serviceController.getPublicServices))
router.post('/services/:id/applications', applicationUpload.any(), asyncHandler(applicationController.submitApplication))
router.post('/applications/track', asyncHandler(applicationController.trackApplication))

router.post('/contact', asyncHandler(submissionController.submitContact))
router.post('/guestbook', asyncHandler(submissionController.submitGuestbook))

router.post('/auth/login', asyncHandler(authController.login))
router.get('/auth/me', requireAuth, authController.me)
router.post('/auth/logout', authController.logout)

router.get('/admin/dashboard', requireAuth, asyncHandler(dashboardController.getDashboard))
router.put('/admin/profile', requireAuth, profileImageUpload.fields([
  { name: 'welcome_image', maxCount: 1 },
  { name: 'hero_image', maxCount: 1 },
  { name: 'login_image', maxCount: 1 },
]), asyncHandler(adminContentController.updateProfile))
router.put('/admin/demographics', requireAuth, asyncHandler(adminContentController.updateDemographics))
router.get('/admin/officials', requireAuth, asyncHandler(governmentOfficialController.getAll))
router.post('/admin/officials', requireAuth, asyncHandler(governmentOfficialController.create))
router.put('/admin/officials/:id', requireAuth, asyncHandler(governmentOfficialController.update))
router.delete('/admin/officials/:id', requireAuth, asyncHandler(governmentOfficialController.remove))
router.post('/admin/demographics/areas', requireAuth, asyncHandler(adminContentController.createArea))
router.put('/admin/demographics/areas/:id', requireAuth, asyncHandler(adminContentController.updateArea))
router.delete('/admin/demographics/areas/:id', requireAuth, asyncHandler(adminContentController.deleteArea))
router.post('/admin/potentials', requireAuth, potentialImageUpload.single('image'), asyncHandler(adminContentController.createPotential))
router.put('/admin/potentials/:id', requireAuth, potentialImageUpload.single('image'), asyncHandler(adminContentController.updatePotential))
router.delete('/admin/potentials/:id', requireAuth, asyncHandler(adminContentController.deletePotential))
router.get('/admin/services', requireAuth, asyncHandler(serviceController.getAdminServices))
router.post('/admin/services', requireAuth, asyncHandler(serviceController.createService))
router.get('/admin/services/:id', requireAuth, asyncHandler(serviceController.getService))
router.put('/admin/services/:id', requireAuth, asyncHandler(serviceController.updateService))
router.delete('/admin/services/:id', requireAuth, asyncHandler(serviceController.deleteService))
router.get('/admin/news', requireAuth, asyncHandler(newsAdminController.getAll))
router.get('/admin/news/:id', requireAuth, asyncHandler(newsAdminController.getOne))
router.post('/admin/news', requireAuth, newsImageUpload.single('image'), asyncHandler(newsAdminController.create))
router.put('/admin/news/:id', requireAuth, newsImageUpload.single('image'), asyncHandler(newsAdminController.update))
router.delete('/admin/news/:id', requireAuth, asyncHandler(newsAdminController.remove))
router.get('/admin/applications', requireAuth, asyncHandler(applicationController.getApplications))
router.get('/admin/applications/:id', requireAuth, asyncHandler(applicationController.getApplication))
router.patch('/admin/applications/:id/status', requireAuth, asyncHandler(applicationController.updateApplicationStatus))
router.get('/admin/application-files/:id', requireAuth, asyncHandler(applicationController.downloadApplicationFile))
router.get('/admin/guestbook', requireAuth, asyncHandler(adminDataController.getGuestbook))
router.patch('/admin/guestbook/:id/status', requireAuth, asyncHandler(adminDataController.updateGuestbookStatus))
router.delete('/admin/guestbook/:id', requireAuth, asyncHandler(adminDataController.deleteGuestbook))
router.get('/admin/contacts', requireAuth, asyncHandler(adminDataController.getContacts))
router.patch('/admin/contacts/:id/status', requireAuth, asyncHandler(adminDataController.updateContactStatus))
router.delete('/admin/contacts/:id', requireAuth, asyncHandler(adminDataController.deleteContact))
router.get('/admin/export.xlsx', requireAuth, asyncHandler(adminDataController.exportExcel))

module.exports = router
