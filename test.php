



/**
 * WooCommerce - Walidacja okresu dzierżawy w koszyku
 * Dodaj ten kod do functions.php swojego motywu lub do pluginu
 */

// Funkcja normalizująca okresy dzierżawy dla porównania
function normalize_lease_period($period) {
    if (empty($period)) {
        return '';
    }
    
    // Trim i konwersja na małe litery
    $normalized = trim(strtolower($period));
    
    // Usuń wszystkie myślniki, podkreślenia, spacje
    $normalized = preg_replace('/[-_\s]+/', '', $normalized);
    
    // Zamień różne końcówki na standardowe
    $patterns = [
        '/miesiace$/' => 'miesiecy',
        '/miesiac$/' => 'miesiecy', 
        '/miesięce$/' => 'miesiecy',
        '/miesiąc$/' => 'miesiecy',
        '/months?$/' => 'miesiecy',
        '/mths?$/' => 'miesiecy',
        '/lata?$/' => 'lat',
        '/roku?$/' => 'lat',
        '/years?$/' => 'lat'
    ];
    
    foreach ($patterns as $pattern => $replacement) {
        $normalized = preg_replace($pattern, $replacement, $normalized);
    }
    
    // DEBUG - usuń po sprawdzeniu
    error_log("Normalize: '$period' -> '$normalized'");
    
    return $normalized;
}

// Walidacja przy dodawaniu produktu do koszyka
add_filter('woocommerce_add_to_cart_validation', 'validate_lease_period_in_cart', 10, 3);

function validate_lease_period_in_cart($passed, $product_id, $quantity) {
    // Sprawdź czy produkt ma atrybut "Okres dzierżawy"
    $product = wc_get_product($product_id);
    
    if (!$product) {
        return $passed;
    }
    
    // Pobierz wybrany okres dzierżawy z danych POST (z formularza produktu)
    $selected_lease_period = '';
    
    if (isset($_POST['attribute_pa_okres-dzierzawy'])) {
        $selected_lease_period = sanitize_text_field($_POST['attribute_pa_okres-dzierzawy']);
    } elseif (isset($_POST['attribute_okres-dzierzawy'])) {
        $selected_lease_period = sanitize_text_field($_POST['attribute_okres-dzierzawy']);
    }
    
    // Jeśli nie ma wybranego okresu dzierżawy, kontynuuj
    if (empty($selected_lease_period)) {
        return $passed;
    }
    
    // Sprawdź produkty już w koszyku
    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
        $cart_product_id = $cart_item['product_id'];
        $cart_variation_id = $cart_item['variation_id'];
        
        // Pobierz okres dzierżawy z produktu w koszyku
        $cart_lease_period = '';
        
        if ($cart_variation_id) {
            // Dla wariantów produktu
            $variation = wc_get_product($cart_variation_id);
            $cart_lease_period = $variation->get_attribute('pa_okres-dzierzawy') ?: $variation->get_attribute('okres-dzierzawy');
        } else {
            // Dla zwykłych produktów
            $cart_product = wc_get_product($cart_product_id);
            $cart_lease_period = $cart_product->get_attribute('pa_okres-dzierzawy') ?: $cart_product->get_attribute('okres-dzierzawy');
        }
        
        // Sprawdź czy są różne okresy dzierżawy (z normalizacją i debugowaniem)
        if (!empty($cart_lease_period)) {
            $normalized_cart = normalize_lease_period($cart_lease_period);
            $normalized_selected = normalize_lease_period($selected_lease_period);
            
            // DEBUG - usuń po sprawdzeniu
            error_log("Cart period: '$cart_lease_period' -> normalized: '$normalized_cart'");
            error_log("Selected period: '$selected_lease_period' -> normalized: '$normalized_selected'");
            
            if ($normalized_cart !== $normalized_selected) {
                            wc_add_notice(
                    sprintf(
                        __('Nie możesz dodać tego produktu do koszyka. W koszyku masz już produkty z okresem dzierżawy "%s", a wybierasz "%s". Wszystkie produkty muszą mieć ten sam okres dzierżawy. Złóż osobne zamówienia lub zmień okres dzierżawy.', 'textdomain'),
                        $cart_lease_period,
                        $selected_lease_period
                    ),
                    'error'
                );
                return false;
            }
        }
        
    }
    
    return $passed;
}

