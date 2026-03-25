const Organizer = require('../models/Organizer');
const PasswordReset = require('../models/PasswordReset');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// @desc    Create new organizer account
// @route   POST /api/admin/organizers
// @access  Private (Admin)
// Secure admin access to provision new organizers
const createOrganizer = async (req, res) => {
  try {
    const { organizerName, email, category, description, contactEmail, contactNumber } = req.body;

    // Check if organizer already exists
    const existingOrganizer = await Organizer.findOne({ email });
    if (existingOrganizer) {
      return res.status(400).json({
        message: 'Organizer with this email already exists',
      });
    }

    // Generate a secure random password for the organizer
    const generatedPassword = crypto.randomBytes(6).toString('base64');

    // Create organizer with generated password (hashed by Organizer pre-save hook)
    const organizer = await Organizer.create({
      organizerName,
      email,
      password: generatedPassword,
      category,
      description,
      contactEmail,
      contactNumber,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: 'Organizer account created successfully',
      organizer: {
        id: organizer._id,
        organizerName: organizer.organizerName,
        email: organizer.email,
        category: organizer.category,
      },
      credentials: {
        email: organizer.email,
        password: generatedPassword,
      },
    });
  } catch (error) {
    console.error('Create organizer error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all organizers (including inactive)
// @route   GET /api/admin/organizers
// @access  Private (Admin)
const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await Organizer.find().select('-password').sort({ createdAt: -1 });

    res.json({
      count: organizers.length,
      organizers,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Remove/disable organizer
// @route   PUT /api/admin/organizers/:id/toggle-active
// @access  Private (Admin)
const toggleOrganizerActive = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        message: 'Organizer not found',
      });
    }

    organizer.isActive = !organizer.isActive;
    await organizer.save();

    res.json({
      message: `Organizer ${organizer.isActive ? 'activated' : 'deactivated'} successfully`,
      organizer,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Delete organizer permanently
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin)
const deleteOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        message: 'Organizer not found',
      });
    }

    // Check if organizer has any events
    const Event = require('../models/Event');
    const eventCount = await Event.countDocuments({ organizer: req.params.id });

    if (eventCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete organizer with existing events. Deactivate instead.',
      });
    }

    await organizer.deleteOne();

    res.json({
      message: 'Organizer deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Get all password reset requests (all statuses with history)
// @route   GET /api/admin/password-resets
// @access  Private (Admin)
const getPasswordResets = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status && status !== 'All') {
      query.status = status;
    }

    const requests = await PasswordReset.find(query).sort({ requestedAt: -1 });

    res.json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Approve password reset (auto-generates password)
// @route   PUT /api/admin/password-resets/:id/approve
// @access  Private (Admin)
const approvePasswordReset = async (req, res) => {
  try {
    const resetRequest = await PasswordReset.findById(req.params.id);

    if (!resetRequest) {
      return res.status(404).json({
        message: 'Reset request not found',
      });
    }

    if (resetRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'Request has already been processed',
      });
    }

    const { adminComment } = req.body;

    // Auto-generate a secure password
    const generatedPassword = crypto.randomBytes(6).toString('hex'); // 12 chars

    // Update user password based on type
    let user;
    if (resetRequest.userType === 'participant') {
      const Participant = require('../models/Participant');
      user = await Participant.findOne({ email: resetRequest.email });
    } else if (resetRequest.userType === 'organizer') {
      user = await Organizer.findOne({ email: resetRequest.email });
    }

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    user.password = generatedPassword;
    await user.save();

    resetRequest.status = 'Approved';
    resetRequest.adminComment = adminComment || '';
    resetRequest.generatedPassword = generatedPassword;
    resetRequest.processedBy = req.user._id;
    resetRequest.processedAt = new Date();
    await resetRequest.save();

    res.json({
      message: 'Password reset approved. New password has been generated.',
      generatedPassword,
    });
  } catch (error) {
    console.error('Approve password reset error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Reject password reset (with optional comment)
// @route   PUT /api/admin/password-resets/:id/reject
// @access  Private (Admin)
const rejectPasswordReset = async (req, res) => {
  try {
    const resetRequest = await PasswordReset.findById(req.params.id);

    if (!resetRequest) {
      return res.status(404).json({
        message: 'Reset request not found',
      });
    }

    if (resetRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'Request has already been processed',
      });
    }

    const { adminComment } = req.body;

    resetRequest.status = 'Rejected';
    resetRequest.adminComment = adminComment || '';
    resetRequest.processedBy = req.user._id;
    resetRequest.processedAt = new Date();
    await resetRequest.save();

    res.json({
      message: 'Password reset request rejected',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Request password reset (for participants/organizers)
// @route   POST /api/admin/password-reset-request
// @access  Public
const requestPasswordReset = async (req, res) => {
  try {
    const { email, userType, reason } = req.body;

    // Check if user exists
    let user;
    if (userType === 'participant') {
      const Participant = require('../models/Participant');
      user = await Participant.findOne({ email });
    } else if (userType === 'organizer') {
      user = await Organizer.findOne({ email });
    }

    if (!user) {
      // Don't reveal if email exists
      return res.json({
        message: 'If the email exists, a password reset request has been submitted',
      });
    }

    // Check for existing pending request
    const existingPending = await PasswordReset.findOne({
      email,
      userType,
      status: 'Pending',
    });
    if (existingPending) {
      return res.status(400).json({
        message: 'You already have a pending password reset request. Please wait for admin to process it.',
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Build reset request with organizer details
    const resetData = {
      email,
      userType,
      token,
      reason: reason || '',
    };

    if (userType === 'organizer') {
      resetData.organizerName = user.organizerName || '';
      resetData.category = user.category || '';
    }

    // Create reset request
    await PasswordReset.create(resetData);

    res.json({
      message: 'Password reset request submitted. Please wait for admin approval.',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  createOrganizer,
  getAllOrganizers,
  toggleOrganizerActive,
  deleteOrganizer,
  getPasswordResets,
  approvePasswordReset,
  rejectPasswordReset,
  requestPasswordReset,
};
