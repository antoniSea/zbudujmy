const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const employeeRoutes = require('./routes/employees');
const callRoutes = require('./routes/calls');
const adminRoutes = require('./routes/admin');
const recordingRoutes = require('./routes/recordings');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statyczne pliki
app.use(express.static('public'));

// Home route with Cold Calling Knowledge Base
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cold Calling Knowledge Base - Soft Synergy</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'softsynergy-blue': '#2563eb',
                        'softsynergy-orange': '#f97316',
                        'softsynergy-dark': '#1e293b',
                        'softsynergy-light': '#f8fafc'
                    }
                }
            }
        }
    </script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .gradient-bg {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .fade-in {
            animation: fadeIn 0.6s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .hover-scale {
            transition: transform 0.3s ease;
        }
        .hover-scale:hover {
            transform: scale(1.05);
        }
        .pulse-animation {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Soft Synergy Presentation Header -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div class="mb-8">
                <img src="/logo.png" alt="Soft Synergy" class="h-20 w-20 mx-auto mb-6">
                <h1 class="text-5xl md:text-7xl font-bold mb-6">
                    Soft <span class="text-orange-300">Synergy</span>
                </h1>
                <p class="text-2xl md:text-3xl mb-8 opacity-90">
                    Cold Calling System
                </p>
                <p class="text-xl md:text-2xl mb-8 opacity-80">
                    Instrukcja obsługi systemu dla nowych callerów
                </p>
            </div>
            <div class="bg-yellow-100 border-l-4 border-yellow-500 p-6 max-w-5xl mx-auto">
                <p class="text-yellow-800 font-bold text-xl">
                    💡 KLUCZ: Strona za 300zł to IMPULS BUY - bazujemy na emocjach, nie logice!
                </p>
            </div>
        </div>
    </div>

    <!-- Quick Start Guide -->
    <div class="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">🚀 SZYBKI START</h2>
                </div>
                <p class="text-2xl text-gray-600">Krok po kroku jak obsługiwać system Soft Synergy</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Step 1 -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-white">1</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">🔐 ZALOGUJ SIĘ</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>Idź na <strong>/employee</strong></span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>Wpisz email i hasło</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>Kliknij "Zaloguj się"</span>
                        </div>
                    </div>
                </div>

                <!-- Step 2 -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-white">2</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">📋 WYBIERZ LEADA</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>Z listy dostępnych leadów</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>Kliknij na leada</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>Przeczytaj dane klienta</span>
                        </div>
                    </div>
                </div>

                <!-- Step 3 -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl font-bold text-white">3</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">📞 ZADZWOŃ</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-purple-500 mr-2">•</span>
                            <span>Kliknij "Rozpocznij rozmowę"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-purple-500 mr-2">•</span>
                            <span>Zadzwoń do klienta</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-purple-500 mr-2">•</span>
                            <span>Użyj skryptu poniżej</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Psychology & Emotions Section -->
    <div class="bg-gradient-to-br from-red-50 to-pink-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">🧠 PSYCHOLOGIA SPRZEDAŻY</h2>
                </div>
                <p class="text-2xl text-gray-600">Na jakich emocjach bazujemy przy sprzedaży stron Soft Synergy za 300zł</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <!-- Fear of Missing Out -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">😰 FOMO - Strach przed utratą</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-red-500 mr-2">•</span>
                            <span>"Wszyscy konkurenci już mają strony"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-red-500 mr-2">•</span>
                            <span>"Tracisz klientów na rzecz konkurencji"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-red-500 mr-2">•</span>
                            <span>"Bez strony nie istniejesz w internecie"</span>
                        </div>
                    </div>
                </div>

                <!-- Social Proof -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-users text-2xl text-blue-600"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">👥 Dowód społeczny</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>"Podobne firmy w mieście już mają"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>"Wszyscy robią to samo"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-blue-500 mr-2">•</span>
                            <span>"To standard w branży"</span>
                        </div>
                    </div>
                </div>

                <!-- Urgency -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-clock text-2xl text-orange-600"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">⏰ Pilność</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-orange-500 mr-2">•</span>
                            <span>"Oferta tylko do końca miesiąca"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-orange-500 mr-2">•</span>
                            <span>"Mamy tylko 3 wolne terminy"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-orange-500 mr-2">•</span>
                            <span>"Cena może wzrosnąć"</span>
                        </div>
                    </div>
                </div>

                <!-- Value Proposition -->
                <div class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-gem text-2xl text-green-600"></i>
                        </div>
                        <h3 class="text-xl font-semibold mb-2 text-gray-900">💎 Wartość</h3>
                    </div>
                    <div class="space-y-3 text-sm text-gray-700">
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>"Za 300zł to praktycznie za darmo"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>"Zwróci się w pierwszym miesiącu"</span>
                        </div>
                        <div class="flex items-start">
                            <span class="text-green-500 mr-2">•</span>
                            <span>"To inwestycja w przyszłość"</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Ready-to-Use Script -->
    <div class="bg-gradient-to-br from-orange-50 to-red-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">📞 GOTOWY SKRYPT</h2>
                </div>
                <p class="text-2xl text-gray-600">Skopiuj i użyj tego skryptu Soft Synergy w każdej rozmowie</p>
            </div>
            
            <div class="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
                <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">🎯 SKRYPT DO KOPIOWANIA</h3>
                <div class="bg-gray-100 p-6 rounded-lg font-mono text-sm space-y-4">
                    <div class="text-blue-600 font-semibold">1. Otwarcie:</div>
                    <div class="ml-4">"Cześć, dzwonię z Soft Synergy. Czym się zajmujesz?"</div>
                    
                    <div class="text-blue-600 font-semibold">2. Sprawdzenie strony:</div>
                    <div class="ml-4">"Aha, rozumiem. Masz może stronę internetową?"</div>
                    
                    <div class="text-blue-600 font-semibold">3. Budowanie problemu:</div>
                    <div class="ml-4">"Hmm, nie udało mi się jej znaleźć w Google..."</div>
                    
                    <div class="text-blue-600 font-semibold">4. Prezentacja firmy:</div>
                    <div class="ml-4">"Akurat tak się składa, że dzwonię z Soft Synergy. Robimy strony internetowe i wspieramy małe biznesy. Właśnie robiliśmy stronę dla [nazwa podobnej firmy] w [miasto]."</div>
                    
                    <div class="text-blue-600 font-semibold">5. Oferta demo:</div>
                    <div class="ml-4">"Mamy dla Ciebie gotową stronę demo. Możemy się spotkać online i Ci ją pokazać. Nic Cię to nie zobowiązuje, tylko patrzysz."</div>
                    
                    <div class="text-blue-600 font-semibold">6. Zbieranie emaila:</div>
                    <div class="ml-4">"Podaj mi swój email, to wyślę Ci link do kalendarza i wybierzesz wygodny termin."</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts Section -->
    <div class="bg-gradient-to-br from-gray-50 to-blue-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">📞 OBSŁUGA SPRZECIWÓW</h2>
                </div>
                <p class="text-2xl text-gray-600">Co mówić gdy klient się sprzeciwia - Soft Synergy</p>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <!-- Opening Script -->
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">🎯 Otwarcie rozmowy</h3>
                    <div class="space-y-4 text-gray-700">
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-blue-600 mb-2">Cześć, dzwonię z Soft Synergy. Czym się zajmujesz?</p>
                            <p class="text-sm text-gray-600">[Czekaj na odpowiedź]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-blue-600 mb-2">Aha, rozumiem. Masz może stronę internetową?</p>
                            <p class="text-sm text-gray-600">[Jeśli TAK - przejdź do konkurencji, jeśli NIE - kontynuuj]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-blue-600 mb-2">Hmm, nie udało mi się jej znaleźć w Google...</p>
                            <p class="text-sm text-gray-600">[To jest kluczowe - buduje problem]</p>
                        </div>
                    </div>
                </div>

                <!-- Presentation Script -->
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">💼 Prezentacja firmy</h3>
                    <div class="space-y-4 text-gray-700">
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-green-600 mb-2">Akurat tak się składa, że dzwonię z Soft Synergy...</p>
                            <p class="text-sm text-gray-600">[Naturalne przejście]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-green-600 mb-2">Robimy strony internetowe i wspieramy małe biznesy</p>
                            <p class="text-sm text-gray-600">[Krótko i na temat]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-green-600 mb-2">Właśnie robiliśmy stronę dla [nazwa podobnej firmy] w [miasto]</p>
                            <p class="text-sm text-gray-600">[Dowód społeczny - bardzo ważne!]</p>
                        </div>
                    </div>
                </div>

                <!-- Demo Script -->
                <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">🎁 Oferta demo</h3>
                    <div class="space-y-4 text-gray-700">
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-purple-600 mb-2">Mamy dla Ciebie gotową stronę demo</p>
                            <p class="text-sm text-gray-600">[Nie "projekt" - "gotową"]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-purple-600 mb-2">Możemy się spotkać online i Ci ją pokazać</p>
                            <p class="text-sm text-gray-600">[Spotkanie, nie "rozmowa"]</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-purple-600 mb-2">Nic Cię to nie zobowiązuje, tylko patrzysz</p>
                            <p class="text-sm text-gray-600">[Usuwa presję]</p>
                        </div>
                    </div>
                </div>

                <!-- Objection Handling -->
                <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">🛡️ Obsługa sprzeciwów</h3>
                    <div class="space-y-4 text-gray-700">
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-red-600 mb-2">"Nie mam czasu"</p>
                            <p class="text-sm text-gray-600">"Rozumiem, dlatego proponuję tylko 15 minut online"</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-red-600 mb-2">"Nie jestem zainteresowany"</p>
                            <p class="text-sm text-gray-600">"Rozumiem, ale to tylko 15 minut. Co masz do stracenia?"</p>
                        </div>
                        <div class="bg-white p-4 rounded-lg">
                            <p class="font-semibold text-red-600 mb-2">"Mam już stronę"</p>
                            <p class="text-sm text-gray-600">"Świetnie! Może pokażę Ci jak można ją ulepszyć?"</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- How to End Call -->
    <div class="bg-gradient-to-br from-green-50 to-blue-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">✅ JAK ZAKOŃCZYĆ ROZMOWĘ</h2>
                </div>
                <p class="text-2xl text-gray-600">Co robić po zakończeniu rozmowy z klientem Soft Synergy</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- If Got Email -->
                <div class="bg-white rounded-xl p-8 shadow-lg border-l-4 border-green-500">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">✅ DOSTAŁEŚ EMAIL</h3>
                    <div class="space-y-4">
                        <div class="flex items-start">
                            <span class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">1</span>
                            <div>
                                <p class="font-semibold">Wyślij link do kalendarza</p>
                                <p class="text-sm text-gray-600">Skopiuj link z sekcji poniżej</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <span class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">2</span>
                            <div>
                                <p class="font-semibold">Wybierz status "Umówione spotkanie"</p>
                                <p class="text-sm text-gray-600">W systemie</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <span class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">3</span>
                            <div>
                                <p class="font-semibold">Dodaj notatki o rozmowie</p>
                                <p class="text-sm text-gray-600">Co klient powiedział</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- If No Email -->
                <div class="bg-white rounded-xl p-8 shadow-lg border-l-4 border-red-500">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">❌ NIE DOSTAŁEŚ EMAILA</h3>
                    <div class="space-y-4">
                        <div class="flex items-start">
                            <span class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">1</span>
                            <div>
                                <p class="font-semibold">Wybierz odpowiedni status</p>
                                <p class="text-sm text-gray-600">"Nie odebrał", "Niezainteresowany", etc.</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <span class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">2</span>
                            <div>
                                <p class="font-semibold">Dodaj notatki</p>
                                <p class="text-sm text-gray-600">Dlaczego nie chciał</p>
                            </div>
                        </div>
                        <div class="flex items-start">
                            <span class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">3</span>
                            <div>
                                <p class="font-semibold">Przejdź do następnego leada</p>
                                <p class="text-sm text-gray-600">Nie trać czasu</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Calendar Integration -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <div class="flex items-center justify-center mb-6">
                <img src="/logo.png" alt="Soft Synergy" class="h-16 w-16 mr-4">
                <h2 class="text-4xl font-bold">📅 LINK DO KALENDARZA</h2>
            </div>
            <p class="text-2xl mb-8 opacity-90">Wyślij klientowi ten link do umówienia spotkania z Soft Synergy</p>
            <div class="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
                <p class="text-lg font-mono break-all mb-4">
                    https://cal.com/soft-synergy/30min?overlayCalendar=true
                </p>
                <p class="text-sm opacity-75">⚠️ Ważne: Klient musi wpisać swoje imię, nazwisko i cel spotkania</p>
            </div>
        </div>
    </div>

    <!-- Key Success Factors -->
    <div class="bg-gradient-to-br from-yellow-50 to-orange-50 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
                <div class="flex items-center justify-center mb-6">
                    <img src="/logo.png" alt="Soft Synergy" class="h-12 w-12 mr-4">
                    <h2 class="text-4xl font-bold text-gray-900">🎯 KLUCZOWE CZYNNIKI SUKCESU</h2>
                </div>
                <p class="text-2xl text-gray-600">Co decyduje o skuteczności cold callingu Soft Synergy</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-8 shadow-lg text-center">
                    <div class="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-heart text-3xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">Emocje, nie logika</h3>
                    <p class="text-gray-700">300zł to impuls buy. Bazuj na emocjach klienta, nie na kalkulacjach.</p>
                </div>
                
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg text-center">
                    <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-bullseye text-3xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">Cel: EMAIL</h3>
                    <p class="text-gray-700">Główny cel to zdobycie emaila. Reszta to bonus.</p>
                </div>
                
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-lg text-center">
                    <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-comments text-3xl text-white"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">Naturalna rozmowa</h3>
                    <p class="text-gray-700">Jak zwykła pogawędka, nie oficjalna sprzedaż.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Access -->
    <div class="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div class="flex items-center justify-center mb-6">
                <img src="/logo.png" alt="Soft Synergy" class="h-16 w-16 mr-4">
                <h3 class="text-3xl font-bold">🚀 SZYBKI DOSTĘP</h3>
            </div>
            <p class="text-xl mb-8 opacity-90">Przejdź do odpowiedniego panelu Soft Synergy</p>
            <div class="flex flex-wrap justify-center gap-6">
                <a href="/admin.html" class="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg">
                    <i class="fas fa-shield-alt mr-3"></i>Panel Admina
                </a>
                <a href="/employee.html" class="bg-orange-600 hover:bg-orange-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg">
                    <i class="fas fa-user-tie mr-3"></i>Panel Pracownika
                </a>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recordings', recordingRoutes);

// Socket.io dla real-time updates
io.on('connection', (socket) => {
  console.log('Użytkownik połączony:', socket.id);
  
  socket.on('join-employee-room', (employeeId) => {
    socket.join(`employee-${employeeId}`);
    console.log(`Pracownik ${employeeId} dołączył do pokoju`);
  });
  
  socket.on('disconnect', () => {
    console.log('Użytkownik rozłączony:', socket.id);
  });
});

// Przekaż io do routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Połączenie z MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-call-manager', {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  bufferCommands: false,
})
.then(() => {
  console.log('✅ Połączono z MongoDB Atlas');
})
.catch((error) => {
  console.error('❌ Błąd połączenia z MongoDB:', error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Wystąpił błąd serwera',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint nie znaleziony' 
  });
});

const PORT =  3006;

server.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
  console.log(`📱 Panel pracownika: http://localhost:${PORT}/employee`);
  console.log(`👨‍💼 Panel admina: http://localhost:${PORT}/admin`);
});
