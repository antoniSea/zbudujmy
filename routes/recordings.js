const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Konfiguracja multer do przechowywania plików
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/recordings';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generuj unikalną nazwę pliku
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Akceptuj tylko pliki audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Tylko pliki audio są dozwolone'), false);
    }
  }
});

// Upload nagrania
router.post('/upload-recording', authenticateToken, upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brak pliku nagrania' 
      });
    }

    const { duration } = req.body;
    const recordingUrl = `/uploads/recordings/${req.file.filename}`;
    
    // Zapisz informacje o nagraniu w bazie danych
    const Call = require('../models/Call');
    const activeCall = await Call.findOne({
      employee: req.user.id,
      status: 'in_progress'
    });

    if (activeCall) {
      activeCall.recordingUrl = recordingUrl;
      activeCall.duration = parseInt(duration) || 0;
      await activeCall.save();
    }

    res.json({
      success: true,
      message: 'Nagranie zostało zapisane',
      recordingUrl: recordingUrl,
      filename: req.file.filename,
      size: req.file.size,
      duration: duration
    });

  } catch (error) {
    console.error('Błąd uploadu nagrania:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd zapisywania nagrania' 
    });
  }
});

// Pobierz nagranie
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/recordings', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nagranie nie znalezione' 
      });
    }

    // Ustaw odpowiednie nagłówki dla pliku audio
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Wyślij plik
    res.sendFile(filePath);

  } catch (error) {
    console.error('Błąd pobierania nagrania:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd pobierania nagrania' 
    });
  }
});

// Pobierz listę nagrań dla pracownika
router.get('/employee/recordings', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const Call = require('../models/Call');
    const calls = await Call.find({ 
      employee: req.user.id,
      recordingUrl: { $exists: true, $ne: null }
    })
    .populate('lead', 'name phone email')
    .sort({ startTime: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Call.countDocuments({ 
      employee: req.user.id,
      recordingUrl: { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      recordings: calls.map(call => ({
        id: call._id,
        lead: call.lead || { name: 'Usunięty lead', phone: 'Brak numeru', email: 'Brak email' },
        startTime: call.startTime,
        duration: call.duration || 0,
        recordingUrl: call.recordingUrl,
        status: call.status
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Błąd pobierania nagrań:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Usuń nagranie
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/recordings', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Usuń referencję z bazy danych
    const Call = require('../models/Call');
    await Call.updateMany(
      { recordingUrl: `/uploads/recordings/${filename}` },
      { $unset: { recordingUrl: 1 } }
    );

    res.json({
      success: true,
      message: 'Nagranie zostało usunięte'
    });

  } catch (error) {
    console.error('Błąd usuwania nagrania:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd usuwania nagrania' 
    });
  }
});

// Pobierz wszystkie nagrania (dla admina)
router.get('/admin/recordings', authenticateToken, async (req, res) => {
  try {
    // Sprawdź czy użytkownik to admin
    const Employee = require('../models/Employee');
    const employee = await Employee.findById(req.user.id);
    
    if (!employee || employee.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień administratora'
      });
    }

    const { page = 1, limit = 20, employeeId, status, dateFrom, dateTo } = req.query;

    // Buduj filtr
    const filter = {
      recordingUrl: { $exists: true, $ne: null }
    };

    if (employeeId) {
      filter.employee = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.startTime = {};
      if (dateFrom) {
        filter.startTime.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.startTime.$lte = new Date(dateTo);
      }
    }

    const Call = require('../models/Call');
    const calls = await Call.find(filter)
      .populate('lead', 'name phone email')
      .populate('employee', 'name email')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Call.countDocuments(filter);

    res.json({
      success: true,
      recordings: calls.map(call => ({
        id: call._id,
        lead: call.lead || { name: 'Usunięty lead', phone: 'Brak numeru', email: 'Brak email' },
        employee: call.employee || { name: 'Nieznany pracownik', email: 'Brak email' },
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration || 0,
        recordingUrl: call.recordingUrl,
        status: call.status,
        notes: call.notes
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Błąd pobierania nagrań admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd pobierania nagrań',
      error: error.message 
    });
  }
});

module.exports = router;
