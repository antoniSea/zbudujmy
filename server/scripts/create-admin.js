const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import modelu User
const User = require('../models/User');

async function createAdminUser() {
  try {
    // Połączenie z bazą danych
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Połączono z bazą danych MongoDB');

    // Sprawdź czy admin już istnieje
    const existingAdmin = await User.findOne({ email: 'admin@softsynergy.pl' });
    if (existingAdmin) {
      console.log('❌ Użytkownik admin już istnieje');
      process.exit(0);
    }

    // Hash hasła
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Utwórz użytkownika admina
    const adminUser = new User({
      email: 'admin@softsynergy.pl',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Soft Synergy',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Użytkownik admin został utworzony pomyślnie!');
    console.log('📧 Email: admin@softsynergy.pl');
    console.log('🔑 Hasło: admin123');
    console.log('⚠️  Pamiętaj o zmianie hasła po pierwszym logowaniu!');

  } catch (error) {
    console.error('❌ Błąd podczas tworzenia użytkownika admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom skrypt
createAdminUser(); 