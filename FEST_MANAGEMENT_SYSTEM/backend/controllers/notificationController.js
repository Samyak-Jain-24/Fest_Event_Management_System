const Notification = require('../models/Notification');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const recipientModel = req.userRole === 'organizer' ? 'Organizer' : 'Participant';
    const { unreadOnly, eventId } = req.query;

    const query = {
      recipient: req.user._id,
      recipientModel,
    };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    if (eventId) {
      query.event = eventId;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('event', 'eventName');

    const unreadCountQuery = {
      recipient: req.user._id,
      recipientModel,
      isRead: false,
    };
    if (eventId) {
      unreadCountQuery.event = eventId;
    }
    const unreadCount = await Notification.countDocuments(unreadCountQuery);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const recipientModel = req.userRole === 'organizer' ? 'Organizer' : 'Participant';
    const { eventId } = req.body;

    const filter = { recipient: req.user._id, recipientModel, isRead: false };
    if (eventId) {
      filter.event = eventId;
    }

    await Notification.updateMany(filter, { isRead: true });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
