const Event = require('../models/Event');
const Registration = require('../models/Registration');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const { generateTicketId, generateQRCode } = require('../utils/qrcode');
const { sendTicketEmail } = require('../utils/email');
const { postToDiscord } = require('../utils/discord');
const Fuse = require('fuse.js');

// @desc    Get all events (with filters and search)
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const {
      search,
      eventType,
      eligibility,
      dateFrom,
      dateTo,
      tags,
      organizer,
      followed,
      trending,
    } = req.query;

    let query = { status: 'Published' };

    // Filter by event type
    if (eventType) {
      query.eventType = eventType;
    }

    // Filter by eligibility
    if (eligibility) {
      query.eligibility = { $in: [eligibility, 'All'] };
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.eventStartDate = {};
      if (dateFrom) query.eventStartDate.$gte = new Date(dateFrom);
      if (dateTo) query.eventStartDate.$lte = new Date(dateTo);
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',');
      query.eventTags = { $in: tagArray };
    }

    // Filter by organizer
    if (organizer) {
      query.organizer = organizer;
    }

    // Filter by followed clubs (if participant is logged in)
    if (followed && req.user) {
      const participant = await Participant.findById(req.user._id);
      query.organizer = { $in: participant.followedClubs };
    }

    let events;

    // Helper: run aggregation pipeline to get top 5 trending events
    // Trending score = views + 3 * registrationCount (registrations weigh more)
    const getTrendingEvents = async (matchQuery, limit = 5) => {
      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            trendingScore: {
              $add: [
                { $ifNull: ['$views', 0] },
                { $multiply: [3, { $ifNull: ['$registrationCount', 0] }] },
              ],
            },
          },
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'organizers',
            localField: 'organizer',
            foreignField: '_id',
            as: 'organizer',
          },
        },
        { $unwind: '$organizer' },
        {
          $project: {
            'organizer.password': 0,
            'organizer.email': 0,
            trendingScore: 0,
          },
        },
      ];
      return Event.aggregate(pipeline);
    };

    // Sort by trending (combined views + registration count)
    // If user is a participant, prioritize events from followed clubs
    if (trending === 'true') {
      if (req.user && req.userRole === 'participant') {
        const participant = await Participant.findById(req.user._id);
        
        if (participant.followedClubs && participant.followedClubs.length > 0) {
          // First, get top events from followed clubs
          const followedQuery = { ...query, organizer: { $in: participant.followedClubs } };
          const followedEvents = await getTrendingEvents(followedQuery, 5);
          
          // If we got less than 5 from followed clubs, fill with other trending events
          if (followedEvents.length < 5) {
            const excludeIds = followedEvents.map(e => e._id);
            const remainingQuery = { 
              ...query, 
              _id: { $nin: excludeIds },
              organizer: { $nin: participant.followedClubs }
            };
            const otherEvents = await getTrendingEvents(remainingQuery, 5 - followedEvents.length);
            
            events = [...followedEvents, ...otherEvents];
          } else {
            events = followedEvents;
          }
        } else {
          // No followed clubs, get regular trending
          events = await getTrendingEvents(query, 5);
        }
      } else {
        // Not logged in or not a participant, get regular trending
        events = await getTrendingEvents(query, 5);
      }
    } else {
      // Regular query (not trending)
      events = await Event.find(query)
        .populate('organizer', 'organizerName category description')
        .sort({ createdAt: -1 });
    }

    // Apply partial & fuzzy matching on event name, description, and organizer name
    let filteredEvents = events;
    if (search && events && events.length > 0) {
      const plainEvents = events.map(e =>
        typeof e.toObject === 'function' ? e.toObject() : { ...e }
      );

      const fuse = new Fuse(plainEvents, {
        keys: [
          { name: 'eventName', weight: 0.5 },
          { name: 'eventDescription', weight: 0.3 },
          { name: 'organizer.organizerName', weight: 0.2 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });

      const fuseResults = fuse.search(search);
      filteredEvents = fuseResults.map(r => r.item);
    }

    // If user is authenticated as participant, include registration status
    let eventsWithRegistrationStatus = filteredEvents;
    if (req.user && req.userRole === 'participant' && filteredEvents.length > 0) {
      const Registration = require('../models/Registration');
      const registrations = await Registration.find({
        participant: req.user._id,
        event: { $in: filteredEvents.map(e => e._id) },
        status: { $ne: 'Cancelled' }
      });

      const registeredEventIds = new Set(registrations.map(r => r.event.toString()));
      
      eventsWithRegistrationStatus = filteredEvents.map(event => {
        const eventObj = typeof event.toObject === 'function' ? event.toObject() : { ...event };
        eventObj.isRegistered = registeredEventIds.has(event._id.toString());
        return eventObj;
      });
    }

    res.json({
      count: eventsWithRegistrationStatus.length,
      events: eventsWithRegistrationStatus,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      'organizer',
      'organizerName category description contactEmail'
    );

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Increment views
    event.views += 1;
    await event.save();

    // Check if user has registered for this event
    let isRegistered = false;
    let hasPendingOrder = false;
    let merchandiseOrderStatus = null;
    if (req.user && req.userRole === 'participant') {
      const registration = await Registration.findOne({
        participant: req.user._id,
        event: req.params.id,
        status: { $ne: 'Cancelled' }
      });
      isRegistered = !!registration;

      // For merchandise events, also check merchandise orders
      if (event.eventType === 'Merchandise') {
        const existingOrder = await MerchandiseOrder.findOne({
          event: req.params.id,
          participant: req.user._id,
          paymentStatus: { $in: ['Pending Approval', 'Approved'] },
        });
        if (existingOrder) {
          hasPendingOrder = true;
          merchandiseOrderStatus = existingOrder.paymentStatus;
          isRegistered = true; // treat as registered to prevent re-ordering
        }
      }
    }

    const eventObj = event.toObject();
    eventObj.isRegistered = isRegistered;
    eventObj.hasPendingOrder = hasPendingOrder;
    eventObj.merchandiseOrderStatus = merchandiseOrderStatus;

    res.json(eventObj);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Organizer)
const createEvent = async (req, res) => {
  try {
    const {
      eventName,
      eventDescription,
      eventType,
      eligibility,
      registrationDeadline,
      eventStartDate,
      eventEndDate,
      registrationLimit,
      registrationFee,
      eventTags,
      customForm,
      items,
      status,
    } = req.body;

    // Validate dates
    if (new Date(registrationDeadline) >= new Date(eventStartDate)) {
      return res.status(400).json({
        message: 'Registration deadline must be before event start date',
      });
    }

    if (new Date(eventStartDate) >= new Date(eventEndDate)) {
      return res.status(400).json({
        message: 'Event start date must be before end date',
      });
    }

    const event = await Event.create({
      eventName,
      eventDescription,
      eventType,
      eligibility: eligibility || 'All',
      organizer: req.user._id,
      registrationDeadline,
      eventStartDate,
      eventEndDate,
      registrationLimit,
      registrationFee: registrationFee || 0,
      eventTags: eventTags || [],
      customForm: eventType === 'Normal' ? customForm : undefined,
      items: eventType === 'Merchandise' ? items : undefined,
      status: status || 'Draft',
    });

    // If status is Published, post to Discord
    if (status === 'Published') {
      console.log(`New event "${event.eventName}" created with Published status, triggering Discord notification`);
      const organizer = await Organizer.findById(req.user._id);
      if (organizer.discordWebhook) {
        console.log(`Organizer has webhook configured: ${organizer.discordWebhook.substring(0, 50)}...`);
        await postToDiscord(organizer.discordWebhook, event);
      } else {
        console.log('⚠️  No Discord webhook configured for this organizer');
      }
    }

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to update this event',
      });
    }

    // Check editing rules based on status
    const canEditAll = event.status === 'Draft';
    const canEditLimited = event.status === 'Published';
    const canOnlyChangeStatus = ['Ongoing', 'Completed', 'Closed'].includes(event.status);

    if (canOnlyChangeStatus) {
      // Only status can be changed
      if (req.body.status && ['Ongoing', 'Completed', 'Closed'].includes(req.body.status)) {
        event.status = req.body.status;
        await event.save();
        return res.json({
          message: 'Event status updated',
          event,
        });
      }
      return res.status(400).json({
        message: 'Event cannot be edited in current status. Only status change allowed.',
      });
    }

    // Define allowed updates based on status
    let allowedUpdates;
    if (canEditAll) {
      // Draft: Allow all updates except organizer
      allowedUpdates = Object.keys(req.body).filter(key => key !== 'organizer');
    } else if (canEditLimited) {
      // Published: Allow description, extend deadline, increase limit, close registrations (status change)
      allowedUpdates = ['eventDescription', 'registrationDeadline', 'registrationLimit', 'status'];
      // For Published events, only allow increasing the limit
      if (req.body.registrationLimit && req.body.registrationLimit < event.registrationLimit) {
        return res.status(400).json({
          message: 'Cannot decrease registration limit for published events',
        });
      }
    } else {
      allowedUpdates = [];
    }

    // Save original status before updating
    const originalStatus = event.status;

    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    // If publishing event, post to Discord
    if (req.body.status === 'Published' && originalStatus !== 'Published') {
      console.log(`Event "${event.eventName}" is being published, triggering Discord notification`);
      const organizer = await Organizer.findById(req.user._id);
      if (organizer.discordWebhook) {
        console.log(`Organizer has webhook configured: ${organizer.discordWebhook.substring(0, 50)}...`);
        await postToDiscord(organizer.discordWebhook, event);
      } else {
        console.log('⚠️  No Discord webhook configured for this organizer');
      }
    }

    await event.save();

    res.json({
      message: 'Event updated successfully',
      event,  
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized to delete this event',
      });
    }

    // Can only delete draft events
    if (event.status !== 'Draft') {
      return res.status(400).json({
        message: 'Only draft events can be deleted',
      });
    }

    await event.deleteOne();

    res.json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get organizer's events
// @route   GET /api/events/organizer/my-events
// @access  Private (Organizer)
const getOrganizerEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });

    res.json({
      count: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
};
