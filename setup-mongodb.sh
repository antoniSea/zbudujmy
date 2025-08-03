#!/bin/bash

# Skrypt konfiguracji zewnętrznej bazy MongoDB
# Uruchom jako: chmod +x setup-mongodb.sh && ./setup-mongodb.sh

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Menu konfiguracji MongoDB
show_mongodb_menu() {
    echo ""
    echo "=========================================="
    echo "  KONFIGURACJA ZEWNĘTRZNEJ BAZY MONGODB"
    echo "=========================================="
    echo ""
    echo "1. MongoDB Atlas (Cloud)"
    echo "2. Zewnętrzny serwer MongoDB"
    echo "3. Lokalna baza MongoDB"
    echo "4. Sprawdź połączenie"
    echo "5. Testuj połączenie"
    echo "0. Wyjście"
    echo ""
    echo -n "Wybierz opcję: "
}

# Konfiguracja MongoDB Atlas
setup_mongodb_atlas() {
    echo ""
    echo "=== KONFIGURACJA MONGODB ATLAS ==="
    echo ""
    
    echo -n "Podaj connection string z MongoDB Atlas: "
    read -r atlas_uri
    
    if [ -n "$atlas_uri" ]; then
        # Sprawdź czy plik .env istnieje
        if [ ! -f .env ]; then
            cp env.example .env
        fi
        
        # Zaktualizuj MONGODB_URI
        sed -i "s|MONGODB_URI=.*|MONGODB_URI=$atlas_uri|" .env
        
        log_success "MONGODB_URI został zaktualizowany"
        log_info "Sprawdzam połączenie..."
        
        # Test połączenia
        test_mongodb_connection
    else
        log_error "Connection string nie może być pusty"
    fi
}

# Konfiguracja zewnętrznego serwera MongoDB
setup_external_mongodb() {
    echo ""
    echo "=== KONFIGURACJA ZEWNĘTRZNEGO SERWERA MONGODB ==="
    echo ""
    
    echo -n "Podaj adres serwera MongoDB (np. your-server.com): "
    read -r server_host
    
    echo -n "Podaj port (domyślnie 27017): "
    read -r server_port
    server_port=${server_port:-27017}
    
    echo -n "Podaj nazwę bazy danych (domyślnie ofertownik): "
    read -r database_name
    database_name=${database_name:-ofertownik}
    
    echo -n "Podaj nazwę użytkownika (opcjonalnie): "
    read -r username
    
    if [ -n "$username" ]; then
        echo -n "Podaj hasło: "
        read -s password
        echo ""
        
        mongodb_uri="mongodb://$username:$password@$server_host:$server_port/$database_name"
    else
        mongodb_uri="mongodb://$server_host:$server_port/$database_name"
    fi
    
    # Sprawdź czy plik .env istnieje
    if [ ! -f .env ]; then
        cp env.example .env
    fi
    
    # Zaktualizuj MONGODB_URI
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=$mongodb_uri|" .env
    
    log_success "MONGODB_URI został zaktualizowany"
    log_info "Sprawdzam połączenie..."
    
    # Test połączenia
    test_mongodb_connection
}

# Konfiguracja lokalnej bazy MongoDB
setup_local_mongodb() {
    echo ""
    echo "=== KONFIGURACJA LOKALNEJ BAZY MONGODB ==="
    echo ""
    
    echo -n "Podaj nazwę bazy danych (domyślnie ofertownik): "
    read -r database_name
    database_name=${database_name:-ofertownik}
    
    mongodb_uri="mongodb://localhost:27017/$database_name"
    
    # Sprawdź czy plik .env istnieje
    if [ ! -f .env ]; then
        cp env.example .env
    fi
    
    # Zaktualizuj MONGODB_URI
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=$mongodb_uri|" .env
    
    log_success "MONGODB_URI został zaktualizowany"
    log_info "Sprawdzam połączenie..."
    
    # Test połączenia
    test_mongodb_connection
}

