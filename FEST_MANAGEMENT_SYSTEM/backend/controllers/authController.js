const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');
const PasswordReset = require('../models/PasswordReset');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const validator = require('validator');
const crypto = require('crypto');

// @desc    Register a new participant
// @route   POST /api/auth/register/participant
// @access  Public
const registerParticipant = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType,
      contactNumber,
      college,
      organizationName,
      areasOfInterest,
    } = req.body;

    // Validate IIIT email for IIIT participants
    if (participantType === 'IIIT' && !email.endsWith('@students.iiit.ac.in') && !email.endsWith('@research.iiit.ac.in')) {
      return res.status(400).json({
        message: 'IIIT participants must use IIIT-issued email ID (@students.iiit.ac.in or @research.iiit.ac.in)',
      });
    }

    // Check if user already exists
    const existingParticipant = await Participant.findOne({ email });
    if (existingParticipant) {
      return res.status(400).json({
        message: 'Participant with this email already exists',
      });
    }

    // Create participant
    const participant = await Participant.create({
      firstName,
      lastName,
      email,
      password,
      participantType,
      contactNumber,
      college: participantType === 'Non-IIIT' ? college : undefined,
      organizationName: participantType === 'IIIT' ? organizationName : undefined,
      areasOfInterest: areasOfInterest || [],
    });

    // Generate token
    const token = generateToken(participant._id, participant.role);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: participant._id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        role: participant.role,
        participantType: participant.participantType,
      },
    });
  } catch (error) {
    console.error('Register participant error:', error);
    res.status(500).json({
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Login participant/organizer
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: 'Please provide email, password, and role',
      });
    }

    let user;
    let Model;

    // Determine which model to use based on role
    if (role === 'participant') {
      Model = Participant;
    } else if (role === 'organizer') {
      Model = Organizer;
    } else if (role === 'admin') {
      Model = Admin;
    } else {
      return res.status(400).json({
        message: 'Invalid role',
      });
    }

    // Find user with password field
    user = await Model.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Check if organizer is active
    if (role === 'organizer' && !user.isActive) {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact admin.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken(user._id, role);

    // Prepare user data
    const userData = {
      id: user._id,
      email: user.email,
      role: role,
    };

    if (role === 'participant') {
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.participantType = user.participantType;
    } else if (role === 'organizer') {
      userData.organizerName = user.organizerName;
      userData.category = user.category;
    }

    res.json({
      message: 'Login successful',
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json({
      user: req.user,
      role: req.userRole,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Please provide email address',
      });
    }

    // Check if participant exists
    const participant = await Participant.findOne({ email });

    if (!participant) {
      // Don't reveal if user exists or not for security
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Delete any existing password reset requests for this email
    await PasswordReset.deleteMany({ email, userType: 'participant' });

    // Create password reset record
    await PasswordReset.create({
      email,
      userType: 'participant',
      token: resetToken,
      status: 'Pending',
    });

    // Send email with reset link
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: 'Please provide a new password',
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
      });
    }

    // Find valid password reset request
    const passwordResetRequest = await PasswordReset.findOne({
      token,
      userType: 'participant',
      status: 'Pending',
      expiresAt: { $gt: Date.now() },
    });

    if (!passwordResetRequest) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
      });
    }

    // Find participant
    const participant = await Participant.findOne({
      email: passwordResetRequest.email,
    });

    if (!participant) {
      return res.status(404).json({
        message: 'Participant not found',
      });
    }

    // Update password
    participant.password = newPassword;
    await participant.save();

    // Delete the password reset request
    await PasswordReset.deleteOne({ _id: passwordResetRequest._id });

    res.json({
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

module.exports = {
  registerParticipant,
  login,
  getMe,
  requestPasswordReset,
  resetPassword,
};
