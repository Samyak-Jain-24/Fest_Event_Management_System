const jwt = require('jsonwebtoken');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');
const Admin = require('../models/Admin');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user based on role
      let user;
      if (decoded.role === 'participant') {
        user = await Participant.findById(decoded.id).select('-password');
      } else if (decoded.role === 'organizer') {
        user = await Organizer.findById(decoded.id).select('-password');
      } else if (decoded.role === 'admin') {
        user = await Admin.findById(decoded.id).select('-password');
      }

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      req.userRole = decoded.role;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        message: `User role '${req.userRole}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if organizer is active
const checkOrganizerActive = async (req, res, next) => {
  if (req.userRole === 'organizer') {
    const organizer = await Organizer.findById(req.user._id);
    if (!organizer.isActive) {
      return res.status(403).json({
        message: 'Your organizer account has been deactivated. Please contact admin.',
      });
    }
  }
  next();
};

// Optional authentication - tries to authenticate but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user based on role
      let user;
      if (decoded.role === 'participant') {
        user = await Participant.findById(decoded.id).select('-password');
      } else if (decoded.role === 'organizer') {
        user = await Organizer.findById(decoded.id).select('-password');
      } else if (decoded.role === 'admin') {
        user = await Admin.findById(decoded.id).select('-password');
      }

      if (user) {
        req.user = user;
        req.userRole = decoded.role;
      }
    } catch (error) {
      // Token is invalid, but we don't fail - just continue without user
      console.log('Optional auth: Invalid token, continuing without authentication');
    }
  }

  // Always continue to next middleware
  next();
};

module.exports = {
  protect,
  authorize,
  checkOrganizerActive,
  optionalAuth,
};
