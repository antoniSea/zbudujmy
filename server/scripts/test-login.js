const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import modelu User
const User = require('../models/User');

async function testLogin() {
  try {
    // Połączenie z bazą danych
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Połączono z bazą danych MongoDB');

    // Znajdź admina
    const admin = await User.findOne({ email: 'admin@softsynergy.pl' });
    
    if (!admin) {
      console.log('❌ Admin nie istnieje!');
      return;
    }

    console.log('✅ Znaleziono admina:', admin.email);
    
    // Test hasła
    const testPassword = 'admin123';
    const isPasswordValid = await admin.comparePassword(testPassword);
    
    console.log('🔑 Test hasła "admin123":', isPasswordValid ? '✅ POPRAWNE' : '❌ BŁĘDNE');
    
    if (!isPasswordValid) {
      console.log('🔄 Próbuję zresetować hasło...');
      
      // Reset hasła
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      admin.password = hashedPassword;
      await admin.save();
      
      console.log('✅ Hasło zostało zresetowane!');
      
      // Test ponownie
      const isPasswordValidAfterReset = await admin.comparePassword(testPassword);
      console.log('🔑 Test hasła po resecie:', isPasswordValidAfterReset ? '✅ POPRAWNE' : '❌ BŁĘDNE');
    }

  } catch (error) {
    console.error('❌ Błąd podczas testowania logowania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom skrypt
testLogin(); 