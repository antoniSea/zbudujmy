#!/bin/bash

# Deployment Script for Ofertownik Soft Synergy
# Uruchom jako: chmod +x deploy.sh && ./deploy.sh

set -e  # Zatrzymaj skrypt przy błędzie

echo "🚀 Rozpoczynam deployment Ofertownik Soft Synergy..."

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

# Sprawdź czy jesteś root lub masz sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        log_warning "Uruchomiono bez uprawnień root. Niektóre operacje mogą wymagać sudo."
    fi
}

# Sprawdź system operacyjny
check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Wykryto system Linux"
    else
        log_error "Ten skrypt jest przeznaczony dla systemów Linux"
        exit 1
    fi
}

# Instalacja Node.js i npm
install_nodejs() {
    log_info "Sprawdzam czy Node.js jest zainstalowany..."
    
    if ! command -v node &> /dev/null; then
        log_info "Instaluję Node.js..."
        
        # Dodaj NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        
        # Instaluj Node.js
        sudo apt-get install -y nodejs
        
        log_success "Node.js zainstalowany"
    else
        log_success "Node.js już zainstalowany: $(node --version)"
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm nie jest zainstalowany"
        exit 1
    else
        log_success "npm zainstalowany: $(npm --version)"
    fi
}

# Sprawdź połączenie z zewnętrzną bazą MongoDB
check_mongodb_connection() {
    log_info "Sprawdzam połączenie z zewnętrzną bazą MongoDB..."
    
    # Sprawdź czy zmienna MONGODB_URI jest ustawiona
    if [ -f .env ]; then
        MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
        if [ -n "$MONGODB_URI" ]; then
            log_info "Znaleziono MONGODB_URI w pliku .env"
            
            # Sprawdź połączenie przez Node.js
            node -e "
            const mongoose = require('mongoose');
            require('dotenv').config();
            
            mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            })
            .then(() => {
                console.log('✅ Połączenie z zewnętrzną bazą MongoDB udane');
                process.exit(0);
            })
            .catch((err) => {
                console.log('❌ Błąd połączenia z bazą MongoDB:', err.message);
                console.log('Sprawdź czy MONGODB_URI jest poprawny w pliku .env');
                process.exit(1);
            });
            " 2>/dev/null
            
            if [ $? -eq 0 ]; then
                log_success "Połączenie z zewnętrzną bazą MongoDB udane"
            else
                log_error "Nie można połączyć się z zewnętrzną bazą MongoDB"
                log_warning "Sprawdź czy MONGODB_URI w pliku .env jest poprawny"
                log_warning "Przykład: MONGODB_URI=mongodb://username:password@host:port/database"
            fi
        else
            log_warning "MONGODB_URI nie jest ustawiony w pliku .env"
            log_info "Dodaj MONGODB_URI do pliku .env przed uruchomieniem aplikacji"
        fi
    else
        log_warning "Plik .env nie istnieje"
        log_info "Utworzę plik .env z przykładową konfiguracją"
    fi
}

# Instalacja PM2 (Process Manager)
install_pm2() {
    log_info "Sprawdzam czy PM2 jest zainstalowany..."
    
    if ! command -v pm2 &> /dev/null; then
        log_info "Instaluję PM2..."
        sudo npm install -g pm2
        log_success "PM2 zainstalowany"
    else
        log_success "PM2 już zainstalowany: $(pm2 --version)"
    fi
}

# Instalacja nginx (opcjonalnie)
install_nginx() {
    log_info "Sprawdzam czy nginx jest zainstalowany..."
    
    if ! command -v nginx &> /dev/null; then
        log_warning "nginx nie jest zainstalowany. Czy chcesz go zainstalować? (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            log_info "Instaluję nginx..."
            sudo apt-get install -y nginx
            sudo systemctl start nginx
            sudo systemctl enable nginx
            log_success "nginx zainstalowany i uruchomiony"
        fi
    else
        log_success "nginx już zainstalowany"
    fi
}

# Instalacja zależności
install_dependencies() {
    log_info "Instaluję zależności projektu..."
    
    # Instalacja zależności głównych
    npm install
    
    # Instalacja zależności klienta
    cd client
    npm install
    cd ..
    
    log_success "Wszystkie zależności zainstalowane"
}

