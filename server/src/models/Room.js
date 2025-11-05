const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['public', 'private', 'direct', 'default'],
    default: 'public'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Changed to false to allow null creator for default room
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  avatar: {
    type: String,
    default: null
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { 
  timestamps: true,
  _id: true // Allow custom _id
});

// Index for faster queries
roomSchema.index({ members: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ lastMessage: 1 });

module.exports = mongoose.model('Room', roomSchema);