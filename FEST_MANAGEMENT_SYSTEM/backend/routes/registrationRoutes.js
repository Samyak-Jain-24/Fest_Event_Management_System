const express = require('express');
const router = express.Router();
const {
  registerForEvent,
  getMyRegistrations,
  getRegistrationByTicket,
  cancelRegistration,
  getEventRegistrations,
  markAttendance,
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');
  
// Participant routes
router.post('/:eventId', protect, authorize('participant'), registerForEvent);
router.get('/', protect, authorize('participant'), getMyRegistrations);
router.get('/ticket/:ticketId', protect, authorize('participant'), getRegistrationByTicket);
router.put('/:id/cancel', protect, authorize('participant'), cancelRegistration);

// Organizer routes
router.get('/event/:eventId', protect, authorize('organizer'), getEventRegistrations);
router.put('/:id/attendance', protect, authorize('organizer'), markAttendance);

module.exports = router;
