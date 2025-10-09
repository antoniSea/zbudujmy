const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const LeadDistributionService = require('../services/LeadDistributionService');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Konfiguracja multer dla upload plików
const upload = multer({ 
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Tylko pliki CSV są dozwolone'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware do sprawdzania uprawnień admina
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Wymagane uprawnienia administratora' 
    });
  }
  next();
};

// Pobierz wszystkich pracowników
router.get('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select('-password')
      .populate('currentLead', 'name phone email status');

    res.json({
      success: true,
      employees: employees.map(emp => ({
        id: emp._id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isAvailable: emp.isAvailable,
        currentLead: emp.currentLead,
        stats: emp.stats,
        lastActivity: emp.lastActivity
      }))
    });

  } catch (error) {
    console.error('Błąd pobierania pracowników:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Dodaj nowego pracownika
router.post('/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Imię, email i hasło są wymagane' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hasło musi mieć co najmniej 6 znaków' 
      });
    }

    // Sprawdź czy email już istnieje
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pracownik z tym emailem już istnieje' 
      });
    }

    const employee = new Employee({
      name,
      email,
      password,
      role
    });

    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Pracownik został dodany',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    });

  } catch (error) {
    console.error('Błąd dodawania pracownika:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Dodaj nowego leada
router.post('/leads', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, email, notes = '' } = req.body;
    
    if (!name || !phone || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Imię, telefon i email są wymagane' 
      });
    }

    const lead = new Lead({
      name,
      phone,
      email,
      notes,
      createdBy: req.user.id
    });

    await lead.save();

    // Automatycznie dystrybuuj lead
    const distributionResult = await LeadDistributionService.distributeLeads();

    res.status(201).json({
      success: true,
      message: 'Lead został dodany',
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes,
        status: lead.status,
        assignedTo: lead.assignedTo
      },
      distributionResult
    });

  } catch (error) {
    console.error('Błąd dodawania leada:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz wszystkie leady
router.get('/leads', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

    res.json({
      success: true,
      leads: leads.map(lead => ({
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes,
        status: lead.status,
        retryCount: lead.retryCount,
        assignedTo: lead.assignedTo,
        createdBy: lead.createdBy,
        lastCallAttempt: lead.lastCallAttempt,
        nextCallTime: lead.nextCallTime,
        createdAt: lead.createdAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Błąd pobierania leadów:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz statystyki systemu
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await LeadDistributionService.getDistributionStats();
    
    // Dodatkowe statystyki
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const availableEmployees = await Employee.countDocuments({ 
      isActive: true, 
      isAvailable: true 
    });
    
    const totalLeads = await Lead.countDocuments();
    const newLeads = await Lead.countDocuments({ status: 'new' });
    const assignedLeads = await Lead.countDocuments({ status: 'assigned' });
    const completedLeads = await Lead.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      stats: {
        employees: {
          total: totalEmployees,
          available: availableEmployees,
          busy: totalEmployees - availableEmployees
        },
        leads: {
          total: totalLeads,
          new: newLeads,
          assigned: assignedLeads,
          completed: completedLeads,
          byStatus: stats.leadStats
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania statystyk:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Wymuś dystrybucję leadów
router.post('/distribute-leads', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const results = await LeadDistributionService.distributeLeads();
    
    res.json({
      success: true,
      message: 'Dystrybucja leadów zakończona',
      results
    });

  } catch (error) {
    console.error('Błąd dystrybucji leadów:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Usuń pracownika
router.delete('/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nie możesz usunąć samego siebie' 
      });
    }

    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pracownik nie znaleziony' 
      });
    }

    // Oznacz jako nieaktywnego zamiast usuwać
    employee.isActive = false;
    employee.isAvailable = false;
    await employee.save();

    res.json({
      success: true,
      message: 'Pracownik został dezaktywowany'
    });

  } catch (error) {
    console.error('Błąd usuwania pracownika:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Usuń leada
router.delete('/leads/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const lead = await Lead.findById(id);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead nie znaleziony' 
      });
    }

    await Lead.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Lead został usunięty'
    });

  } catch (error) {
    console.error('Błąd usuwania leada:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Import leadów z CSV
router.post('/import-leads', authenticateToken, requireAdmin, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brak pliku CSV' 
      });
    }

    // Funkcja do czyszczenia numeru telefonu
    function cleanPhoneNumber(phone) {
      if (!phone) return '';
      
      // Usuń wszystkie znaki oprócz cyfr i +
      let cleaned = phone.replace(/[^\d+]/g, '');
      
      // Jeśli zaczyna się od 48, zostaw jak jest
      if (cleaned.startsWith('48')) {
        return '+' + cleaned;
      }
      
      // Jeśli nie zaczyna się od +, dodaj +
      if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }
      
      return cleaned;
    }

    // Funkcja do generowania emaila z nazwy firmy
    function generateEmail(companyName) {
      if (!companyName) return 'brak@email.com';
      
      // Wyczyść nazwę firmy
      let email = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Usuń znaki specjalne
        .replace(/\s+/g, '') // Usuń spacje
        .substring(0, 20); // Ogranicz długość
      
      // Dodaj losową liczbę aby był unikalny
      const randomNum = Math.floor(Math.random() * 1000);
      return `${email}${randomNum}@example.com`;
    }

    // Funkcja do parsowania linii CSV
    function parseCSVLine(line) {
      const fields = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Dodaj ostatnie pole
      fields.push(currentField.trim());
      
      return fields;
    }

    // Znajdź lub stwórz admina
    let adminEmployee = await Employee.findOne({ role: 'admin' });
    
    if (!adminEmployee) {
      adminEmployee = new Employee({
        name: 'Admin System',
        email: 'admin@softsynergy.com',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      await adminEmployee.save();
    }

    // Przeczytaj plik CSV
    const csvPath = req.file.path;
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Znaleziono ${lines.length} linii w CSV`);

    // Parsuj i importuj leady
    const leadsToImport = [];
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = parseCSVLine(line);
        
        if (fields.length < 4) {
          console.log(`⚠️ Pominięto linię ${i + 1}: za mało pól`);
          errorCount++;
          continue;
        }

        const companyName = fields[0]?.replace(/"/g, '').trim();
        const city = fields[1]?.replace(/"/g, '').trim();
        const website = fields[2]?.replace(/"/g, '').trim();
        const phone = fields[3]?.replace(/"/g, '').trim();

        if (!companyName || !phone) {
          console.log(`⚠️ Pominięto linię ${i + 1}: brak nazwy firmy lub telefonu`);
          errorCount++;
          continue;
        }

        // Wyczyść numer telefonu
        const cleanPhone = cleanPhoneNumber(phone);
        if (!cleanPhone) {
          console.log(`⚠️ Pominięto linię ${i + 1}: nieprawidłowy numer telefonu`);
          errorCount++;
          continue;
        }

        // Wygeneruj email
        const email = generateEmail(companyName);

        // Stwórz notatki
        let notes = '';
        if (city) notes += `Miasto: ${city}`;
        if (website) notes += (notes ? ' | ' : '') + `Strona: ${website}`;

        // Sprawdź czy lead już istnieje
        const existingLead = await Lead.findOne({ 
          $or: [
            { phone: cleanPhone },
            { name: companyName }
          ]
        });

        if (existingLead) {
          console.log(`⚠️ Pominięto linię ${i + 1}: lead już istnieje`);
          skippedCount++;
          continue;
        }

        const lead = new Lead({
          name: companyName,
          phone: cleanPhone,
          email: email,
          notes: notes,
          status: 'new',
          createdBy: adminEmployee._id
        });

        leadsToImport.push(lead);
        importedCount++;

        // Loguj postęp co 50 leadów
        if (importedCount % 50 === 0) {
          console.log(`📈 Przetworzono ${importedCount} leadów...`);
        }

      } catch (error) {
        console.log(`❌ Błąd w linii ${i + 1}: ${error.message}`);
        errorCount++;
      }
    }

    // Bulk insert leadów
    if (leadsToImport.length > 0) {
      console.log(`💾 Importowanie ${leadsToImport.length} leadów do bazy...`);
      await Lead.insertMany(leadsToImport);
      console.log(`✅ Pomyślnie zaimportowano ${leadsToImport.length} leadów!`);
    }

    // Usuń tymczasowy plik
    fs.unlinkSync(csvPath);

    console.log('\n📊 PODSUMOWANIE:');
    console.log(`✅ Zaimportowano: ${importedCount} leadów`);
    console.log(`⚠️ Pominięto: ${skippedCount} leadów`);
    console.log(`❌ Błędy: ${errorCount} leadów`);
    console.log(`📋 Łącznie przetworzono: ${lines.length} linii`);

    res.json({
      success: true,
      message: 'Import zakończony pomyślnie',
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: lines.length
    });

  } catch (error) {
    console.error('❌ Błąd podczas importu:', error);
    
    // Usuń tymczasowy plik w przypadku błędu
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Błąd podczas importu: ' + error.message 
    });
  }
});

module.exports = router;
