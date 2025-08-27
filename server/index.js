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
      imgSrc: ["'self'", "data:", "https:", "https:///oferty.soft-synergy.com", "https://oferty.soft-synergy.com"],
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/generated-offers', express.static(path.join(__dirname, 'generated-offers')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/offers', offerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
})
.catch((err) => {
  console.error('❌ Błąd połączenia z bazą danych:', err);
  process.exit(1);
}); 