# Konfiguracja środowiska
setup_environment() {
    log_info "Konfiguruję środowisko..."
    
    # Sprawdź czy plik .env istnieje
    if [ ! -f .env ]; then
        log_info "Tworzę plik .env na podstawie env.example..."
        cp env.example .env
        
        # Generuj bezpieczny JWT_SECRET
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        
        # Ustaw tryb produkcyjny
        sed -i "s/NODE_ENV=development/NODE_ENV=production/" .env
        
        log_warning "Plik .env został utworzony."
        log_warning "WAŻNE: Musisz skonfigurować MONGODB_URI dla zewnętrznej bazy danych!"
        log_info "Przykłady MONGODB_URI:"
        log_info "  - MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/ofertownik"
        log_info "  - Zewnętrzny serwer: mongodb://username:password@your-server.com:27017/ofertownik"
        log_info "  - Lokalna baza: mongodb://localhost:27017/ofertownik"
        echo ""
        log_warning "Edytuj plik .env i ustaw poprawny MONGODB_URI przed uruchomieniem aplikacji!"
        echo ""
    else
        log_success "Plik .env już istnieje"
        
        # Sprawdź czy MONGODB_URI jest ustawiony
        MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
        if [ -z "$MONGODB_URI" ] || [ "$MONGODB_URI" = "mongodb://localhost:27017/ofertownik" ]; then
            log_warning "MONGODB_URI nie jest skonfigurowany lub używa domyślnej wartości!"
            log_info "Edytuj plik .env i ustaw poprawny MONGODB_URI dla zewnętrznej bazy danych."
        fi
    fi
}

# Budowanie aplikacji klienta
build_client() {
    log_info "Buduję aplikację klienta..."
    
    cd client
    npm run build
    cd ..
    
    log_success "Aplikacja klienta zbudowana"
}

# Konfiguracja PM2
setup_pm2() {
    log_info "Konfiguruję PM2..."
    
    # Zatrzymaj istniejące procesy
    pm2 delete all 2>/dev/null || true
    
    # Uruchom serwer przez PM2
    pm2 start server/index.js --name "ofertownik-server" --env production
    
    # Zapisz konfigurację PM2
    pm2 save
    pm2 startup
    
    log_success "PM2 skonfigurowany"
}

# Konfiguracja nginx (opcjonalnie)
setup_nginx() {
    if command -v nginx &> /dev/null; then
        log_info "Konfiguruję nginx..."
        
        # Utwórz konfigurację nginx
        sudo tee /etc/nginx/sites-available/ofertownik << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /var/www/ofertownik/client/build;
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass https:///oferty.soft-synergy.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

        # Włącz stronę
        sudo ln -sf /etc/nginx/sites-available/ofertownik /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # Skopiuj zbudowaną aplikację
        sudo mkdir -p /var/www/ofertownik
        sudo cp -r client/build /var/www/ofertownik/client/
        sudo chown -R www-data:www-data /var/www/ofertownik
        
        # Sprawdź konfigurację nginx
        sudo nginx -t
        
        # Przeładuj nginx
        sudo systemctl reload nginx
        
        log_success "nginx skonfigurowany"
    fi
}

# Sprawdzenie statusu
check_status() {
    log_info "Sprawdzam status usług..."
    
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
    echo "Frontend: https:///ofertownik.soft-synergy.com"
echo "API: https:///oferty.soft-synergy.com/api"
    echo ""
}

# Funkcja główna
main() {
    echo "=========================================="
    echo "  DEPLOYMENT OFERTOWNIK SOFT SYNERGY"
    echo "=========================================="
    echo ""
    
    check_permissions
    check_os
    install_nodejs
    check_mongodb_connection
    install_pm2
    install_nginx
    install_dependencies
    setup_environment
    build_client
    setup_pm2
    setup_nginx
    check_status
    
    echo ""
    log_success "Deployment zakończony pomyślnie!"
    echo ""
    echo "Następne kroki:"
    echo "1. Sprawdź plik .env i dostosuj konfigurację"
    echo "2. Utwórz administratora: pm2 exec ofertownik-server node server/scripts/create-admin.js"
    echo "3. Sprawdź logi: pm2 logs ofertownik-server"
    echo "4. Monitoruj aplikację: pm2 monit"
    echo ""
}

# Uruchom główną funkcję
main "$@" 