const express = require('express');
const router = express.Router();
const {
  getMessages,
  getThreadReplies,
  postMessage,
  deleteMessage,
  togglePinMessage,
  toggleReaction,
} = require('../controllers/forumController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for personalized data)
router.get('/:eventId', optionalAuth, getMessages);
router.get('/:eventId/thread/:messageId', optionalAuth, getThreadReplies);

// Protected routes (participant or organizer)
router.post('/:eventId', protect, authorize('participant', 'organizer'), postMessage);
router.delete('/:eventId/message/:messageId', protect, authorize('participant', 'organizer'), deleteMessage);
router.put('/:eventId/message/:messageId/pin', protect, authorize('organizer'), togglePinMessage);
router.put('/:eventId/message/:messageId/react', protect, authorize('participant', 'organizer'), toggleReaction);

module.exports = router;
