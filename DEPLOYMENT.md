# Deployment Guide - Ofertownik Soft Synergy

## Przegląd

Ten przewodnik opisuje jak wdrożyć aplikację Ofertownik Soft Synergy na serwerze produkcyjnym Linux.

## Wymagania systemowe

- Ubuntu 20.04 LTS lub nowszy
- Minimum 2GB RAM
- Minimum 10GB wolnego miejsca na dysku
- Dostęp do internetu
- Uprawnienia sudo

## Architektura

Aplikacja składa się z:
- **Backend**: Node.js + Express + MongoDB
- **Frontend**: React (zbudowany do plików statycznych)
- **Reverse Proxy**: nginx (opcjonalnie)
- **Process Manager**: PM2

## Szybki start

### 1. Przygotowanie serwera

```bash
# Zaktualizuj system
sudo apt update && sudo apt upgrade -y

# Skopiuj projekt na serwer
git clone <your-repo-url>
cd ofertownik-soft-synergy

# Nadaj uprawnienia do wykonywania skryptów
chmod +x deploy.sh manage.sh setup-mongodb.sh
```

### 2. Konfiguracja zewnętrznej bazy MongoDB

```bash
# Uruchom skrypt konfiguracji MongoDB
./setup-mongodb.sh
```

Wybierz odpowiednią opcję:
- **MongoDB Atlas** - dla chmurowej bazy danych
- **Zewnętrzny serwer MongoDB** - dla własnego serwera MongoDB
- **Lokalna baza MongoDB** - dla lokalnej instalacji

### 3. Uruchom deployment

```bash
# Uruchom główny skrypt deploymentu
./deploy.sh
```

Skrypt automatycznie:
- Zainstaluje Node.js, PM2, nginx
- Zainstaluje wszystkie zależności
- Skonfiguruje środowisko
- Zbuduje aplikację klienta
- Uruchomi serwer przez PM2
- Skonfiguruje nginx (opcjonalnie)

### 4. Utwórz administratora

```bash
# Uruchom skrypt zarządzania
./manage.sh

# Wybierz opcję 4 - "Utwórz użytkownika administratora"
```

Domyślne dane logowania:
- Email: `admin@softsynergy.pl`
- Hasło: `admin123`

## Szczegółowa konfiguracja

### Konfiguracja środowiska

Plik `.env` zostanie utworzony automatycznie. Sprawdź i dostosuj:

```bash
# Edytuj plik .env
nano .env
```

Kluczowe zmienne:
```env
NODE_ENV=production
PORT=5001
# Zewnętrzna baza MongoDB - skonfiguruj przez setup-mongodb.sh
MONGODB_URI=mongodb://username:password@your-server.com:27017/ofertownik
JWT_SECRET=your-generated-secret
```

**Ważne**: Użyj skryptu `setup-mongodb.sh` do konfiguracji połączenia z zewnętrzną bazą MongoDB.

### Konfiguracja nginx

Jeśli nginx został zainstalowany, konfiguracja zostanie utworzona automatycznie w:
`/etc/nginx/sites-available/ofertownik`

Możesz dostosować konfigurację:
```bash
sudo nano /etc/nginx/sites-available/ofertownik
sudo nginx -t
sudo systemctl reload nginx
```

### Konfiguracja firewall

```bash
# Otwórz porty
sudo ufw allow 22    # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS (jeśli używasz SSL)
sudo ufw allow 5001   # API (opcjonalnie)

# Włącz firewall
sudo ufw enable
```

## Zarządzanie aplikacją

### Skrypt zarządzania

Użyj skryptu `manage.sh` do zarządzania aplikacją:

```bash
./manage.sh
```

Dostępne opcje:
1. Sprawdź status usług
2. Uruchom ponownie serwer
3. Sprawdź logi serwera
4. Utwórz użytkownika administratora
5. Zbuduj ponownie aplikację klienta
6. Sprawdź zużycie zasobów
7. Zatrzymaj wszystkie usługi
8. Uruchom wszystkie usługi
9. Sprawdź połączenie z bazą danych
10. Wyświetl konfigurację środowiska

### Ręczne zarządzanie PM2

```bash
# Sprawdź status
pm2 list

# Sprawdź logi
pm2 logs ofertownik-server

# Uruchom ponownie
pm2 restart ofertownik-server

# Zatrzymaj
pm2 stop ofertownik-server

# Uruchom
pm2 start ofertownik-server

# Monitoruj
pm2 monit
```

### Zarządzanie zewnętrzną bazą MongoDB

