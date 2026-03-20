const express = require('express');
const router = express.Router();
const {
  scanQRAndMarkAttendance,
  manualMarkAttendance,
  getAttendanceDashboard,
  exportAttendanceCSV,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// All organizer-only routes
router.post('/:eventId/scan', protect, authorize('organizer'), scanQRAndMarkAttendance);
router.post('/:eventId/manual', protect, authorize('organizer'), manualMarkAttendance);
router.get('/:eventId', protect, authorize('organizer'), getAttendanceDashboard);
router.get('/:eventId/export', protect, authorize('organizer'), exportAttendanceCSV);

module.exports = router;
