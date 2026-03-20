const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  fieldType: {
    type: String,
    enum: ['text', 'email', 'number', 'textarea', 'dropdown', 'checkbox', 'file', 'radio'],
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  placeholder: String,
  required: {
    type: Boolean,
    default: false,
  },
  options: [String], // For dropdown, checkbox, radio
  validation: {
    min: Number,
    max: Number,
    pattern: String,
  },
});

const itemVariantSchema = new mongoose.Schema({
  size: String,
  color: String,
  variant: String,
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  purchaseLimit: {
    type: Number,
    default: 1,
  },
});

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    eventDescription: {
      type: String,
      required: [true, 'Event description is required'],
    },
    eventType: {
      type: String,
      enum: ['Normal', 'Merchandise'],
      required: true,
    },
    eligibility: {
      type: String,
      enum: ['IIIT Only', 'Non-IIIT Only', 'All'],
      default: 'All',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer',
      required: true,
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    eventStartDate: {
      type: Date,
      required: [true, 'Event start date is required'],
    },
    eventEndDate: {
      type: Date,
      required: [true, 'Event end date is required'],
    },
    registrationLimit: {
      type: Number,
      required: [true, 'Registration limit is required'],
    },
    registrationFee: {
      type: Number,
      default: 0,
    },
    eventTags: [String],
    
    // Normal Event specific fields
    customForm: [formFieldSchema],
    
    // Merchandise Event specific fields
    items: [itemVariantSchema],
    
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'],
      default: 'Draft',
    },
    
    registrationCount: {
      type: Number,
      default: 0,
    },
    
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for searching
eventSchema.index({ eventName: 'text', eventDescription: 'text', eventTags: 'text' });

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function () {
  const now = new Date();
  return (
    this.status === 'Published' &&
    now < this.registrationDeadline &&
    this.registrationCount < this.registrationLimit
  );
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
