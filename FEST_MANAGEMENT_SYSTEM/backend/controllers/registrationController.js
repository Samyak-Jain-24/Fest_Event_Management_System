const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const { generateTicketId, generateQRCode } = require('../utils/qrcode');
const { sendTicketEmail } = require('../utils/email');

// @desc    Register for event
// @route   POST /api/registrations/:eventId
// @access  Private (Participant)
const registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { formData, purchasedItems, teamName } = req.body;

    const event = await Event.findById(eventId).populate('organizer');

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Check if event is open for registration
    if (event.status !== 'Published') {
      return res.status(400).json({
        message: 'Event is not open for registration',
      });
    }

    // Check registration deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({
        message: 'Registration deadline has passed',
      });
    }

    // Check registration limit
    if (event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({
        message: 'Registration limit reached',
      });
    }

    // Check eligibility
    const participant = await Participant.findById(req.user._id);
    if (event.eligibility === 'IIIT Only' && participant.participantType !== 'IIIT') {
      return res.status(403).json({
        message: 'This event is only for IIIT participants',
      });
    }
    if (event.eligibility === 'Non-IIIT Only' && participant.participantType !== 'Non-IIIT') {
      return res.status(403).json({
        message: 'This event is only for Non-IIIT participants',
      });
    }

    // For merchandise events, block direct registration - must go through merchandise order flow
    if (event.eventType === 'Merchandise') {
      return res.status(400).json({
        message: 'Merchandise events require payment proof. Please use the Order Merchandise page to place your order.',
      });
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      participant: req.user._id,
      status: { $ne: 'Cancelled' },
    });

    if (existingRegistration) {
      return res.status(400).json({
        message: 'You are already registered for this event',
      });
    }

    // For merchandise events, check stock (kept for safety but won't be reached due to block above)
    if (event.eventType === 'Merchandise' && purchasedItems) {
      for (const item of purchasedItems) {
        const eventItem = event.items.find(
          (i) =>
            i.size === item.size &&
            i.color === item.color &&
            i.variant === item.variant
        );

        if (!eventItem) {
          return res.status(400).json({
            message: `Item with specified details not found`,
          });
        }

        if (eventItem.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.size} ${item.color}`,
          });
        }

        if (item.quantity > eventItem.purchaseLimit) {
          return res.status(400).json({
            message: `Purchase limit exceeded for ${item.size} ${item.color}`,
          });
        }
      }
    }

    // Generate ticket ID and QR code
    const ticketId = generateTicketId();
    const qrCodeData = {
      ticketId,
      eventId: event._id,
      eventName: event.eventName,
      participantId: req.user._id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      participantEmail: participant.email,
    };
    const qrCode = await generateQRCode(qrCodeData);

    // Create registration
    const registration = await Registration.create({
      event: eventId,
      participant: req.user._id,
      ticketId,
      qrCode,
      registrationType: event.eventType,
      formData: event.eventType === 'Normal' ? formData : undefined,
      teamName: event.eventType === 'Normal' ? teamName : undefined,
      purchasedItems: event.eventType === 'Merchandise' ? purchasedItems : undefined,
      paymentStatus: 'Completed',
      paymentAmount: event.registrationFee,
    });

    // Update event registration count
    event.registrationCount += 1;

    // Update stock for merchandise
    if (event.eventType === 'Merchandise' && purchasedItems) {
      for (const item of purchasedItems) {
        const eventItem = event.items.find(
          (i) =>
            i.size === item.size &&
            i.color === item.color &&
            i.variant === item.variant
        );
        eventItem.stock -= item.quantity;
      }
    }

    await event.save();

    // Send email with ticket
    try {
      await sendTicketEmail(
        participant.email,
        {
          eventName: event.eventName,
          eventStartDate: event.eventStartDate,
        },
        {
          ticketId,
          qrCode,
        }
      );
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue - registration is successful even if email fails
    }

    res.status(201).json({
      message: 'Registration successful',
      registration,
      ticketId,
    });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get participant's registrations
// @route   GET /api/registrations
// @access  Private (Participant)
const getMyRegistrations = async (req, res) => {
  try {
    const { status, type } = req.query;

    let query = { participant: req.user._id };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.registrationType = type;
    }

    const registrations = await Registration.find(query)
      .populate('event', 'eventName eventType eventStartDate eventEndDate organizer status')
      .populate({
        path: 'event',
        populate: {
          path: 'organizer',
          select: 'organizerName',
        },
      })
      .sort({ createdAt: -1 });

    // Categorize registrations based on event dates and status
    const now = new Date();
    const categorized = {
      upcoming: [],
      ongoing: [],
      completed: [],
      cancelled: [],
    };

    registrations.forEach((reg) => {
      // Cancelled / Rejected always go to cancelled bucket
      if (reg.status === 'Cancelled' || reg.status === 'Rejected') {
        categorized.cancelled.push(reg);
        return;
      }

      // If event data is missing for some reason, treat as completed
      if (!reg.event) {
        categorized.completed.push(reg);
        return;
      }

      const start = new Date(reg.event.eventStartDate);
      const end = new Date(reg.event.eventEndDate);

      // Completed if explicitly marked completed/closed or end date has passed
      if (
        reg.event.status === 'Completed' ||
        reg.event.status === 'Closed' ||
        end < now
      ) {
        categorized.completed.push(reg);
      } else if (start <= now && now <= end) {
        // Ongoing: event has started but not yet ended
        categorized.ongoing.push(reg);
      } else if (now < start) {
        // Upcoming: event has not started yet
        categorized.upcoming.push(reg);
      } else {
        // Fallback to completed for any edge cases
        categorized.completed.push(reg);
      }
    });

    res.json({
      total: registrations.length,
      ...categorized,
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get registration by ticket ID
// @route   GET /api/registrations/ticket/:ticketId
// @access  Private (Participant)
const getRegistrationByTicket = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      ticketId: req.params.ticketId,
      participant: req.user._id,
    })
      .populate('event')
      .populate({
        path: 'event',
        populate: {
          path: 'organizer',
        },
      });

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    res.json(registration);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Cancel registration
// @route   PUT /api/registrations/:id/cancel
// @access  Private (Participant)
const cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('event');

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    // Check if user owns this registration
    if (registration.participant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    // Check if can be cancelled
    if (registration.status !== 'Registered') {
      return res.status(400).json({
        message: 'Registration cannot be cancelled',
      });
    }

    registration.status = 'Cancelled';
    await registration.save();

    // Update event registration count
    const event = await Event.findById(registration.event._id);
    if (event) {
      event.registrationCount -= 1;

      // Restore stock for merchandise
      if (event.eventType === 'Merchandise' && registration.purchasedItems) {
        for (const item of registration.purchasedItems) {
          const eventItem = event.items.find(
            (i) =>
              i.size === item.size &&
              i.color === item.color &&
              i.variant === item.variant
          );
          if (eventItem) {
            eventItem.stock += item.quantity;
          }
        }
      }

      await event.save();
    }

    res.json({
      message: 'Registration cancelled successfully',
      registration,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get event registrations (for organizer)
// @route   GET /api/registrations/event/:eventId
// @access  Private (Organizer)
const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const registrations = await Registration.find({ event: req.params.eventId })
      .populate('participant', 'firstName lastName email contactNumber participantType')
      .sort({ createdAt: -1 });

    res.json({
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Mark attendance
// @route   PUT /api/registrations/:id/attendance
// @access  Private (Organizer)
const markAttendance = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id).populate('event');

    if (!registration) {
      return res.status(404).json({
        message: 'Registration not found',
      });
    }

    // Check if user is the organizer
    if (registration.event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    registration.attended = true;
    registration.attendanceDate = new Date();
    registration.status = 'Attended';
    await registration.save();

    res.json({
      message: 'Attendance marked successfully',
      registration,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  getRegistrationByTicket,
  cancelRegistration,
  getEventRegistrations,
  markAttendance,
};
