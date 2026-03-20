const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const bcrypt = require('bcryptjs');

// @desc    Get participant profile
// @route   GET /api/participants/profile
// @access  Private (Participant)
const getProfile = async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id)
      .populate('followedClubs', 'organizerName category description');

    res.json(participant);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Update participant profile
// @route   PUT /api/participants/profile
// @access  Private (Participant)
const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      contactNumber,
      college,
      organizationName,
      areasOfInterest,
    } = req.body;

    const participant = await Participant.findById(req.user._id);

    if (!participant) {
      return res.status(404).json({
        message: 'Participant not found',
      });
    }

    // Update editable fields
    participant.firstName = firstName || participant.firstName;
    participant.lastName = lastName || participant.lastName;
    participant.contactNumber = contactNumber || participant.contactNumber;

    if (participant.participantType === 'IIIT') {
      participant.organizationName = organizationName || participant.organizationName;
    } else {
      participant.college = college || participant.college;
    }

    if (areasOfInterest) {
      participant.areasOfInterest = areasOfInterest;
    }

    await participant.save();

    res.json({
      message: 'Profile updated successfully',
      participant,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Update preferences (areas of interest, followed clubs)
// @route   PUT /api/participants/preferences
// @access  Private (Participant)
const updatePreferences = async (req, res) => {
  try {
    const { areasOfInterest, followedClubs } = req.body;

    const participant = await Participant.findById(req.user._id);

    if (areasOfInterest) {
      participant.areasOfInterest = areasOfInterest;
    }

    if (followedClubs) {
      participant.followedClubs = followedClubs;
    }

    await participant.save();

    res.json({
      message: 'Preferences updated successfully',
      participant,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Follow/Unfollow organizer
// @route   POST /api/participants/follow/:organizerId
// @access  Private (Participant)
const toggleFollowOrganizer = async (req, res) => {
  try {
    const { organizerId } = req.params;

    const participant = await Participant.findById(req.user._id);
    const organizer = await Organizer.findById(organizerId);

    if (!organizer) {
      return res.status(404).json({
        message: 'Organizer not found',
      });
    }

    const isFollowing = participant.followedClubs.includes(organizerId);

    if (isFollowing) {
      // Unfollow
      participant.followedClubs = participant.followedClubs.filter(
        (id) => id.toString() !== organizerId
      );
    } else {
      // Follow
      participant.followedClubs.push(organizerId);
    }

    await participant.save();

    res.json({
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowing: !isFollowing,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Change password
// @route   PUT /api/participants/change-password
// @access  Private (Participant)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const participant = await Participant.findById(req.user._id).select('+password');

    // Verify current password
    const isPasswordValid = await participant.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect',
      });
    }

    // Update password
    participant.password = newPassword;
    await participant.save();

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePreferences,
  toggleFollowOrganizer,
  changePassword,
};
