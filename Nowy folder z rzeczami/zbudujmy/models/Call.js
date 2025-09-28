const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // w sekundach
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'no_answer', 'not_interested', 'meeting_scheduled'],
    default: 'in_progress'
  },
  recordingUrl: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  meetingDetails: {
    scheduledDate: Date,
    location: String,
    notes: String
  },
  callQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: null
  }
}, {
  timestamps: true
});

// Metoda do zakończenia rozmowy
callSchema.methods.endCall = function(status, notes, meetingDetails) {
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  this.status = status;
  this.notes = notes || '';
  
  if (meetingDetails) {
    this.meetingDetails = meetingDetails;
  }
  
  return this.save();
};

// Index dla efektywnego wyszukiwania
callSchema.index({ lead: 1, employee: 1 });
callSchema.index({ startTime: -1 });

module.exports = mongoose.model('Call', callSchema);
