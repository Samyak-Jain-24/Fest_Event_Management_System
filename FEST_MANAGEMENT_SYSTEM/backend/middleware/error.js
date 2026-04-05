/**
 * Global Error Handling Middleware
 * Captures unhandled backend exceptions and returns standardized JSON responses.
 * Detects common failure patterns such as: Mongoose failures, Dup Keys, JWT faults.
 */
const errorHandler = (err, req, res, next) => {
  // Log stack traces to server console for debugging infrastructure
  console.error('[System Error Caught]:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Resource not found',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `${field} already exists`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      message: messages.join(', '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Error',
  });
};

// Not found middleware
const notFound = (req, res, next) => {
  res.status(404).json({
    message: `Route not found - ${req.originalUrl}`,
  });
};

module.exports = {
  errorHandler,
  notFound,
};
