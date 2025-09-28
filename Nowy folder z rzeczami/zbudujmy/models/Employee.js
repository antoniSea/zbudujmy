const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  stats: {
    totalCalls: {
      type: Number,
      default: 0
    },
    successfulCalls: {
      type: Number,
      default: 0
    },
    meetingsScheduled: {
      type: Number,
      default: 0
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash hasła przed zapisem
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Metoda do porównywania haseł
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Metoda do aktualizacji statystyk
employeeSchema.methods.updateStats = function(callResult) {
  this.stats.totalCalls += 1;
  this.lastActivity = new Date();
  
  if (callResult === 'meeting_scheduled') {
    this.stats.meetingsScheduled += 1;
    this.stats.successfulCalls += 1;
  } else if (callResult === 'call_recorded') {
    this.stats.successfulCalls += 1;
  }
  
  return this.save();
};

module.exports = mongoose.model('Employee', employeeSchema);
