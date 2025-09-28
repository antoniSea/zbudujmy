#!/bin/bash

echo "🚀 Uruchamianie Cold Call Manager..."

# Sprawdź czy Node.js jest zainstalowany
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nie jest zainstalowany. Zainstaluj Node.js z https://nodejs.org/"
    exit 1
fi

# Sprawdź czy npm jest zainstalowany
if ! command -v npm &> /dev/null; then
    echo "❌ npm nie jest zainstalowany. Zainstaluj npm z https://nodejs.org/"
    exit 1
fi

# Sprawdź czy MongoDB jest uruchomiony
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB nie jest uruchomiony. Uruchom MongoDB:"
    echo "   macOS: brew services start mongodb-community"
    echo "   Linux: sudo systemctl start mongod"
    echo "   Windows: net start MongoDB"
    echo ""
    echo "Czy chcesz kontynuować mimo to? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Sprawdź czy plik .env istnieje
if [ ! -f .env ]; then
    echo "📝 Tworzenie pliku .env..."
    cp env.example .env
    echo "✅ Plik .env utworzony. Edytuj go jeśli potrzebujesz zmienić konfigurację."
fi

# Instaluj zależności jeśli node_modules nie istnieje
if [ ! -d "node_modules" ]; then
    echo "📦 Instalowanie zależności..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Błąd instalacji zależności"
        exit 1
    fi
    echo "✅ Zależności zainstalowane"
fi

# Sprawdź czy administrator istnieje
echo "🔍 Sprawdzanie administratora..."
node -e "
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-call-manager');
        const admin = await Employee.findOne({ role: 'admin' });
        if (!admin) {
            console.log('👤 Tworzenie administratora...');
            const newAdmin = new Employee({
                name: 'Administrator',
                email: 'admin@coldcall.com',
                password: 'admin123',
                role: 'admin'
            });
            await newAdmin.save();
            console.log('✅ Administrator utworzony:');
            console.log('   📧 Email: admin@coldcall.com');
            console.log('   🔑 Hasło: admin123');
        } else {
            console.log('✅ Administrator już istnieje');
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Błąd:', error.message);
        process.exit(1);
    }
}
checkAdmin();
"

if [ $? -ne 0 ]; then
    echo "❌ Błąd sprawdzania administratora"
    exit 1
fi

# Uruchom aplikację
echo ""
echo "🌐 Uruchamianie aplikacji..."
echo "📱 Panel pracownika: http://localhost:3001/employee"
echo "👨‍💼 Panel admina: http://localhost:3001/admin"
echo ""
echo "Naciśnij Ctrl+C aby zatrzymać"
echo ""

# Uruchom w trybie deweloperskim jeśli NODE_ENV nie jest ustawiony na production
if [ "$NODE_ENV" != "production" ]; then
    npm run dev
else
    npm start
fi
