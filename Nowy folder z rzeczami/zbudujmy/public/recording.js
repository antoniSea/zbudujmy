// System nagrywania rozmów
class CallRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
    }

    async startRecording() {
        try {
            // Sprawdź czy przeglądarka obsługuje MediaRecorder
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Przeglądarka nie obsługuje nagrywania');
            }

            // Poproś o dostęp do mikrofonu
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });

            // Utwórz MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.recordingStartTime = new Date();

            // Obsługa danych nagrania
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Obsługa zakończenia nagrania
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            // Rozpocznij nagrywanie
            this.mediaRecorder.start(1000); // Zbieraj dane co sekundę
            this.isRecording = true;

            console.log('🎤 Nagrywanie rozpoczęte');
            return true;

        } catch (error) {
            console.error('❌ Błąd rozpoczęcia nagrywania:', error);
            throw error;
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Zatrzymaj wszystkie ścieżki audio
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            console.log('🛑 Nagrywanie zatrzymane');
            
            // Poczekaj na zakończenie nagrywania i zapisz
            return new Promise((resolve) => {
                this.mediaRecorder.onstop = async () => {
                    const url = await this.saveRecording();
                    resolve(url);
                };
            });
        }
        return null;
    }

    async saveRecording() {
        console.log('🎤 Zaczynam zapisywanie nagrania...');
        console.log('📊 Liczba chunków:', this.audioChunks.length);
        
        if (this.audioChunks.length === 0) {
            console.log('⚠️ Brak danych do zapisania');
            return null;
        }

        try {
            // Utwórz blob z nagranych danych
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log('📁 Rozmiar pliku:', audioBlob.size, 'bytes');
            
            // Utwórz formularz do wysłania pliku
            const formData = new FormData();
            const fileName = `recording_${Date.now()}.webm`;
            formData.append('recording', audioBlob, fileName);
            formData.append('duration', Math.floor((new Date() - this.recordingStartTime) / 1000));

            console.log('📤 Wysyłam nagranie do serwera...');
            
            // Wyślij do serwera
            const response = await fetch('/api/recordings/upload-recording', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();
            console.log('📥 Odpowiedź serwera:', result);
            
            if (result.success) {
                console.log('✅ Nagranie zapisane:', result.recordingUrl);
                return result.recordingUrl;
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('❌ Błąd zapisywania nagrania:', error);
            return null;
        }
    }

    getRecordingDuration() {
        if (this.recordingStartTime) {
            return Math.floor((new Date() - this.recordingStartTime) / 1000);
        }
        return 0;
    }

    isCurrentlyRecording() {
        return this.isRecording;
    }
}

// Eksportuj dla użycia w innych plikach
window.CallRecorder = CallRecorder;
