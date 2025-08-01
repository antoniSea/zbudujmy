const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Portfolio = require('../models/Portfolio');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/portfolio/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tylko pliki obrazów są dozwolone!'));
    }
  }
});

// Get all portfolio items
router.get('/', async (req, res) => {
  try {
    const { category, active } = req.query;
    
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const portfolio = await Portfolio.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ order: 1, createdAt: -1 });

    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania portfolio' });
  }
});

// Get single portfolio item
router.get('/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Element portfolio nie został znaleziony' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio item error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania elementu portfolio' });
  }
});

// Create new portfolio item
router.post('/', [
  auth,
  requireRole(['admin', 'manager']),
  upload.single('image'),
  body('title').trim().isLength({ min: 3 }),
  body('description').trim().isLength({ min: 10 }),
  body('category').isIn(['web', 'mobile', 'desktop', 'api', 'other']),
  body('technologies').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane portfolio',
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Obraz jest wymagany' });
    }

    const portfolioData = {
      ...req.body,
      image: `/uploads/portfolio/${req.file.filename}`,
      createdBy: req.user._id
    };

    const portfolio = new Portfolio(portfolioData);
    await portfolio.save();

    const populatedPortfolio = await Portfolio.findById(portfolio._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      message: 'Element portfolio został utworzony pomyślnie',
      portfolio: populatedPortfolio
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas tworzenia elementu portfolio' });
  }
});

// Update portfolio item
router.put('/:id', [
  auth,
  requireRole(['admin', 'manager']),
  upload.single('image'),
  body('title').trim().isLength({ min: 3 }),
  body('description').trim().isLength({ min: 10 }),
  body('category').isIn(['web', 'mobile', 'desktop', 'api', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane portfolio',
        errors: errors.array() 
      });
    }

    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Element portfolio nie został znaleziony' });
    }

    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.image = `/uploads/portfolio/${req.file.filename}`;
    }

    Object.assign(portfolio, updateData);
    await portfolio.save();

    const updatedPortfolio = await Portfolio.findById(portfolio._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Element portfolio został zaktualizowany pomyślnie',
      portfolio: updatedPortfolio
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas aktualizacji elementu portfolio' });
  }
});

// Delete portfolio item
router.delete('/:id', [
  auth,
  requireRole(['admin', 'manager'])
], async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Element portfolio nie został znaleziony' });
    }

    await Portfolio.findByIdAndDelete(req.params.id);

    res.json({ message: 'Element portfolio został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas usuwania elementu portfolio' });
  }
});

// Update portfolio order
router.put('/:id/order', [
  auth,
  requireRole(['admin', 'manager']),
  body('order').isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowa kolejność',
        errors: errors.array() 
      });
    }

    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Element portfolio nie został znaleziony' });
    }

    portfolio.order = req.body.order;
    await portfolio.save();

    res.json({
      message: 'Kolejność została zaktualizowana pomyślnie',
      portfolio
    });
  } catch (error) {
    console.error('Update portfolio order error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas aktualizacji kolejności' });
  }
});

// Toggle portfolio item active status
router.patch('/:id/toggle', [
  auth,
  requireRole(['admin', 'manager'])
], async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Element portfolio nie został znaleziony' });
    }

    portfolio.isActive = !portfolio.isActive;
    await portfolio.save();

    res.json({
      message: `Element portfolio został ${portfolio.isActive ? 'aktywowany' : 'dezaktywowany'} pomyślnie`,
      portfolio
    });
  } catch (error) {
    console.error('Toggle portfolio error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas zmiany statusu elementu portfolio' });
  }
});

module.exports = router; 