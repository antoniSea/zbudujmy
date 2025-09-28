# 🚀 Cold Call Manager

Elegancka aplikacja Node.js do zarządzania cold callami z inteligentnym systemem dystrybucji leadów między pracownikami.

## ✨ Funkcje

### 🎯 Dla Pracowników
- **Prosty interfejs** do obsługi leadów
- **Nagrywanie rozmów** z przyciskiem mikrofonu
- **Statusy rozmów**: Nie odebrał, Niezainteresowany, Umówione spotkanie
- **System retry** - automatyczne 3 próby dla nieodebranych połączeń
- **Historia rozmów** dla każdego leada
- **Statystyki osobiste** (łączne rozmowy, udane, umówione spotkania)

### 👨‍💼 Dla Administratorów
- **Panel administracyjny** do zarządzania leadami i pracownikami
- **Inteligentna dystrybucja** leadów między pracownikami
- **Statystyki systemu** w czasie rzeczywistym
- **Zarządzanie pracownikami** (dodawanie, usuwanie, statystyki)
- **Monitorowanie statusu** pracowników

### 🧠 Inteligentny System Dystrybucji
- **Automatyczne przypisywanie** leadów do dostępnych pracowników
- **System retry** - 3 próby dla nieodebranych połączeń
- **Kolejkowanie** - jeden pracownik = jeden lead
- **Real-time updates** przez WebSocket

## 🚀 Instalacja i Uruchomienie

### 1. Instalacja zależności
```bash
cd zbudujmy
npm install
```

### 2. Konfiguracja środowiska
```bash
cp env.example .env
```

Edytuj plik `.env`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/cold-call-manager
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
```

### 3. Uruchomienie MongoDB
Upewnij się, że MongoDB jest uruchomiony:
```bash
# macOS (z Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. Utworzenie administratora
```bash
node scripts/create-admin.js
```

### 5. Uruchomienie aplikacji
```bash
# Tryb produkcyjny
npm start

# Tryb deweloperski (z auto-restart)
npm run dev
```

## 🌐 Dostęp do Aplikacji

- **Panel Pracownika**: http://localhost:3001/employee
- **Panel Administracyjny**: http://localhost:3001/admin

### Domyślne konto administratora:
- **Email**: admin@coldcall.com
- **Hasło**: admin123

⚠️ **Zmień hasło po pierwszym logowaniu!**

## 📱 Jak Używać

### Dla Pracowników

1. **Logowanie** - użyj danych podanych przez administratora
2. **Oczekiwanie na leada** - system automatycznie przypisze Ci leada
3. **Rozpoczęcie rozmowy** - kliknij "Rozpocznij rozmowę"
4. **Nagrywanie** - kliknij "Nagrywaj" aby nagrać rozmowę
5. **Zakończenie** - wybierz odpowiedni status:
   - **Nie odebrał** - lead wróci do systemu za 2h (max 3 próby)
   - **Niezainteresowany** - lead oznaczony jako niezainteresowany
   - **Umówione spotkanie** - dodaj szczegóły spotkania
   - **Następny telefon** - przejdź do następnego leada

### Dla Administratorów

1. **Logowanie** - użyj konta administratora
2. **Dodawanie leadów** - przejdź do zakładki "Leady" → "Dodaj leada"
3. **Zarządzanie pracownikami** - zakładka "Pracownicy"
4. **Monitorowanie** - zakładka "Statystyki" dla przeglądu systemu
5. **Dystrybucja** - przycisk "Dystrybuuj leady" dla ręcznej dystrybucji

## 🔧 API Endpoints

### Autoryzacja
- `POST /api/auth/login` - Logowanie
- `GET /api/auth/verify` - Weryfikacja tokenu

### Leady (Pracownicy)
- `GET /api/leads/my-lead` - Pobierz aktualny lead
- `POST /api/leads/start-call` - Rozpocznij rozmowę
- `POST /api/leads/end-call` - Zakończ rozmowę

### Rozmowy
- `POST /api/calls/start` - Rozpocznij nową rozmowę
- `POST /api/calls/end` - Zakończ rozmowę
- `GET /api/calls/history` - Historia rozmów pracownika
- `GET /api/calls/active` - Aktywna rozmowa

### Pracownicy
- `GET /api/employees/profile` - Profil pracownika
- `POST /api/employees/toggle-availability` - Zmień status dostępności
- `GET /api/employees/stats` - Statystyki pracownika

### Administracja
- `GET /api/admin/stats` - Statystyki systemu
- `GET /api/admin/leads` - Lista leadów
- `POST /api/admin/leads` - Dodaj leada
- `DELETE /api/admin/leads/:id` - Usuń leada
- `GET /api/admin/employees` - Lista pracowników
- `POST /api/admin/employees` - Dodaj pracownika
- `DELETE /api/admin/employees/:id` - Usuń pracownika
- `POST /api/admin/distribute-leads` - Wymuś dystrybucję leadów

## 🏗️ Architektura

```
zbudujmy/
├── models/           # Modele bazy danych
│   ├── Lead.js      # Model leada
│   ├── Employee.js  # Model pracownika
│   └── Call.js      # Model rozmowy
├── routes/          # API endpoints
│   ├── auth.js      # Autoryzacja
│   ├── leads.js     # Zarządzanie leadami
│   ├── employees.js # Zarządzanie pracownikami
│   ├── calls.js     # Zarządzanie rozmowami
│   └── admin.js     # Panel administracyjny
├── services/        # Logika biznesowa
│   └── LeadDistributionService.js # System dystrybucji
├── public/          # Frontend
│   ├── employee.html # Panel pracownika
│   └── admin.html   # Panel administracyjny
├── scripts/         # Skrypty pomocnicze
│   └── create-admin.js # Tworzenie administratora
└── server.js        # Główny serwer
```

## 🔄 System Dystrybucji Leadów

1. **Nowy lead** → Status: `new`
2. **Automatyczne przypisanie** → Status: `assigned`
3. **Rozpoczęcie rozmowy** → Status: `calling`
4. **Wynik rozmowy**:
   - **Nie odebrał** → Retry (max 3x) → Status: `not_interested`
   - **Niezainteresowany** → Status: `not_interested`
   - **Umówione spotkanie** → Status: `meeting_scheduled`
   - **Rozmowa nagrana** → Status: `completed`

## 🛡️ Bezpieczeństwo

- **JWT Authentication** - bezpieczne logowanie
- **Role-based access** - różne uprawnienia dla pracowników i adminów
- **Password hashing** - hasła są hashowane bcrypt
- **Input validation** - walidacja wszystkich danych wejściowych

## 📊 Monitoring

- **Real-time status** - status połączenia w czasie rzeczywistym
- **WebSocket updates** - natychmiastowe powiadomienia
- **Call tracking** - śledzenie wszystkich rozmów
- **Performance metrics** - statystyki wydajności

## 🚀 Deployment

### Produkcja
```bash
# Ustaw zmienne środowiskowe
export NODE_ENV=production
export MONGODB_URI=mongodb://your-production-db
export JWT_SECRET=your-production-secret

# Uruchom aplikację
npm start
```

### PM2 (Zalecane dla produkcji)
```bash
npm install -g pm2
pm2 start server.js --name "cold-call-manager"
pm2 startup
pm2 save
```

## 🤝 Wsparcie

W przypadku problemów:
1. Sprawdź logi aplikacji
2. Upewnij się, że MongoDB jest uruchomiony
3. Sprawdź konfigurację w pliku `.env`
4. Uruchom `node scripts/create-admin.js` ponownie

## 📝 Licencja

MIT License - Soft Synergy Imperium
