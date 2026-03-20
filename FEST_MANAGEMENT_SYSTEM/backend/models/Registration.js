const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: true,
    },
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    qrCode: {
      type: String, // Base64 encoded QR code
    },
    registrationType: {
      type: String,
      enum: ['Normal', 'Merchandise'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Registered', 'Attended', 'Cancelled', 'Rejected'],
      default: 'Registered',
    },
    
    // Normal event registration
    formData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    teamName: String,
    
    // Merchandise purchase
    purchasedItems: [
      {
        size: String,
        color: String,
        variant: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
      default: 'Completed',
    },
    
    paymentAmount: {
      type: Number,
      default: 0,
    },
    
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    
    attended: {
      type: Boolean,
      default: false,
    },
    
    attendanceDate: Date,
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
registrationSchema.index({ event: 1, participant: 1 });
registrationSchema.index({ ticketId: 1 });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
