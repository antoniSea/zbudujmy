const express = require('express');
const Employee = require('../models/Employee');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Pobierz profil pracownika
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pracownik nie znaleziony' 
      });
    }

    res.json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        isAvailable: employee.isAvailable,
        currentLead: employee.currentLead,
        stats: employee.stats,
        lastActivity: employee.lastActivity
      }
    });

  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Aktualizuj status dostępności
router.post('/toggle-availability', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pracownik nie znaleziony' 
      });
    }

    employee.isAvailable = !employee.isAvailable;
    employee.lastActivity = new Date();
    
    await employee.save();

    res.json({
      success: true,
      message: `Status zmieniony na: ${employee.isAvailable ? 'Dostępny' : 'Niedostępny'}`,
      isAvailable: employee.isAvailable
    });

  } catch (error) {
    console.error('Błąd aktualizacji statusu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz statystyki pracownika
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('stats name');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pracownik nie znaleziony' 
      });
    }

    res.json({
      success: true,
      stats: {
        name: employee.name,
        totalCalls: employee.stats.totalCalls,
        successfulCalls: employee.stats.successfulCalls,
        meetingsScheduled: employee.stats.meetingsScheduled,
        successRate: employee.stats.totalCalls > 0 
          ? Math.round((employee.stats.successfulCalls / employee.stats.totalCalls) * 100) 
          : 0
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

// Aktualizuj hasło
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Obecne i nowe hasło są wymagane' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nowe hasło musi mieć co najmniej 6 znaków' 
      });
    }

    const employee = await Employee.findById(req.user.id);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pracownik nie znaleziony' 
      });
    }

    const isValidPassword = await employee.comparePassword(currentPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nieprawidłowe obecne hasło' 
      });
    }

    employee.password = newPassword;
    await employee.save();

    res.json({
      success: true,
      message: 'Hasło zostało zmienione'
    });

  } catch (error) {
    console.error('Błąd zmiany hasła:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
