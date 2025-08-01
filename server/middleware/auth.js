const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Brak tokenu autoryzacji' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Użytkownik nie istnieje lub jest nieaktywny' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Nieprawidłowy token autoryzacji' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Brak autoryzacji' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Brak uprawnień do wykonania tej operacji' });
    }

    next();
  };
};

module.exports = { auth, requireRole }; 