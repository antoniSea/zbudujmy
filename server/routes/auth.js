const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane logowania',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Konto jest nieaktywne' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Zalogowano pomyślnie',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas logowania' });
  }
});

// Register (tylko dla adminów)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('role').isIn(['admin', 'manager', 'employee'])
], auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane rejestracji',
        errors: errors.array() 
      });
    }

    // Sprawdź czy użytkownik ma uprawnienia admina
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Brak uprawnień do rejestracji użytkowników' });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Sprawdź czy email już istnieje
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Użytkownik z tym emailem już istnieje' });
    }

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role
    });

    await user.save();

    res.status(201).json({
      message: 'Użytkownik został utworzony pomyślnie',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas rejestracji' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        role: req.user.role,
        avatar: req.user.avatar,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Wylogowano pomyślnie' });
});

module.exports = router; 