```bash
# Sprawdź połączenie z bazą
./setup-mongodb.sh
# Wybierz opcję 4 - "Sprawdź połączenie"

# Testuj połączenie
./setup-mongodb.sh
# Wybierz opcję 5 - "Testuj połączenie"

# Sprawdź konfigurację
cat .env | grep MONGODB_URI
```

## Monitoring i logi

### Logi aplikacji

```bash
# Logi PM2
pm2 logs ofertownik-server

# Logi nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logi MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Monitoring zasobów

```bash
# Sprawdź zużycie CPU i pamięci
htop

# Sprawdź miejsce na dysku
df -h

# Sprawdź procesy Node.js
ps aux | grep node
```

## Backup i restore

### Backup zewnętrznej bazy danych

```bash
# Backup przez MongoDB Atlas (jeśli używasz)
# Użyj narzędzi MongoDB Atlas do backupu

# Backup zewnętrznego serwera MongoDB
mongodump --uri="mongodb://username:password@your-server.com:27017/ofertownik" --out /backup/$(date +%Y%m%d)

# Przywróć backup
mongorestore --uri="mongodb://username:password@your-server.com:27017/ofertownik" /backup/20231201/ofertownik/
```

### Backup aplikacji

```bash
# Backup plików aplikacji
tar -czf backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=client/node_modules \
    --exclude=client/build \
    .
```

## Troubleshooting

### Serwer nie uruchamia się

```bash
# Sprawdź logi
pm2 logs ofertownik-server

# Sprawdź połączenie z bazą
./manage.sh
# Wybierz opcję 9
```

### Zewnętrzna baza MongoDB nie łączy się

```bash
# Sprawdź połączenie z bazą
./setup-mongodb.sh
# Wybierz opcję 4 - "Sprawdź połączenie"

# Sprawdź konfigurację MONGODB_URI
cat .env | grep MONGODB_URI

# Testuj połączenie
./setup-mongodb.sh
# Wybierz opcję 5 - "Testuj połączenie"
```

### nginx nie działa

```bash
# Sprawdź konfigurację
sudo nginx -t

# Sprawdź status
sudo systemctl status nginx

# Sprawdź logi
sudo tail -f /var/log/nginx/error.log
```

### Aplikacja nie odpowiada

```bash
# Sprawdź porty
netstat -tlnp | grep :5001

# Sprawdź firewall
sudo ufw status

# Sprawdź logi aplikacji
pm2 logs ofertownik-server
```

## Aktualizacje

### Aktualizacja aplikacji

```bash
# Pobierz najnowsze zmiany
git pull origin main

# Zainstaluj nowe zależności
npm install
cd client && npm install && cd ..

# Zbuduj ponownie klienta
cd client && npm run build && cd ..

# Uruchom ponownie serwer
pm2 restart ofertownik-server
```

### Aktualizacja systemu

```bash
# Aktualizuj system
sudo apt update && sudo apt upgrade -y

# Uruchom ponownie usługi
sudo systemctl restart mongod
pm2 restart all
```

## Bezpieczeństwo

### Zmiana hasła administratora

```bash
# Połącz się z bazą danych
mongosh ofertownik

# Zmień hasło
db.users.updateOne(
  { email: "admin@softsynergy.pl" },
  { $set: { password: "nowe-hashowane-haslo" } }
)
```

### Konfiguracja SSL (opcjonalnie)

```bash
# Zainstaluj Certbot
sudo apt install certbot python3-certbot-nginx

# Uzyskaj certyfikat SSL
sudo certbot --nginx -d yourdomain.com

# Automatyczne odnawianie
sudo crontab -e
# Dodaj: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Wsparcie

W przypadku problemów:
1. Sprawdź logi aplikacji
2. Sprawdź status usług
3. Sprawdź konfigurację środowiska
4. Skontaktuj się z zespołem deweloperskim

## Przydatne komendy

```bash
# Sprawdź wszystkie usługi
./manage.sh

# Sprawdź logi w czasie rzeczywistym
pm2 logs ofertownik-server --lines 100 -f

# Monitoruj zasoby
pm2 monit

# Sprawdź wersje
node --version
npm --version
pm2 --version

# Konfiguracja MongoDB
./setup-mongodb.sh
```

## Skrypty deploymentu

- **`deploy.sh`** - Główny skrypt deploymentu
- **`manage.sh`** - Zarządzanie aplikacją po deployment
- **`setup-mongodb.sh`** - Konfiguracja zewnętrznej bazy MongoDB 