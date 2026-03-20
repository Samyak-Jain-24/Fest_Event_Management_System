const mongoose = require('mongoose');

const merchandiseOrderSchema = new mongoose.Schema(
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
    items: [
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
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentProof: {
      type: String, // Base64-encoded image
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Rejected'],
      default: 'Pending Approval',
    },
    // After approval, a ticket + QR are generated
    ticketId: {
      type: String,
      unique: true,
      sparse: true,
    },
    qrCode: {
      type: String, // Base64 encoded QR code
    },
    rejectionReason: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
    },
    approvedAt: Date,
    rejectedAt: Date,
  },
  {
    timestamps: true,
  }
);

merchandiseOrderSchema.index({ event: 1, participant: 1 });
merchandiseOrderSchema.index({ paymentStatus: 1 });

const MerchandiseOrder = mongoose.model('MerchandiseOrder', merchandiseOrderSchema);

module.exports = MerchandiseOrder;
