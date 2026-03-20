const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updatePreferences,
  toggleFollowOrganizer,
  changePassword,
} = require('../controllers/participantController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and for participants only
router.use(protect);
router.use(authorize('participant'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/preferences', updatePreferences);
router.post('/follow/:organizerId', toggleFollowOrganizer);
router.put('/change-password', changePassword);

module.exports = router;
