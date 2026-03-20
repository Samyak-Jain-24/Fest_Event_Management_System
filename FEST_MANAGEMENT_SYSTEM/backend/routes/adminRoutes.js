const express = require('express');
const router = express.Router();
const {
  createOrganizer,
  getAllOrganizers,
  toggleOrganizerActive,
  deleteOrganizer,
  getPasswordResets,
  approvePasswordReset,
  rejectPasswordReset,
  requestPasswordReset,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Public route - password reset request
router.post('/password-reset-request', requestPasswordReset);

// Admin only routes
router.use(protect);
router.use(authorize('admin'));

// Organizer management
router.post('/organizers', createOrganizer);
router.get('/organizers', getAllOrganizers);
router.put('/organizers/:id/toggle-active', toggleOrganizerActive);
router.delete('/organizers/:id', deleteOrganizer);

// Password reset management
router.get('/password-resets', getPasswordResets);
router.put('/password-resets/:id/approve', approvePasswordReset);
router.put('/password-resets/:id/reject', rejectPasswordReset);

module.exports = router;
