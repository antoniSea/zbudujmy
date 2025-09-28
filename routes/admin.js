const express = require('express');
const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const LeadDistributionService = require('../services/LeadDistributionService');
const { authenticateToken } = require('./auth');
const router = express.Router();

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

module.exports = router;
