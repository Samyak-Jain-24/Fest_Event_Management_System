const express = require('express');
const router = express.Router();
const {
  exportSingleEvent,
  exportBatchEvents,
  getGoogleCalendarLink,
  getOutlookCalendarLink,
  getCalendarEventInfo,
} = require('../controllers/calendarController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authenticated participant
router.get('/export/:eventId', protect, authorize('participant'), exportSingleEvent);
router.post('/export-batch', protect, authorize('participant'), exportBatchEvents);
router.get('/google/:eventId', protect, authorize('participant'), getGoogleCalendarLink);
router.get('/outlook/:eventId', protect, authorize('participant'), getOutlookCalendarLink);
router.get('/event-info/:eventId', protect, authorize('participant'), getCalendarEventInfo);

module.exports = router;
