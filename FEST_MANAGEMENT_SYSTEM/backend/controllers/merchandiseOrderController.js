const MerchandiseOrder = require('../models/MerchandiseOrder');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const { generateTicketId, generateQRCode } = require('../utils/qrcode');
const { sendTicketEmail } = require('../utils/email');

// @desc    Place merchandise order (participant uploads payment proof)
// @route   POST /api/merchandise-orders/:eventId
// @access  Private (Participant)
const placeOrder = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { items, paymentProof } = req.body;

    const event = await Event.findById(eventId).populate('organizer');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.eventType !== 'Merchandise') {
      return res.status(400).json({ message: 'This is not a merchandise event' });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({ message: 'Event is not open for orders' });
    }

    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Order deadline has passed' });
    }

    // Check eligibility
    const participant = await Participant.findById(req.user._id);
    if (event.eligibility === 'IIIT Only' && participant.participantType !== 'IIIT') {
      return res.status(403).json({ message: 'This event is only for IIIT participants' });
    }
    if (event.eligibility === 'Non-IIIT Only' && participant.participantType !== 'Non-IIIT') {
      return res.status(403).json({ message: 'This event is only for Non-IIIT participants' });
    }

    // Check duplicate pending/approved order
    const existingOrder = await MerchandiseOrder.findOne({
      event: eventId,
      participant: req.user._id,
      paymentStatus: { $in: ['Pending Approval', 'Approved'] },
    });
    if (existingOrder) {
      return res.status(400).json({ message: 'You already have a pending or approved order for this event' });
    }

    if (!paymentProof) {
      return res.status(400).json({ message: 'Payment proof image is required' });
    }

    // Validate items & stock
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    for (const item of items) {
      const eventItem = event.items.find(
        (i) => i.size === item.size && i.color === item.color && i.variant === item.variant
      );
      if (!eventItem) {
        return res.status(400).json({ message: 'Item variant not found' });
      }
      if (eventItem.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.variant} ${item.size} ${item.color}` });
      }
      if (item.quantity > eventItem.purchaseLimit) {
        return res.status(400).json({ message: `Purchase limit exceeded for ${item.variant} ${item.size} ${item.color}` });
      }
    }

    const totalAmount = event.registrationFee * items.reduce((sum, i) => sum + i.quantity, 0);

    const order = await MerchandiseOrder.create({
      event: eventId,
      participant: req.user._id,
      items,
      totalAmount,
      paymentProof,
      paymentStatus: 'Pending Approval',
    });

    res.status(201).json({
      message: 'Order placed successfully. Waiting for payment approval.',
      order,
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get my merchandise orders (participant)
// @route   GET /api/merchandise-orders/my-orders
// @access  Private (Participant)
const getMyOrders = async (req, res) => {
  try {
    const orders = await MerchandiseOrder.find({ participant: req.user._id })
      .populate('event', 'eventName eventType eventStartDate eventEndDate organizer registrationFee')
      .populate({
        path: 'event',
        populate: { path: 'organizer', select: 'organizerName' },
      })
      .sort({ createdAt: -1 });

    res.json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all orders for an event (organizer)
// @route   GET /api/merchandise-orders/event/:eventId
// @access  Private (Organizer)
const getEventOrders = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const orders = await MerchandiseOrder.find({ event: req.params.eventId })
      .populate('participant', 'firstName lastName email contactNumber participantType')
      .sort({ createdAt: -1 });

    res.json({ count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve merchandise order
// @route   PUT /api/merchandise-orders/:orderId/approve
// @access  Private (Organizer)
const approveOrder = async (req, res) => {
  try {
    const order = await MerchandiseOrder.findById(req.params.orderId)
      .populate('event')
      .populate('participant');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.paymentStatus !== 'Pending Approval') {
      return res.status(400).json({ message: 'Order is not in pending state' });
    }

    const event = await Event.findById(order.event._id);

    // Decrement stock
    for (const item of order.items) {
      const eventItem = event.items.find(
        (i) => i.size === item.size && i.color === item.color && i.variant === item.variant
      );
      if (!eventItem || eventItem.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.variant} ${item.size} ${item.color}` });
      }
      eventItem.stock -= item.quantity;
    }
    event.registrationCount += 1;
    await event.save();

    // Generate ticket & QR
    const ticketId = generateTicketId();
    const participant = order.participant;
    const qrCodeData = {
      ticketId,
      orderId: order._id,
      eventId: event._id,
      eventName: event.eventName,
      participantId: participant._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
      type: 'merchandise',
    };
    const qrCode = await generateQRCode(qrCodeData);

    order.paymentStatus = 'Approved';
    order.approvedBy = req.user._id;
    order.approvedAt = new Date();
    order.ticketId = ticketId;
    order.qrCode = qrCode;
    await order.save();

    // Also create a Registration record for consistency
    await Registration.create({
      event: event._id,
      participant: participant._id,
      ticketId,
      qrCode,
      registrationType: 'Merchandise',
      purchasedItems: order.items,
      paymentStatus: 'Completed',
      paymentAmount: order.totalAmount,
    });

    // Send confirmation email
    try {
      await sendTicketEmail(
        participant.email,
        { eventName: event.eventName, eventStartDate: event.eventStartDate },
        { ticketId, qrCode }
      );
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    res.json({ message: 'Order approved, ticket generated and email sent', order });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Reject merchandise order
// @route   PUT /api/merchandise-orders/:orderId/reject
// @access  Private (Organizer)
const rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await MerchandiseOrder.findById(req.params.orderId).populate('event');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (order.paymentStatus !== 'Pending Approval') {
      return res.status(400).json({ message: 'Order is not in pending state' });
    }

    order.paymentStatus = 'Rejected';
    order.rejectionReason = reason || 'Payment proof not valid';
    order.rejectedAt = new Date();
    await order.save();

    res.json({ message: 'Order rejected', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getEventOrders,
  approveOrder,
  rejectOrder,
};
