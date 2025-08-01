const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import modelu User
const User = require('../models/User');

async function debugPassword() {
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
    console.log('🔑 Hasło w bazie (pierwsze 20 znaków):', admin.password.substring(0, 20) + '...');
    
    // Test bezpośrednio z bcrypt
    const testPassword = 'admin123';
    const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
    
    console.log('🔑 Test hasła "admin123" z bcrypt:', isPasswordValid ? '✅ POPRAWNE' : '❌ BŁĘDNE');
    
    // Test z metodą comparePassword
    const isPasswordValidMethod = await admin.comparePassword(testPassword);
    console.log('🔑 Test hasła "admin123" z metodą:', isPasswordValidMethod ? '✅ POPRAWNE' : '❌ BŁĘDNE');
    
    if (!isPasswordValid) {
      console.log('🔄 Tworzę nowe hasło...');
      
      // Utwórz nowe hasło bez pre-save hook
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Zaktualizuj bezpośrednio w bazie
      await User.updateOne(
        { email: 'admin@softsynergy.pl' },
        { password: hashedPassword }
      );
      
      console.log('✅ Hasło zostało zaktualizowane!');
      
      // Pobierz zaktualizowanego admina
      const updatedAdmin = await User.findOne({ email: 'admin@softsynergy.pl' });
      const isPasswordValidAfterUpdate = await bcrypt.compare(testPassword, updatedAdmin.password);
      console.log('🔑 Test hasła po aktualizacji:', isPasswordValidAfterUpdate ? '✅ POPRAWNE' : '❌ BŁĘDNE');
    }

  } catch (error) {
    console.error('❌ Błąd podczas debugowania hasła:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom skrypt
debugPassword(); 