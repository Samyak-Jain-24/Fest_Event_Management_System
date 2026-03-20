const express = require('express');
const router = express.Router();
const {
  registerParticipant,
  login,
  getMe,
  requestPasswordReset,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register/participant', registerParticipant);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
