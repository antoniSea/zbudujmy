const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const portfolioRoutes = require('./routes/portfolio');
const offerRoutes = require('./routes/offers');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:", "https://oferty.soft-synergy.com"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https:///ofertownik.soft-synergy.com', 'https://ofertownik.soft-synergy.com', 'https:///oferty.soft-synergy.com', 'https://oferty.soft-synergy.com'] 
    : ['https:///localhost:3000', 'https:///ofertownik.soft-synergy.com', 'https://ofertownik.soft-synergy.com', 'https:///oferty.soft-synergy.com', 'https://oferty.soft-synergy.com'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads/portfolio', express.static(path.join(__dirname, '../uploads/portfolio')));

// Generated offers with cache-busting
app.use('/generated-offers', (req, res, next) => {
  // Add cache-busting headers for offer files
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, express.static(path.join(__dirname, 'generated-offers')));

app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/offers', offerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple reminder scheduler for follow-ups (runs every 30 minutes)
const setupFollowUpReminderScheduler = () => {
  const nodemailer = require('nodemailer');
  const Project = require('./models/Project');

  // Configure transport from env or fallback to log-only
  const transportConfig = process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  } : null;

  const transporter = transportConfig ? nodemailer.createTransport(transportConfig) : null;

  const sendEmail = async (subject, html) => {
    const to = 'jakub.czajka@soft-synergy.com';
    if (!transporter) {
      console.log(`[Reminder] Would send email to ${to}: ${subject}`);
      return;
    }
    await transporter.sendMail({
      from: 'development@soft-synergy.com',
      to,
      subject,
      html
    });
  };

  const runCheck = async () => {
    try {
      const now = new Date();
      const projects = await Project.find({
        status: { $in: ['draft', 'active'] },
        $or: [
          { followUps: { $exists: false } },
          { $where: 'this.followUps.length < 3' }
        ],
        nextFollowUpDueAt: { $ne: null, $lte: now }
      }).limit(50);

      for (const p of projects) {
        const lastReminder = p.lastFollowUpReminderAt ? new Date(p.lastFollowUpReminderAt) : null;
        // Avoid spamming: remind once per day at most
        if (lastReminder && (now.getTime() - lastReminder.getTime()) < (24 * 60 * 60 * 1000)) continue;

        const numSent = Array.isArray(p.followUps) ? p.followUps.length : 0;
        const subject = `Przypomnienie o dymaniu kolegi w dupe Follow-up #${numSent + 1} dla oferty: ${p.name}`;
        const html = `
          <p>Należy wysłać follow-up #${numSent + 1} dla oferty:</p>
          <ul>
            <li>Projekt: <strong>${p.name}</strong></li>
            <li>Klient: ${p.clientName}</li>
            <li>Termin: ${p.nextFollowUpDueAt ? new Date(p.nextFollowUpDueAt).toLocaleString('pl-PL') : '-'}</li>
          </ul>
          <p><a href="https:///ofertownik.soft-synergy.com/projects/${p._id}">Przejdź do projektu</a></p>
        `;
        try {
          await sendEmail(subject, html);
          p.lastFollowUpReminderAt = now;
          await p.save();
        } catch (e) {
          console.error('Reminder email error:', e);
        }
      }
    } catch (e) {
      console.error('Follow-up reminder check failed:', e);
    }
  };

  // initial delay then interval
  setTimeout(runCheck, 10 * 1000);
  setInterval(runCheck, 30 * 60 * 1000);
};

// Test uploads directory
app.get('/api/test-uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, '../uploads');
  const portfolioPath = path.join(uploadsPath, 'portfolio');
  
  res.json({
    uploadsPath,
    uploadsExists: fs.existsSync(uploadsPath),
    portfolioExists: fs.existsSync(portfolioPath),
    uploadsFiles: fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath) : [],
    portfolioFiles: fs.existsSync(portfolioPath) ? fs.readdirSync(portfolioPath) : []
  });
});

// URL rewriting for offers - make them look professional
app.get('/oferta-finalna/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    
    // Find project by name (case insensitive)
    const Project = require('./models/Project');
    const project = await Project.findOne({
      name: { $regex: new RegExp(projectName.replace(/-/g, ' '), 'i') }
    });
    
    if (!project || !project.generatedOfferUrl) {
      return res.status(404).json({ message: 'Oferta nie została znaleziona' });
    }
    
    // Extract the HTML file path from generatedOfferUrl
    const htmlFileName = project.generatedOfferUrl.split('/').pop();
    const htmlPath = path.join(__dirname, 'generated-offers', htmlFileName);
    
    // Check if HTML file exists
    const fs = require('fs');
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).json({ message: 'Plik oferty nie został znaleziony' });
    }
    
    // Read and serve the HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    // Add cache-busting headers to prevent caching of old offers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(htmlContent);
    
  } catch (error) {
    console.error('Offer redirect error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas ładowania oferty' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Wystąpił błąd serwera',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint nie został znaleziony' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Połączono z bazą danych MongoDB');
  app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
    console.log(`📱 Frontend: https:///ofertownik.soft-synergy.com`);
    console.log(`🔧 API: https:///oferty.soft-synergy.com/api`);
  });
  // Start reminder scheduler after server is up
  try {
    setupFollowUpReminderScheduler();
    console.log('⏰ Harmonogram przypomnień follow-up uruchomiony');
  } catch (e) {
    console.error('Nie udało się uruchomić harmonogramu follow-up:', e);
  }
})
.catch((err) => {
  console.error('❌ Błąd połączenia z bazą danych:', err);
  process.exit(1);
}); 