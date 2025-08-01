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

# Instalacja MongoDB
install_mongodb() {
    log_info "Sprawdzam czy MongoDB jest zainstalowany..."
    
    if ! command -v mongod &> /dev/null; then
        log_info "Instaluję MongoDB..."
        
        # Dodaj MongoDB GPG key
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
        
        # Dodaj MongoDB repository
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        
        # Aktualizuj pakiety
        sudo apt-get update
        
        # Instaluj MongoDB
        sudo apt-get install -y mongodb-org
        
        # Uruchom MongoDB
        sudo systemctl start mongod
        sudo systemctl enable mongod
        
        log_success "MongoDB zainstalowany i uruchomiony"
    else
        log_success "MongoDB już zainstalowany"
        
        # Sprawdź czy MongoDB działa
        if sudo systemctl is-active --quiet mongod; then
            log_success "MongoDB jest uruchomiony"
        else
            log_info "Uruchamiam MongoDB..."
            sudo systemctl start mongod
            sudo systemctl enable mongod
        fi
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
        
        log_warning "Plik .env został utworzony. Sprawdź i dostosuj konfigurację przed uruchomieniem."
    else
        log_success "Plik .env już istnieje"
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
        proxy_pass http://localhost:5001;
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
    
    # MongoDB
    if sudo systemctl is-active --quiet mongod; then
        echo -e "${GREEN}✓ MongoDB: uruchomiony${NC}"
    else
        echo -e "${RED}✗ MongoDB: zatrzymany${NC}"
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
    echo "Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "API: http://$(hostname -I | awk '{print $1}'):5001/api"
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
    install_mongodb
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