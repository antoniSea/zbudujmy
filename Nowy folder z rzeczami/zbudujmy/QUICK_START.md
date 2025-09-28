# 🚀 Szybki Start - Cold Call Manager

## ⚡ Uruchomienie w 3 krokach

### 1. Zainstaluj zależności
```bash
cd zbudujmy
npm install
```

### 2. Uruchom aplikację
```bash
./start.sh
```

### 3. Otwórz w przeglądarce
- **Panel Pracownika**: http://localhost:3001/employee
- **Panel Administracyjny**: http://localhost:3001/admin

## 🔑 Domyślne dane logowania

**Administrator:**
- Email: `admin@coldcall.com`
- Hasło: `admin123`

## 📱 Jak zacząć

### Dla Administratora:
1. Zaloguj się na http://localhost:3001/admin
2. Przejdź do zakładki "Leady" → "Dodaj leada"
3. Dodaj pierwszych pracowników w zakładce "Pracownicy"
4. System automatycznie dystrybuuje leady

### Dla Pracownika:
1. Zaloguj się na http://localhost:3001/employee
2. Oczekuj na przypisanie leada
3. Rozpocznij rozmowę
4. Wybierz wynik rozmowy

## 🎯 Główne funkcje

✅ **Inteligentna dystrybucja** - system automatycznie przypisuje leady  
✅ **System retry** - 3 próby dla nieodebranych połączeń  
✅ **Nagrywanie rozmów** - przycisk mikrofonu  
✅ **Real-time updates** - natychmiastowe powiadomienia  
✅ **Statystyki** - dla pracowników i administratorów  
✅ **Historia rozmów** - pełna dokumentacja  

## 🛠️ Rozwiązywanie problemów

**MongoDB nie działa:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

**Błąd połączenia z bazą:**
- Sprawdź czy MongoDB jest uruchomiony
- Sprawdź plik `.env` - czy `MONGODB_URI` jest poprawny

**Nie można się zalogować:**
- Uruchom ponownie `./start.sh`
- Sprawdź czy administrator został utworzony

## 📞 Wsparcie

W przypadku problemów sprawdź:
1. Logi w terminalu
2. Czy MongoDB działa
3. Czy port 3001 jest wolny
4. Czy wszystkie zależności są zainstalowane

---

**Gotowe! 🎉 Twoja aplikacja cold calling jest gotowa do użycia!**
