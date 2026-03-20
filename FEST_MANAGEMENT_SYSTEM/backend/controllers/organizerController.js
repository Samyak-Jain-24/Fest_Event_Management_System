const Organizer = require('../models/Organizer');

// @desc    Get all organizers/clubs
// @route   GET /api/organizers
// @access  Public
const getOrganizers = async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = { isActive: true };

    if (search) {
      query.$or = [
        { organizerName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const organizers = await Organizer.find(query).select('-password');

    // If user is authenticated as participant, include follow status
    let organizersWithFollowStatus = organizers;
    if (req.user && req.userRole === 'participant') {
      const Participant = require('../models/Participant');
      const participant = await Participant.findById(req.user._id);
      
      organizersWithFollowStatus = organizers.map(organizer => {
        const organizerObj = organizer.toObject();
        organizerObj.isFollowing = participant.followedClubs.some(
          clubId => clubId.toString() === organizer._id.toString()
        );
        return organizerObj;
      });
    }

    res.json({
      count: organizersWithFollowStatus.length,
      organizers: organizersWithFollowStatus,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get organizer by ID
// @route   GET /api/organizers/:id
// @access  Public
const getOrganizerById = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).select('-password');

    if (!organizer) {
      return res.status(404).json({
        message: 'Organizer not found',
      });
    }

    // Get organizer's events
    const Event = require('../models/Event');
    const upcomingEvents = await Event.find({
      organizer: req.params.id,
      status: 'Published',
      eventStartDate: { $gte: new Date() },
    }).sort({ eventStartDate: 1 });

    const pastEvents = await Event.find({
      organizer: req.params.id,
      status: { $in: ['Completed', 'Closed'] },
    }).sort({ eventStartDate: -1 });

    // Check if user is following this organizer
    let isFollowing = false;
    if (req.user && req.userRole === 'participant') {
      const Participant = require('../models/Participant');
      const participant = await Participant.findById(req.user._id);
      isFollowing = participant.followedClubs.some(
        clubId => clubId.toString() === req.params.id
      );
    }

    res.json({
      organizer,
      upcomingEvents,
      pastEvents,
      isFollowing,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get organizer profile (own)
// @route   GET /api/organizers/profile
// @access  Private (Organizer)
const getOrganizerProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.user._id).select('-password');

    res.json(organizer);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Update organizer profile
// @route   PUT /api/organizers/profile
// @access  Private (Organizer)
const updateOrganizerProfile = async (req, res) => {
  try {
    const { organizerName, category, description, contactEmail, contactNumber, discordWebhook } =
      req.body;

    const organizer = await Organizer.findById(req.user._id);

    if (!organizer) {
      return res.status(404).json({
        message: 'Organizer not found',
      });
    }

    // Update editable fields (email is not editable)
    organizer.organizerName = organizerName || organizer.organizerName;
    organizer.category = category || organizer.category;
    organizer.description = description || organizer.description;
    organizer.contactEmail = contactEmail || organizer.contactEmail;
    organizer.contactNumber = contactNumber || organizer.contactNumber;

    if (discordWebhook !== undefined) {
      organizer.discordWebhook = discordWebhook;
    }

    await organizer.save();

    res.json({
      message: 'Profile updated successfully',
      organizer,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get organizer dashboard analytics
// @route   GET /api/organizers/analytics
// @access  Private (Organizer)
const getOrganizerAnalytics = async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');

    // Get all organizer's completed events
    const completedEvents = await Event.find({
      organizer: req.user._id,
      status: { $in: ['Completed', 'Closed'] },
    });

    const eventIds = completedEvents.map((e) => e._id);

    // Get registrations for completed events
    const registrations = await Registration.find({
      event: { $in: eventIds },
    });

    // Calculate stats
    const totalRegistrations = registrations.length;
    const totalAttendance = registrations.filter((r) => r.attended).length;
    const totalRevenue = registrations.reduce((sum, r) => sum + r.paymentAmount, 0);

    // Event-wise breakdown
    const eventStats = await Promise.all(
      completedEvents.map(async (event) => {
        const eventRegs = await Registration.find({ event: event._id });
        const attendance = eventRegs.filter((r) => r.attended).length;
        const revenue = eventRegs.reduce((sum, r) => sum + r.paymentAmount, 0);

        return {
          eventId: event._id,
          eventName: event.eventName,
          registrations: eventRegs.length,
          attendance,
          revenue,
        };
      })
    );

    res.json({
      totalEvents: completedEvents.length,
      totalRegistrations,
      totalAttendance,
      totalRevenue,
      eventStats,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  getOrganizers,
  getOrganizerById,
  getOrganizerProfile,
  updateOrganizerProfile,
  getOrganizerAnalytics,
};
