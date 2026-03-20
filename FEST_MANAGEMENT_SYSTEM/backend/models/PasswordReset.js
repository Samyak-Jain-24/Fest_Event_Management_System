const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ['participant', 'organizer'],
      required: true,
    },
    organizerName: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
    },
    token: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    adminComment: {
      type: String,
      default: '',
    },
    generatedPassword: {
      type: String,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    processedAt: {
      type: Date,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  }
);

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

module.exports = PasswordReset;