// Walidacja przy aktualizacji koszyka (zmiana ilości lub atrybutów)
add_action('woocommerce_check_cart_items', 'validate_cart_lease_periods');

function validate_cart_lease_periods() {
    $lease_periods = array();
    
    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
        $product_id = $cart_item['product_id'];
        $variation_id = $cart_item['variation_id'];
        
        // Pobierz okres dzierżawy
        $lease_period = '';
        
        if ($variation_id) {
            $variation = wc_get_product($variation_id);
            $lease_period = $variation->get_attribute('pa_okres-dzierzawy') ?: $variation->get_attribute('okres-dzierzawy');
        } else {
            $product = wc_get_product($product_id);
            $lease_period = $product->get_attribute('pa_okres-dzierzawy') ?: $product->get_attribute('okres-dzierzawy');
        }
        
        if (!empty($lease_period)) {
            $lease_periods[] = $lease_period;
        }
    }
    
    // Sprawdź czy wszystkie okresy są takie same (z normalizacją)
    $normalized_periods = array_map('normalize_lease_period', $lease_periods);
    $unique_periods = array_unique($normalized_periods);
    
    if (count($unique_periods) > 1) {
        wc_add_notice(
            sprintf(
                __('W koszyku masz produkty z różnymi okresami dzierżawy (%s). Wszystkie produkty muszą mieć ten sam okres dzierżawy. Usuń niektóre produkty lub złóż osobne zamówienia.', 'textdomain'),
                implode(', ', $unique_periods)
            ),
            'error'
        );
    }
}

// Dodatkowa walidacja przed przejściem do checkout
add_action('woocommerce_checkout_process', 'validate_checkout_lease_periods');

function validate_checkout_lease_periods() {
    $lease_periods = array();
    
    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
        $product_id = $cart_item['product_id'];
        $variation_id = $cart_item['variation_id'];
        
        $lease_period = '';
        
        if ($variation_id) {
            $variation = wc_get_product($variation_id);
            $lease_period = $variation->get_attribute('pa_okres-dzierzawy') ?: $variation->get_attribute('okres-dzierzawy');
        } else {
            $product = wc_get_product($product_id);
            $lease_period = $product->get_attribute('pa_okres-dzierzawy') ?: $product->get_attribute('okres-dzierzawy');
        }
        
        if (!empty($lease_period)) {
            $lease_periods[] = $lease_period;
        }
    }
    
    $normalized_periods = array_map('normalize_lease_period', $lease_periods);
    $unique_periods = array_unique($normalized_periods);
    
    if (count($unique_periods) > 1) {
        wc_add_notice(
            __('Nie można złożyć zamówienia. Produkty w koszyku mają różne okresy dzierżawy. Usuń niektóre produkty lub złóż osobne zamówienia.', 'textdomain'),
            'error'
        );
    }
}

// Opcjonalnie: Dodaj informację o okresie dzierżawy w koszyku
add_filter('woocommerce_get_item_data', 'display_lease_period_in_cart', 10, 2);

function display_lease_period_in_cart($item_data, $cart_item) {
    $product_id = $cart_item['product_id'];
    $variation_id = $cart_item['variation_id'];
    
    $lease_period = '';
    
    if ($variation_id) {
        $variation = wc_get_product($variation_id);
        $lease_period = $variation->get_attribute('pa_okres-dzierzawy') ?: $variation->get_attribute('okres-dzierzawy');
    } else {
        $product = wc_get_product($product_id);
        $lease_period = $product->get_attribute('pa_okres-dzierzawy') ?: $product->get_attribute('okres-dzierzawy');
    }
    
    if (!empty($lease_period)) {
        $item_data[] = array(
            'key'     => __('Okres dzierżawy', 'textdomain'),
            'value'   => $lease_period,
            'display' => ''
        );
    }
    
    return $item_data;
}

// CSS dla lepszego wyświetlania komunikatów (dodaj do style.css)
?>
<style>
.woocommerce-message,
.woocommerce-error,
.woocommerce-info {
    padding: 1em 1.618em;
    margin: 0 0 2em;
    position: relative;
    background-color: #f7f6f7;
    color: #515151;
    border-top: 3px solid #a46497;
    list-style: none !important;
}

.woocommerce-error {
    border-top-color: #b81c23;
    background-color: #ffe6e7;
    color: #b81c23;
}

.lease-period-info {
    background: #e7f3ff;
    border: 1px solid #b3d9ff;
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
}
</style>

