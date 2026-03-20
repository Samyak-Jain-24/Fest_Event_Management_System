const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reactions.userType',
  },
  userType: {
    type: String,
    enum: ['Participant', 'Organizer'],
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  },
}, { _id: false });

const forumMessageSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'authorModel',
    },
    authorModel: {
      type: String,
      enum: ['Participant', 'Organizer'],
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForumMessage',
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isAnnouncement: {
      type: Boolean,
      default: false,
    },
    reactions: [reactionSchema],
    replyCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
forumMessageSchema.index({ event: 1, createdAt: -1 });
forumMessageSchema.index({ event: 1, parentMessage: 1 });
forumMessageSchema.index({ event: 1, isPinned: -1, createdAt: -1 });

const ForumMessage = mongoose.model('ForumMessage', forumMessageSchema);

module.exports = ForumMessage;
