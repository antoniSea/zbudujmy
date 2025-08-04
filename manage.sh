#!/bin/bash

# Skrypt zarządzania aplikacją Ofertownik Soft Synergy
# Uruchom jako: chmod +x manage.sh && ./manage.sh

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

# Menu główne
show_menu() {
    echo ""
    echo "=========================================="
    echo "  ZARZĄDZANIE OFERTOWNIK SOFT SYNERGY"
    echo "=========================================="
    echo ""
    echo "1. Sprawdź status usług"
    echo "2. Uruchom ponownie serwer"
    echo "3. Sprawdź logi serwera"
    echo "4. Utwórz użytkownika administratora"
    echo "5. Zbuduj ponownie aplikację klienta"
    echo "6. Sprawdź zużycie zasobów"
    echo "7. Zatrzymaj wszystkie usługi"
    echo "8. Uruchom wszystkie usługi"
    echo "9. Sprawdź połączenie z bazą danych"
    echo "10. Wyświetl konfigurację środowiska"
    echo "0. Wyjście"
    echo ""
    echo -n "Wybierz opcję: "
}

# Sprawdź status usług
check_services_status() {
    echo ""
    echo "=== STATUS USŁUG ==="
    
    # Sprawdź połączenie z zewnętrzną bazą MongoDB
    if [ -f .env ]; then
        MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
        if [ -n "$MONGODB_URI" ]; then
            node -e "
            const mongoose = require('mongoose');
            require('dotenv').config();
            
            mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 3000
            })
            .then(() => {
                console.log('✓ Zewnętrzna baza MongoDB: dostępna');
                process.exit(0);
            })
            .catch(() => {
                console.log('✗ Zewnętrzna baza MongoDB: niedostępna');
                process.exit(1);
            });
            " 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Zewnętrzna baza MongoDB: dostępna${NC}"
            else
                echo -e "${RED}✗ Zewnętrzna baza MongoDB: niedostępna${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ MONGODB_URI nie ustawiony${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Plik .env nie istnieje${NC}"
    fi
    
    # PM2
    if pm2 list | grep -q "ofertownik-server"; then
        echo -e "${GREEN}✓ Serwer: uruchomiony przez PM2${NC}"
        pm2 list
    else
        echo -e "${RED}✗ Serwer: nie uruchomiony${NC}"
    fi
    
    # nginx
    if command -v nginx &> /dev/null; then
        if sudo systemctl is-active --quiet nginx; then
            echo -e "${GREEN}✓ nginx: uruchomiony${NC}"
        else
            echo -e "${RED}✗ nginx: zatrzymany${NC}"
        fi
    fi
    
    echo ""
    echo "=== DOSTĘPNE ADRESY ==="
    echo "Frontend: http://ofertownik.soft-synergy.com"
echo "API: http://oferty.soft-synergy.com/api"
    echo ""
}

# Uruchom ponownie serwer
restart_server() {
    log_info "Uruchamiam ponownie serwer..."
    pm2 restart ofertownik-server
    log_success "Serwer uruchomiony ponownie"
}

# Sprawdź logi serwera
check_server_logs() {
    echo ""
    echo "=== LOGI SERWERA ==="
    echo "Ostatnie 50 linii logów:"
    echo ""
    pm2 logs ofertownik-server --lines 50
    echo ""
    echo "Aby zobaczyć więcej logów, uruchom: pm2 logs ofertownik-server"
}

# Utwórz użytkownika administratora
create_admin() {
    log_info "Tworzę użytkownika administratora..."
    pm2 exec ofertownik-server node server/scripts/create-admin.js
}

# Zbuduj ponownie aplikację klienta
rebuild_client() {
    log_info "Buduję ponownie aplikację klienta..."
    cd client
    npm run build
    cd ..
    
    if command -v nginx &> /dev/null; then
        log_info "Kopiuję zbudowaną aplikację do nginx..."
        sudo cp -r client/build /var/www/ofertownik/client/
        sudo chown -R www-data:www-data /var/www/ofertownik
        sudo systemctl reload nginx
    fi
    
    log_success "Aplikacja klienta zbudowana ponownie"
}

# Sprawdź zużycie zasobów
check_resources() {
    echo ""
    echo "=== ZUŻYCIE ZASOBÓW ==="
    echo ""
    echo "Procesy PM2:"
    pm2 monit --no-daemon &
    sleep 5
    pkill -f "pm2 monit"
    
    echo ""
    echo "Zużycie pamięci:"
    free -h
    
    echo ""
    echo "Zużycie dysku:"
    df -h
    
    echo ""
    echo "Procesy Node.js:"
    ps aux | grep node | grep -v grep
}

# Zatrzymaj wszystkie usługi
stop_all_services() {
    log_info "Zatrzymuję wszystkie usługi..."
    pm2 stop all
    if command -v nginx &> /dev/null; then
        sudo systemctl stop nginx
    fi
    log_success "Wszystkie usługi zatrzymane"
}

# Uruchom wszystkie usługi
start_all_services() {
    log_info "Uruchamiam wszystkie usługi..."
    pm2 start ecosystem.config.js --env production
    if command -v nginx &> /dev/null; then
        sudo systemctl start nginx
    fi
    log_success "Wszystkie usługi uruchomione"
}

# Sprawdź połączenie z bazą danych
check_database() {
    log_info "Sprawdzam połączenie z zewnętrzną bazą danych..."
    
    # Sprawdź czy plik .env istnieje
    if [ ! -f .env ]; then
        log_error "Plik .env nie istnieje"
        return 1
    fi
    
    # Sprawdź czy MONGODB_URI jest ustawiony
    MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI nie jest ustawiony w pliku .env"
        log_info "Dodaj MONGODB_URI do pliku .env"
        return 1
    fi
    
    log_info "Sprawdzam połączenie z: $MONGODB_URI"
    
    # Sprawdź połączenie przez Node.js
    node -e "
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    })
    .then(() => {
        console.log('✅ Połączenie z zewnętrzną bazą danych udane');
        process.exit(0);
    })
    .catch((err) => {
        console.log('❌ Błąd połączenia z bazą danych:', err.message);
        console.log('');
        console.log('Sprawdź:');
        console.log('1. Czy MONGODB_URI jest poprawny');
        console.log('2. Czy serwer MongoDB jest dostępny');
        console.log('3. Czy firewall nie blokuje połączenia');
        process.exit(1);
    });
    "
}

# Wyświetl konfigurację środowiska
show_environment() {
    echo ""
    echo "=== KONFIGURACJA ŚRODOWISKA ==="
    echo ""
    
    if [ -f .env ]; then
        echo "Plik .env istnieje"
        echo "NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
        echo "PORT: $(grep PORT .env | cut -d'=' -f2)"
        echo "MONGODB_URI: $(grep MONGODB_URI .env | cut -d'=' -f2)"
    else
        echo "Plik .env nie istnieje"
    fi
    
    echo ""
    echo "Zmienne środowiskowe PM2:"
    pm2 env ofertownik-server
}

# Główna pętla
main() {
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                check_services_status
                ;;
            2)
                restart_server
                ;;
            3)
                check_server_logs
                ;;
            4)
                create_admin
                ;;
            5)
                rebuild_client
                ;;
            6)
                check_resources
                ;;
            7)
                stop_all_services
                ;;
            8)
                start_all_services
                ;;
            9)
                check_database
                ;;
            10)
                show_environment
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