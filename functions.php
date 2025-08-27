<script>
    // Funkcja do przeniesienia okresu dzierżawy na górę i wyliczania abonamentu
function setupLeaseCalculator() {
    console.log('Uruchamianie kalkulatora dzierżawy...');
    
    // Znajdź elementy
    const abonamentContainer = document.querySelector('[data-id="bf8fa57"]');
    const abonamentPrice = document.querySelector('[data-id="474a8fe"]');
    const leasePeriodRow = document.querySelector('tr:has(#pa_okres-dzierzawy)');
    const leasePeriodSelect = document.getElementById('pa_okres-dzierzawy');
    const variationsForm = document.querySelector('.variations_form');
    // Dodaj referencję do całkowitego kosztu urządzenia
    const totalCostElement = document.querySelector('.elementor-element-f7c0106 .woocommerce-Price-amount.amount');
    // Dodaj referencję do miejsca, gdzie wstrzyknąć abonament
    const primaryPriceElement = document.querySelector('#primary_price .woocommerce-Price-amount.amount');

    console.log('Znalezione elementy:', {
        abonamentContainer: !!abonamentContainer,
        abonamentPrice: !!abonamentPrice,
        leasePeriodRow: !!leasePeriodRow,
        leasePeriodSelect: !!leasePeriodSelect,
        variationsForm: !!variationsForm,
        totalCostElement: !!totalCostElement,
        primaryPriceElement: !!primaryPriceElement
    });
    
    if (!abonamentContainer || !leasePeriodSelect || !abonamentPrice) {
        console.error('Nie znaleziono wymaganych elementów');
        return;
    }
    
    // Przeniesienie okresu dzierżawy na górę
    function moveLeasePeriodToTop() {
        console.log('Sprawdzanie przeniesienia okresu dzierżawy');
        
        // Sprawdź czy już istnieje visual-lease-select w HTML
        let visualSelect = document.getElementById('visual-lease-select');
        
        if (!visualSelect) {
            console.log('Tworzenie nowego visual-lease-select');
            
            // Znajdź kontener rodzicielski
            const parentContainer = abonamentContainer.parentElement;
            
            if (!parentContainer) {
                console.error('Nie znaleziono kontenera rodzicielskiego');
                return;
            }
            
            // Utwórz nowy wiersz dla okresu dzierżawy
            const newLeasePeriodRow = document.createElement('div');
            newLeasePeriodRow.className = abonamentContainer.className;
            newLeasePeriodRow.setAttribute('data-id', 'lease-period-row');
            
            newLeasePeriodRow.innerHTML = `
                <div class="elementor-element elementor-widget__width-initial elementor-widget elementor-widget-text-editor">
                    <p>Okres dzierżawy</p>
                </div>
                <div class="elementor-element e-con-full e-flex e-con e-child">
                    <div class="elementor-element elementor-widget elementor-widget-text-editor">
                        <select id="visual-lease-select">
                            <option value="">Wybierz opcję</option>
                            <option value="12-miesiace">12 miesiące</option>
                            <option value="24-miesiace">24 miesiące</option>
                            <option value="48-miesiace">48 miesiące</option>
                            <option value="platnosc-jednorazowa">Płatność jednorazowa</option>
                        </select>
                    </div>
                </div>
            `;
            
            // Wstaw jako pierwszy element
            parentContainer.insertBefore(newLeasePeriodRow, parentContainer.firstChild);
            visualSelect = document.getElementById('visual-lease-select');
            console.log('Nowy element dodany');
        } else {
            console.log('Visual-lease-select już istnieje w HTML');
        }
        
        if (visualSelect) {
            // Usuń poprzednie event listenery aby uniknąć duplikacji
            visualSelect.replaceWith(visualSelect.cloneNode(true));
            visualSelect = document.getElementById('visual-lease-select');
            
            // Synchronizuj z oryginalnym selectem
            visualSelect.addEventListener('change', function() {
                console.log('Visual select zmieniony na:', this.value);
                leasePeriodSelect.value = this.value;
                const changeEvent = new Event('change', { bubbles: true });
                leasePeriodSelect.dispatchEvent(changeEvent);
                setTimeout(calculateSubscription, 300);
            });
            
            leasePeriodSelect.addEventListener('change', function() {
                console.log('Oryginalny select zmieniony na:', this.value);
                if (visualSelect.value !== this.value) {
                    visualSelect.value = this.value;
                    setTimeout(calculateSubscription, 100);
                }
            });
        }
        
        // Ukryj oryginalny wiersz jeśli istnieje
        if (leasePeriodRow) {
            leasePeriodRow.style.display = 'none';
        }
        
        return visualSelect;
    }
    
    // Funkcja do wyliczania abonamentu
    function calculateSubscription() {
        console.log('Rozpoczynam obliczanie abonamentu');
        
        const selectedPeriod = leasePeriodSelect.value;
        console.log('Wybrany okres:', selectedPeriod);
        
        let totalPrice = 0;

        // Całkowity koszt urządzenia - tylko z elementu .elementor-element-f7c0106
        if (totalCostElement) {
            const priceText = totalCostElement.textContent || totalCostElement.innerText || '';
            // Wyciągnij liczbę z tekstu, np. "3,120.00zł"
            const parsedPrice = parseFloat(
                priceText
                    .replace(/[^\d.,]/g, '') // usuwa wszystko poza cyframi, przecinkiem i kropką
                    .replace(',', '')        // usuwa separator tysięcy
            );
            if (!isNaN(parsedPrice) && parsedPrice > 0) {
                totalPrice = parsedPrice;
                console.log('Całkowity koszt urządzenia z .elementor-element-f7c0106:', totalPrice);
            }
        }

        // Fallback - jeśli nie znaleziono, użyj 1599 zł
        if (!totalPrice) {
            totalPrice = 1599;
            console.log('Użyto fallback ceny:', totalPrice);
        }
        
        // Oblicz abonament na podstawie wybranego okresu lub domyślnie 12 miesięcy
        let months = 12; // Domyślnie 12 miesięcy
        let showDefault = false;
        let abonamentValue = '';

        if (!selectedPeriod || selectedPeriod === '') {
            console.log('Brak wybranego okresu, obliczam dla 12 miesięcy');
            showDefault = true;
        } else {
            switch(selectedPeriod) {
                case '12-miesiace':
                    months = 12;
                    break;
                case '24-miesiace':
                    months = 24;
                    break;
                case '48-miesiace':
                    months = 48;
                    break;
                case 'platnosc-jednorazowa':
                    console.log('Płatność jednorazowa - abonament 0 zł');
                    abonamentValue = '0 zł';
                    abonamentPrice.textContent = abonamentValue;
                    // Wstrzykuj to samo do primary_price
                    if (primaryPriceElement) {
                        primaryPriceElement.innerHTML = abonamentValue;
                    }
                    return;
            }
        }
        
        if (isNaN(totalPrice) || totalPrice <= 0) {
            console.log('Nieprawidłowa cena, używam fallback 1599 zł');
            totalPrice = 1599;
        }
        
        const monthlySubscription = totalPrice / months;
        abonamentValue = monthlySubscription.toFixed(2) + ' zł';
        
        console.log(`Obliczenia: ${totalPrice} zł / ${months} miesięcy = ${abonamentValue}`);
        abonamentPrice.textContent = abonamentValue;

        // Wstrzyknij to samo do primary_price, z dopiskiem (miesięcznie) jeśli to abonament miesięczny
        if (primaryPriceElement) {
            // Okresy miesięczne
            const monthlyPeriods = ['12-miesiace', '24-miesiace', '48-miesiace', ''];
            if (monthlyPeriods.includes(selectedPeriod)) {
                // Dodaj dopisek (miesięcznie)
                primaryPriceElement.innerHTML = abonamentValue + ' <span style="font-size:0.9em;color:#888;">(miesięcznie)</span>';
            } else {
                // Płatność jednorazowa lub inne
                primaryPriceElement.innerHTML = abonamentValue;
            }
        }

        // DODANE: Dodaj dopisek (miesięcznie) do #primary_price, jeśli wybrany jest jakikolwiek abonament (czyli nie "platnosc-jednorazowa")
        // (Dla bezpieczeństwa, nawet jeśli HTML się zmieni)
        const primaryPriceDiv = document.getElementById('primary_price');
        if (primaryPriceDiv) {
            // Szukamy span.amount w środku
            const priceSpan = primaryPriceDiv.querySelector('.woocommerce-Price-amount.amount');
            if (priceSpan) {
                // Sprawdź czy wybrany jest abonament (czyli nie "platnosc-jednorazowa")
                if (selectedPeriod !== 'platnosc-jednorazowa') {
                    // Jeśli nie ma już dopisku, dodaj go
                    if (!primaryPriceDiv.innerHTML.includes('(miesięcznie)')) {
                        priceSpan.innerHTML = abonamentValue + ' <span style="font-size:0.9em;color:#888;">(miesięcznie)</span>';
                    }
                } else {
                    // Jeśli płatność jednorazowa, usuń dopisek jeśli istnieje
                    priceSpan.innerHTML = abonamentValue;
                }
            }
        }
    }
    
    // Nasłuchuj zmian w formularzu
    function setupFormListeners() {
        console.log('Konfigurowanie listeners...');
        
        // Observer dla zmian cen
        const priceObserver = new MutationObserver(function(mutations) {
            let shouldRecalculate = false;
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldRecalculate = true;
                }
            });
            if (shouldRecalculate) {
                console.log('Wykryto zmianę ceny, przeliczam...');
                setTimeout(calculateSubscription, 200);
            }
        });
        
        // Obserwuj różne kontenery z cenami
        const priceContainers = [
            '.woocommerce-variation-price',
            '.single_variation',
            '#var_price',
            '#primary_price',
            '[data-id="87cda76"]'
        ];
        
        priceContainers.forEach(selector => {
            const container = document.querySelector(selector);
            if (container) {
                console.log('Obserwuję kontener:', selector);
                priceObserver.observe(container, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
        });
        
        // Listener dla wszystkich selectów w formularzu
        if (variationsForm) {
            const allSelects = variationsForm.querySelectorAll('select');
            allSelects.forEach(select => {
                select.addEventListener('change', function() {
                    console.log('Select zmieniony:', select.id, 'na:', this.value);
                    setTimeout(calculateSubscription, 300);
                });
            });
        }
        
        // jQuery events jeśli dostępne
        if (typeof jQuery !== 'undefined') {
            console.log('Konfigurowanie jQuery events...');
            
            jQuery(document).on('found_variation', function(event, variation) {
                console.log('WooCommerce found_variation event', variation);
                setTimeout(calculateSubscription, 100);
            });
            
            jQuery(document).on('reset_data', function(event) {
                console.log('WooCommerce reset_data event');
                setTimeout(() => {
                    abonamentPrice.textContent = '199 zł';
                    if (primaryPriceElement) {
                        // Domyślnie po resecie pokazuj "199 zł (miesięcznie)"
                        primaryPriceElement.innerHTML = '199 zł <span style="font-size:0.9em;color:#888;">(miesięcznie)</span>';
                    }
                    // DODANE: Po resecie również ustaw dopisek (miesięcznie) w #primary_price
                    const primaryPriceDiv = document.getElementById('primary_price');
                    if (primaryPriceDiv) {
                        const priceSpan = primaryPriceDiv.querySelector('.woocommerce-Price-amount.amount');
                        if (priceSpan) {
                            priceSpan.innerHTML = '199 zł <span style="font-size:0.9em;color:#888;">(miesięcznie)</span>';
                        }
                    }
                }, 100);
            });
        }
    }
    
    // Inicjalizacja
    function init() {
        try {
            console.log('Inicjalizacja kalkulatora...');
            const visualSelect = moveLeasePeriodToTop();
            setupFormListeners();
            
            // Pierwotne obliczenie z opóźnieniem
            setTimeout(() => {
                calculateSubscription();
                console.log('Kalkulator dzierżawy uruchomiony pomyślnie');
            }, 1000);
            
        } catch (error) {
            console.error('Błąd inicjalizacji kalkulatora:', error);
        }
    }
    
    // Uruchom inicjalizację
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Jeśli jQuery jest dostępne, użyj go
        if (typeof jQuery !== 'undefined') {
            jQuery(document).ready(init);
        } else {
            // W przeciwnym razie uruchom z opóźnieniem
            setTimeout(init, 500);
        }
    }
}

// Uruchom skrypt
console.log('Ładowanie kalkulatora dzierżawy...');
setupLeaseCalculator();
</script>