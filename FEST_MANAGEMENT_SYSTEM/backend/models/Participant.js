const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const participantSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
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
    participantType: {
      type: String,
      enum: ['IIIT', 'Non-IIIT'],
      required: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
    },
    college: {
      type: String,
      required: function () {
        return this.participantType === 'Non-IIIT';
      },
    },
    organizationName: {
      type: String,
      required: function () {
        return this.participantType === 'IIIT';
      },
    },
    areasOfInterest: [
      {
        type: String,
      },
    ],
    followedClubs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organizer',
      },
    ],
    role: {
      type: String,
      default: 'participant',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
participantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
participantSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
