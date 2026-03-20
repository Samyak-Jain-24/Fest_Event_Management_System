const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const organizerSchema = new mongoose.Schema(
  {
    organizerName: {
      type: String,
      required: [true, 'Organizer name is required'],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Club', 'Council', 'Fest Team'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      validate: [validator.isEmail, 'Please provide a valid contact email'],
    },
    contactNumber: {
      type: String,
    },
    discordWebhook: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: 'organizer',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
organizerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
organizerSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Organizer = mongoose.model('Organizer', organizerSchema);

module.exports = Organizer;
