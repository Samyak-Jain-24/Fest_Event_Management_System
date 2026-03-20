const express = require('express');
const router = express.Router();
const {
  getOrganizers,
  getOrganizerById,
  getOrganizerProfile,
  updateOrganizerProfile,
  getOrganizerAnalytics,
} = require('../controllers/organizerController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for personalized data)
router.get('/', optionalAuth, getOrganizers);
router.get('/:id', optionalAuth, getOrganizerById);

// Organizer routes
router.get('/me/profile', protect, authorize('organizer'), getOrganizerProfile);
router.put('/me/profile', protect, authorize('organizer'), updateOrganizerProfile);
router.get('/me/analytics', protect, authorize('organizer'), getOrganizerAnalytics);

module.exports = router;
