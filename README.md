# Ofertownik Soft Synergy

Aplikacja do zarządzania ofertami projektowymi dla firmy Soft Synergy.

## 🚀 Funkcje

- **Zarządzanie projektami** - tworzenie, edycja i usuwanie projektów
- **Generowanie ofert** - automatyczne generowanie HTML i PDF ofert
- **Portfolio** - zarządzanie portfolio projektów
- **Autentykacja** - system logowania dla pracowników
- **Responsywny design** - działa na wszystkich urządzeniach

## 🛠️ Technologie

### Backend
- **Node.js** z Express.js
- **MongoDB** z Mongoose
- **JWT** dla autentykacji
- **jsPDF** do generowania PDF (bez przeglądarki)
- **Handlebars** do templatów HTML
- **Multer** do uploadu plików

### Frontend
- **React** z React Router
- **Tailwind CSS** do stylowania
- **React Query** do zarządzania stanem
- **React Hook Form** do formularzy
- **Lucide React** dla ikon

## 📦 Instalacja

1. **Sklonuj repozytorium**
```bash
git clone <url-repozytorium>
cd ofertownik-soft-synergy
```

2. **Zainstaluj zależności**
```bash
npm run install-all
```

3. **Skonfiguruj zmienne środowiskowe**
```bash
cp .env.example .env
# Edytuj .env i dodaj swoje dane MongoDB
```

4. **Utwórz użytkownika admin**
```bash
npm run create-admin
```

5. **Uruchom aplikację**
```bash
npm run dev
```

## 🔧 Skrypty

- `npm run dev` - uruchamia serwer i klient w trybie deweloperskim
- `npm run server` - uruchamia tylko serwer
- `npm run client` - uruchamia tylko klient
- `npm run build` - buduje aplikację produkcyjną
- `npm run create-admin` - tworzy użytkownika administratora

## 📁 Struktura projektu

```
ofertownik-soft-synergy/
├── server/                 # Backend
│   ├── models/            # Modele MongoDB
│   ├── routes/            # Endpointy API
│   ├── middleware/        # Middleware
│   ├── templates/         # Szablony HTML
│   └── scripts/           # Skrypty pomocnicze
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Komponenty React
│   │   ├── pages/         # Strony aplikacji
│   │   ├── services/      # Serwisy API
│   │   └── utils/         # Narzędzia
└── package.json           # Zależności główne
```

## 🔐 Domyślne dane logowania

- **Email:** admin@softsynergy.pl
- **Hasło:** admin123

## 📄 API Endpoints

### Autentykacja
- `POST /api/auth/login` - logowanie
- `POST /api/auth/logout` - wylogowanie

### Projekty
- `GET /api/projects` - lista projektów
- `POST /api/projects` - tworzenie projektu
- `PUT /api/projects/:id` - edycja projektu
- `DELETE /api/projects/:id` - usuwanie projektu

### Oferty
- `POST /api/offers/generate/:projectId` - generowanie oferty


### Portfolio
- `GET /api/portfolio` - lista portfolio
- `POST /api/portfolio` - dodawanie do portfolio

## 🎨 Funkcje oferty

Każda wygenerowana oferta zawiera:
- **Dane klienta** i projektu
- **Opis projektu** i korzyści
- **Moduły** i zakres prac
- **Harmonogram** projektu
- **Cennik** i warunki płatności
- **Portfolio** firmy
- **Dane kontaktowe** opiekuna projektu

## 🔧 Konfiguracja

### MongoDB
Dodaj swoje dane MongoDB w pliku `.env`:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
JWT_SECRET=your-secret-key
```

### Porty
- **Frontend:** https:///ofertownik.soft-synergy.com
- **Backend:** https:///oferty.soft-synergy.com

## 📝 Licencja

Projekt stworzony dla Soft Synergy. Wszystkie prawa zastrzeżone.

## 👥 Autor

Stworzone przez AI Assistant dla Soft Synergy 