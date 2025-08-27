const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientContact: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  mainBenefit: {
    type: String,
    required: true,
    trim: true
  },
  modules: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: 'blue'
    }
  }],
  timeline: {
    phase1: {
      name: { type: String, default: 'Faza I: Discovery' },
      duration: { type: String, default: 'Tydzień 1-2' }
    },
    phase2: {
      name: { type: String, default: 'Faza II: Design & Prototyp' },
      duration: { type: String, default: 'Tydzień 3-4' }
    },
    phase3: {
      name: { type: String, default: 'Faza III: Development' },
      duration: { type: String, default: 'Tydzień 5-12' }
    },
    phase4: {
      name: { type: String, default: 'Faza IV: Testy i Wdrożenie' },
      duration: { type: String, default: 'Tydzień 13-14' }
    }
  },
  pricing: {
    phase1: { type: Number, default: 8000 },
    phase2: { type: Number, default: 0 },
    phase3: { type: Number, default: 56000 },
    phase4: { type: Number, default: 8000 },
    total: { type: Number, required: true }
  },
  projectManager: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      default: 'Senior Project Manager'
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    avatar: {
      type: String,
      default: null
    },
    description: {
      type: String,
      default: 'Z ponad 8-letnim doświadczeniem w prowadzeniu złożonych projektów IT, wierzę w transparentną komunikację i partnerskie relacje. Moim zadaniem jest nie tylko nadzór nad harmonogramem, ale przede wszystkim zapewnienie, że finalny produkt w 100% odpowiada Państwa wizji i celom biznesowym. Będę Państwa głównym punktem kontaktowym na każdym etapie współpracy.'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'accepted', 'completed', 'cancelled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  offerNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  generatedOfferUrl: {
    type: String,
    default: null
  },
  notes: [{
    text: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Generate offer number before saving
projectSchema.pre('save', async function(next) {
  if (!this.offerNumber && this.status === 'active') {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Count projects for this month
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1)
      }
    });
    
    this.offerNumber = `SS/${year}/${month}/${String(count + 1).padStart(2, '0')}`;
  }
  next();
});

// Calculate total price
projectSchema.pre('save', function(next) {
  if (this.pricing) {
    this.pricing.total = this.pricing.phase1 + this.pricing.phase2 + this.pricing.phase3 + this.pricing.phase4;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema); 