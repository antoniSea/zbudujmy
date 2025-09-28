const mongoose = require('mongoose');
const Employee = require('../models/Employee');
require('dotenv').config();

async function createAdmin() {
    try {
        // Połącz z MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-call-manager', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Połączono z MongoDB');
        
        // Sprawdź czy już istnieje admin
        const existingAdmin = await Employee.findOne({ role: 'admin' });
        
        if (existingAdmin) {
            console.log('⚠️  Administrator już istnieje:', existingAdmin.email);
            console.log('   Możesz się zalogować używając tego konta.');
            process.exit(0);
        }
        
        // Utwórz nowego administratora
        const admin = new Employee({
            name: 'Administrator',
            email: 'admin@coldcall.com',
            password: 'admin123',
            role: 'admin'
        });
        
        await admin.save();
        
        console.log('🎉 Administrator został utworzony!');
        console.log('📧 Email: admin@coldcall.com');
        console.log('🔑 Hasło: admin123');
        console.log('');
        console.log('⚠️  WAŻNE: Zmień hasło po pierwszym logowaniu!');
        console.log('');
        console.log('🌐 Panel administracyjny: http://localhost:3001/admin');
        console.log('👥 Panel pracownika: http://localhost:3001/employee');
        
    } catch (error) {
        console.error('❌ Błąd tworzenia administratora:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Rozłączono z MongoDB');
    }
}

// Uruchom skrypt
createAdmin();
