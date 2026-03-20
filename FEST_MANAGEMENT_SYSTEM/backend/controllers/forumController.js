const ForumMessage = require('../models/ForumMessage');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const MerchandiseOrder = require('../models/MerchandiseOrder');
const Notification = require('../models/Notification');

// Helper: check if participant is registered for the event
const isParticipantRegistered = async (participantId, eventId, eventType) => {
  // Check normal registration
  const registration = await Registration.findOne({
    participant: participantId,
    event: eventId,
    status: { $ne: 'Cancelled' },
  });
  if (registration) return true;

  // For merchandise events, also check approved merchandise orders
  if (eventType === 'Merchandise') {
    const order = await MerchandiseOrder.findOne({
      participant: participantId,
      event: eventId,
      paymentStatus: { $in: ['Pending Approval', 'Approved'] },
    });
    if (order) return true;
  }

  return false;
};

// Helper: create notifications for forum activity
const createForumNotifications = async ({ event, message, author, authorName, type }) => {
  try {
    const eventDoc = await Event.findById(event).populate('organizer', 'organizerName');
    if (!eventDoc) return;

    const notifications = [];

    if (type === 'announcement') {
      // Notify all registered participants about announcement
      const registrations = await Registration.find({
        event,
        status: { $ne: 'Cancelled' },
      }).select('participant');

      const participantIds = registrations.map(r => r.participant.toString());

      // Also check merchandise orders
      const merchandiseOrders = await MerchandiseOrder.find({
        event,
        paymentStatus: { $in: ['Pending Approval', 'Approved'] },
      }).select('participant');
      merchandiseOrders.forEach(o => {
        const pid = o.participant.toString();
        if (!participantIds.includes(pid)) participantIds.push(pid);
      });

      for (const pid of participantIds) {
        if (pid !== author.toString()) {
          notifications.push({
            recipient: pid,
            recipientModel: 'Participant',
            type: 'forum_announcement',
            title: `📢 New Announcement in "${eventDoc.eventName}"`,
            message: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
            event,
            forumMessage: message._id,
          });
        }
      }
    } else if (type === 'reply') {
      // Notify the parent message author about the reply
      const parentMsg = await ForumMessage.findById(message.parentMessage);
      if (parentMsg && parentMsg.author.toString() !== author.toString()) {
        notifications.push({
          recipient: parentMsg.author,
          recipientModel: parentMsg.authorModel,
          type: 'forum_reply',
          title: `💬 New reply to your message in "${eventDoc.eventName}"`,
          message: `${authorName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
          event,
          forumMessage: message._id,
        });
      }
    } else if (type === 'new_message') {
      // Notify event organizer about new messages (so they can moderate/respond)
      if (eventDoc.organizer._id.toString() !== author.toString()) {
        notifications.push({
          recipient: eventDoc.organizer._id,
          recipientModel: 'Organizer',
          type: 'forum_reply',
          title: `💬 New message in "${eventDoc.eventName}" forum`,
          message: `${authorName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
          event,
          forumMessage: message._id,
        });
      }

      // Also notify all registered participants about new forum messages
      const registrations = await Registration.find({
        event,
        status: { $ne: 'Cancelled' },
      }).select('participant');

      const participantIds = registrations.map(r => r.participant.toString());

      // Also check merchandise orders
      const merchandiseOrders = await MerchandiseOrder.find({
        event,
        paymentStatus: { $in: ['Pending Approval', 'Approved'] },
      }).select('participant');
      merchandiseOrders.forEach(o => {
        const pid = o.participant.toString();
        if (!participantIds.includes(pid)) participantIds.push(pid);
      });

      for (const pid of participantIds) {
        if (pid !== author.toString()) {
          notifications.push({
            recipient: pid,
            recipientModel: 'Participant',
            type: 'forum_reply',
            title: `💬 New message in "${eventDoc.eventName}" forum`,
            message: `${authorName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
            event,
            forumMessage: message._id,
          });
        }
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Create forum notifications error:', error);
    // Non-critical, don't throw
  }
};

// @desc    Get messages for an event (top-level + pinned first)
// @route   GET /api/forum/:eventId
// @access  Public (optionalAuth for personalized data)
const getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Determine if user can post (registered participant or event organizer)
    let canPost = false;
    if (req.user) {
      if (req.userRole === 'organizer' && event.organizer.toString() === req.user._id.toString()) {
        canPost = true;
      } else if (req.userRole === 'participant') {
        canPost = await isParticipantRegistered(req.user._id, eventId, event.eventType);
      }
    }

    // Get top-level messages (no parent), pinned first then by date
    const messages = await ForumMessage.find({
      event: eventId,
      parentMessage: null,
    })
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ForumMessage.countDocuments({
      event: eventId,
      parentMessage: null,
    });

    // Get announcements separately (always shown at top)
    const announcements = await ForumMessage.find({
      event: eventId,
      isAnnouncement: true,
      parentMessage: null,
    }).sort({ createdAt: -1 });

    res.json({
      messages,
      announcements,
      canPost,
      isEventOrganizer: req.user && req.userRole === 'organizer' && event.organizer.toString() === req.user._id.toString(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get replies to a message (thread)
// @route   GET /api/forum/:eventId/thread/:messageId
// @access  Public
const getThreadReplies = async (req, res) => {
  try {
    const { messageId } = req.params;

    const parentMessage = await ForumMessage.findById(messageId);
    if (!parentMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const replies = await ForumMessage.find({
      parentMessage: messageId,
    }).sort({ createdAt: 1 });

    res.json({ parentMessage, replies });
  } catch (error) {
    console.error('Get thread replies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Post a new message or reply
// @route   POST /api/forum/:eventId
// @access  Private (registered participant or event organizer)
const postMessage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, parentMessage, isAnnouncement } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Determine author info
    const isOrganizer = req.userRole === 'organizer';
    const authorModel = isOrganizer ? 'Organizer' : 'Participant';
    const authorName = isOrganizer
      ? req.user.organizerName
      : `${req.user.firstName} ${req.user.lastName}`;

    // Authorization check:
    // - Organizers: must be the event's organizer
    // - Participants: must be registered for the event
    if (isOrganizer) {
      if (event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the event organizer can post in this forum' });
      }
    } else {
      // Participant - must be registered
      const registered = await isParticipantRegistered(req.user._id, eventId, event.eventType);
      if (!registered) {
        return res.status(403).json({ message: 'You must be registered for this event to post in the forum' });
      }
    }

    // Only organizer of this event can post announcements
    if (isAnnouncement && (!isOrganizer || event.organizer.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Only the event organizer can post announcements' });
    }

    const messageData = {
      event: eventId,
      author: req.user._id,
      authorModel,
      authorName,
      content: content.trim(),
      parentMessage: parentMessage || null,
      isAnnouncement: isAnnouncement && isOrganizer ? true : false,
    };

    const message = await ForumMessage.create(messageData);

    // Update reply count on parent message
    if (parentMessage) {
      await ForumMessage.findByIdAndUpdate(parentMessage, {
        $inc: { replyCount: 1 },
      });
    }

    // Create notifications
    if (isAnnouncement) {
      await createForumNotifications({
        event: eventId,
        message,
        author: req.user._id,
        authorName,
        type: 'announcement',
      });
    } else if (parentMessage) {
      await createForumNotifications({
        event: eventId,
        message,
        author: req.user._id,
        authorName,
        type: 'reply',
      });
    } else {
      await createForumNotifications({
        event: eventId,
        message,
        author: req.user._id,
        authorName,
        type: 'new_message',
      });
    }

    res.status(201).json({ message: 'Message posted successfully', data: message });
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (organizer moderation or own message)
// @route   DELETE /api/forum/:eventId/message/:messageId
// @access  Private (organizer of event or message author)
const deleteMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization: event organizer or message author
    const isEventOrganizer =
      req.userRole === 'organizer' && event.organizer.toString() === req.user._id.toString();
    const isMessageAuthor = message.author.toString() === req.user._id.toString();

    if (!isEventOrganizer && !isMessageAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // If deleting a parent message, also delete all replies
    if (!message.parentMessage) {
      await ForumMessage.deleteMany({ parentMessage: messageId });
    } else {
      // Decrement parent's reply count
      await ForumMessage.findByIdAndUpdate(message.parentMessage, {
        $inc: { replyCount: -1 },
      });
    }

    await message.deleteOne();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Pin/unpin a message (organizer only)
// @route   PUT /api/forum/:eventId/message/:messageId/pin
// @access  Private (organizer of event)
const togglePinMessage = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.userRole !== 'organizer' || event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the event organizer can pin messages' });
    }

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.json({
      message: message.isPinned ? 'Message pinned' : 'Message unpinned',
      data: message,
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add/remove reaction to a message
// @route   PUT /api/forum/:eventId/message/:messageId/react
// @access  Private (registered participant or event organizer)
const toggleReaction = async (req, res) => {
  try {
    const { eventId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check authorization
    const isOrganizer = req.userRole === 'organizer';
    if (isOrganizer) {
      if (event.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized for this event forum' });
      }
    } else {
      const registered = await isParticipantRegistered(req.user._id, eventId, event.eventType);
      if (!registered) {
        return res.status(403).json({ message: 'You must be registered for this event to react' });
      }
    }

    const message = await ForumMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const userType = isOrganizer ? 'Organizer' : 'Participant';

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReactionIndex >= 0) {
      // Remove reaction (toggle off)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        user: req.user._id,
        userType,
        emoji,
      });

      // Notify message author about reaction
      if (message.author.toString() !== req.user._id.toString()) {
        const authorName = isOrganizer
          ? req.user.organizerName
          : `${req.user.firstName} ${req.user.lastName}`;
        try {
          await Notification.create({
            recipient: message.author,
            recipientModel: message.authorModel,
            type: 'forum_reaction',
            title: `${emoji} Reaction on your message`,
            message: `${authorName} reacted ${emoji} to your message in the forum`,
            event: eventId,
            forumMessage: messageId,
          });
        } catch (e) {
          // Non-critical
        }
      }
    }

    await message.save();

    res.json({ message: 'Reaction updated', data: message });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMessages,
  getThreadReplies,
  postMessage,
  deleteMessage,
  togglePinMessage,
  toggleReaction,
};
