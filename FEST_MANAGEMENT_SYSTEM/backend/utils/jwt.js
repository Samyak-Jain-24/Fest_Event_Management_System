const jwt = require('jsonwebtoken');

const jwt = require('jsonwebtoken');

/**
 * Generate a cryptographically signed JSON Web Token (JWT)
 * Extracted payload includes user identifier and user role
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    // Falls back to a 7 day expiration cycle if unset
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Validates integrity of a provided JSON Web Token
 * Throws an exception if the signature cannot be confirmed
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};
