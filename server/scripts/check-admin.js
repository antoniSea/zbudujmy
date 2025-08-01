const mongoose = require('mongoose');
require('dotenv').config();

// Import modelu User
const User = require('../models/User');

async function checkAdminUser() {
  try {
    // Połączenie z bazą danych
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Połączono z bazą danych MongoDB');

    // Sprawdź czy admin istnieje
    const admin = await User.findOne({ email: 'admin@softsynergy.pl' });
    
    if (admin) {
      console.log('✅ Admin istnieje w bazie:');
      console.log('📧 Email:', admin.email);
      console.log('👤 Imię:', admin.firstName);
      console.log('👤 Nazwisko:', admin.lastName);
      console.log('🔑 Rola:', admin.role);
      console.log('✅ Aktywny:', admin.isActive);
      console.log('📅 Utworzony:', admin.createdAt);
    } else {
      console.log('❌ Admin NIE istnieje w bazie!');
    }

    // Sprawdź wszystkich użytkowników
    const allUsers = await User.find({});
    console.log('\n📊 Wszyscy użytkownicy w bazie:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.isActive ? 'Aktywny' : 'Nieaktywny'}`);
    });

  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania użytkowników:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych');
    process.exit(0);
  }
}

// Uruchom skrypt
checkAdminUser(); 