# Sprawdź połączenie z MongoDB
check_mongodb_connection() {
    echo ""
    echo "=== SPRAWDZANIE POŁĄCZENIA Z MONGODB ==="
    echo ""
    
    if [ ! -f .env ]; then
        log_error "Plik .env nie istnieje"
        return 1
    fi
    
    MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI nie jest ustawiony w pliku .env"
        return 1
    fi
    
    log_info "Aktualny MONGODB_URI: $MONGODB_URI"
    
    # Sprawdź połączenie przez Node.js
    node -e "
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    console.log('Sprawdzam połączenie z MongoDB...');
    
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    })
    .then(() => {
        console.log('✅ Połączenie z MongoDB udane!');
        console.log('📊 Baza danych: ' + mongoose.connection.db.databaseName);
        console.log('🔗 Host: ' + mongoose.connection.host);
        console.log('🚪 Port: ' + mongoose.connection.port);
        process.exit(0);
    })
    .catch((err) => {
        console.log('❌ Błąd połączenia z MongoDB:');
        console.log('   ' + err.message);
        process.exit(1);
    });
    "
}

# Test połączenia z MongoDB
test_mongodb_connection() {
    echo ""
    echo "=== TEST POŁĄCZENIA Z MONGODB ==="
    echo ""
    
    if [ ! -f .env ]; then
        log_error "Plik .env nie istnieje"
        return 1
    fi
    
    MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI nie jest ustawiony w pliku .env"
        return 1
    fi
    
    log_info "Testuję połączenie z: $MONGODB_URI"
    
    # Test połączenia przez Node.js
    node -e "
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    console.log('🔄 Testuję połączenie z MongoDB...');
    
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    })
    .then(async () => {
        console.log('✅ Połączenie udane!');
        
        // Test zapisu i odczytu
        const testCollection = mongoose.connection.db.collection('test_connection');
        
        try {
            // Test zapisu
            await testCollection.insertOne({ 
                test: true, 
                timestamp: new Date(),
                message: 'Test połączenia z Ofertownik'
            });
            console.log('✅ Test zapisu udany');
            
            // Test odczytu
            const result = await testCollection.findOne({ test: true });
            if (result) {
                console.log('✅ Test odczytu udany');
            }
            
            // Usuń testowy dokument
            await testCollection.deleteOne({ test: true });
            console.log('✅ Test usuwania udany');
            
            console.log('🎉 Wszystkie testy przeszły pomyślnie!');
            console.log('📊 Baza danych jest gotowa do użycia.');
            
        } catch (error) {
            console.log('⚠️  Ostrzeżenie: ' + error.message);
        }
        
        process.exit(0);
    })
    .catch((err) => {
        console.log('❌ Błąd połączenia z MongoDB:');
        console.log('   ' + err.message);
        console.log('');
        console.log('🔧 Możliwe rozwiązania:');
        console.log('   1. Sprawdź czy serwer MongoDB jest uruchomiony');
        console.log('   2. Sprawdź czy adres i port są poprawne');
        console.log('   3. Sprawdź czy użytkownik i hasło są poprawne');
        console.log('   4. Sprawdź czy firewall nie blokuje połączenia');
        process.exit(1);
    });
    "
}

# Główna pętla
main() {
    while true; do
        show_mongodb_menu
        read -r choice
        
        case $choice in
            1)
                setup_mongodb_atlas
                ;;
            2)
                setup_external_mongodb
                ;;
            3)
                setup_local_mongodb
                ;;
            4)
                check_mongodb_connection
                ;;
            5)
                test_mongodb_connection
                ;;
            0)
                echo "Do widzenia!"
                exit 0
                ;;
            *)
                echo "Nieprawidłowa opcja. Spróbuj ponownie."
                ;;
        esac
        
        echo ""
        echo "Naciśnij Enter, aby kontynuować..."
        read -r
    done
}

# Uruchom główną funkcję
main "$@" 