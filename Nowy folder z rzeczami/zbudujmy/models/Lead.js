const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'assigned', 'calling', 'no_answer', 'not_interested', 'meeting_scheduled', 'completed'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  lastCallAttempt: {
    type: Date,
    default: null
  },
  nextCallTime: {
    type: Date,
    default: null
  },
  callHistory: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    result: {
      type: String,
      enum: ['no_answer', 'not_interested', 'meeting_scheduled', 'call_recorded', 'completed']
    },
    notes: String,
    recordingUrl: String
  }],
  meetingDetails: {
    scheduledDate: Date,
    notes: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  }
}, {
  timestamps: true
});

// Index dla efektywnego wyszukiwania
leadSchema.index({ status: 1, assignedTo: 1 });
leadSchema.index({ nextCallTime: 1 });

module.exports = mongoose.model('Lead', leadSchema);
