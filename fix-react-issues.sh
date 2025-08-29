#!/bin/bash

# Skrypt do naprawy problemów z React na serwerze Linux
# Uruchom jako: chmod +x fix-react-issues.sh && ./fix-react-issues.sh

set -e

echo "🔧 Naprawiam problemy z React..."

# Kolory
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Sprawdź czy jesteśmy w odpowiednim katalogu
if [ ! -f "package.json" ] || [ ! -d "client" ]; then
    log_error "Uruchom skrypt z głównego katalogu projektu!"
    exit 1
fi

# 1. Zatrzymaj PM2
log_info "Zatrzymuję PM2..."
pm2 stop all 2>/dev/null || true

# 2. Wyczyść cache npm
log_info "Czyszczę cache npm..."
npm cache clean --force

# 3. Usuń node_modules
log_info "Usuwam node_modules..."
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json

# 4. Sprawdź wersję Node.js
log_info "Sprawdzam wersję Node.js..."
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_info "Node.js: $NODE_VERSION, npm: $NPM_VERSION"

# 5. Zainstaluj zależności główne
log_info "Instaluję zależności główne..."
npm install --production=false

# 6. Zainstaluj zależności klienta
log_info "Instaluję zależności klienta..."
cd client

# Sprawdź czy react-scripts jest zainstalowany
if ! npm list react-scripts >/dev/null 2>&1; then
    log_warning "react-scripts nie jest zainstalowany, instaluję..."
    npm install react-scripts@latest
fi

# Sprawdź wersje
REACT_VERSION=$(npm list react --depth=0 2>/dev/null | grep react | awk '{print $2}' || echo "nieznana")
SCRIPTS_VERSION=$(npm list react-scripts --depth=0 2>/dev/null | grep react-scripts | awk '{print $2}' || echo "nieznana")

log_info "React: $REACT_VERSION"
log_info "react-scripts: $SCRIPTS_VERSION"

# 7. Usuń stary build i zbuduj ponownie
log_info "Usuwam stary build..."
rm -rf build

log_info "Buduję aplikację klienta..."
npm run build

# 8. Sprawdź czy build się udał
if [ -d "build" ] && [ -d "build/static/js" ]; then
    log_success "Build udany! Sprawdzam pliki..."
    ls -la build/static/js/
else
    log_error "Build nie powiódł się!"
    exit 1
fi

cd ..

# 9. Uruchom ponownie PM2
log_info "Uruchamiam PM2..."
pm2 start ecosystem.config.js --env production

# 10. Sprawdź status
log_info "Sprawdzam status..."
pm2 list
pm2 logs --lines 10

log_success "Naprawa zakończona! Sprawdź logi PM2 czy aplikacja działa."
echo ""
echo "Przydatne komendy:"
echo "  pm2 logs - monitoruj logi"
echo "  pm2 monit - monitoruj procesy"
echo "  pm2 restart all - restartuj wszystkie procesy"
