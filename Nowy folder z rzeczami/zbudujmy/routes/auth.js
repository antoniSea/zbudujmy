const express = require('express');
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const router = express.Router();

// Middleware do weryfikacji JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token dostępu wymagany' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Nieprawidłowy token' });
    }
    req.user = user;
    next();
  });
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email i hasło są wymagane' 
      });
    }

    const employee = await Employee.findOne({ email, isActive: true });
    
    if (!employee) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nieprawidłowe dane logowania' 
      });
    }

    const isValidPassword = await employee.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nieprawidłowe dane logowania' 
      });
    }

    const token = jwt.sign(
      { 
        id: employee._id, 
        email: employee.email, 
        role: employee.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Logowanie pomyślne',
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    });

  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd serwera podczas logowania' 
    });
  }
});

// Sprawdzenie tokenu
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Użytkownik nie znaleziony' 
      });
    }

    res.json({
      success: true,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    });

  } catch (error) {
    console.error('Błąd weryfikacji:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd serwera podczas weryfikacji' 
    });
  }
});

// Middleware do eksportu
router.authenticateToken = authenticateToken;

module.exports = router;
