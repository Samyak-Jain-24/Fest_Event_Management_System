const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getEventOrders,
  approveOrder,
  rejectOrder,
} = require('../controllers/merchandiseOrderController');
const { protect, authorize } = require('../middleware/auth');

// Participant routes
router.post('/:eventId', protect, authorize('participant'), placeOrder);
router.get('/my-orders', protect, authorize('participant'), getMyOrders);

// Organizer routes
router.get('/event/:eventId', protect, authorize('organizer'), getEventOrders);
router.put('/:orderId/approve', protect, authorize('organizer'), approveOrder);
router.put('/:orderId/reject', protect, authorize('organizer'), rejectOrder);

module.exports = router;
