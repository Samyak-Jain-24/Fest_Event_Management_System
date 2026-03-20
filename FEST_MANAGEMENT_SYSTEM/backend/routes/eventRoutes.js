const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
} = require('../controllers/eventController');
const { protect, authorize, checkOrganizerActive, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for personalized data)
router.get('/', optionalAuth, getEvents);
router.get('/:id', optionalAuth, getEventById);

// Organizer routes
router.post(
  '/',
  protect,
  authorize('organizer'),
  checkOrganizerActive,
  createEvent
);

router.put(
  '/:id',
  protect,
  authorize('organizer'),
  checkOrganizerActive,
  updateEvent
);

router.delete(
  '/:id',
  protect,
  authorize('organizer'),
  checkOrganizerActive,
  deleteEvent
);

router.get(
  '/organizer/my-events',
  protect,
  authorize('organizer'),
  getOrganizerEvents
);

module.exports = router;
