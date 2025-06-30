// Inizializza Stripe con la tua chiave pubblicabile LIVE
const stripe = Stripe('pk_live_51RfisKE7EuHepzpAVQYjF9ItCjm1JhgHFpfxbcWCpQ7GBJScYC4fxyNKf57Qg5OAqWFdm1nioj25QGnmtoQnYZql00rnKEQTff');

// Definisce i livelli di prezzo e i testi associati
const tiers = [
    { value: 1, tierId: '1_dollar', displayText: 'A DOLLAR', menuText: 'How many paid 1$', linkText: '1$' },
    { value: 10, tierId: '10_dollars', displayText: '10 DOLLARS', menuText: 'How many paid 10$', linkText: '10$' },
    { value: 100, tierId: '100_dollars', displayText: '100 DOLLARS', menuText: 'How many paid 100$', linkText: '100$' },
    { value: 1000, tierId: '1000_dollars', displayText: '1,000 DOLLARS', menuText: 'How many paid 1,000$', linkText: '1,000$' },
    { value: 10000, tierId: '10000_dollars', displayText: '10,000 DOLLARS', menuText: 'How many paid 10,000$', linkText: '10,000$' },
    { value: 100000, tierId: '100000_dollars', displayText: '100,000 DOLLARS', menuText: 'How many paid 100,000$', linkText: '100,000$' },
    { value: 999999, tierId: '1M_dollars', displayText: '1 MILLION DOLLARS', menuText: 'How many paid 1,000,000$', linkText: '1 Million $$$' }
];

// Esegui tutto il codice solo dopo che il DOM è stato caricato
document.addEventListener('DOMContentLoaded', () => {
    
    // Seleziona gli elementi UI una sola volta
    const priceText1 = document.getElementById('price-text-1');
    const priceText2 = document.getElementById('price-text-2');
    const stripeButtons = document.querySelectorAll('.stripe-button');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    const mobileMenuItemsList = document.getElementById('mobile-menu-items-list');
    const desktopNavLinks = document.getElementById('desktop-nav-links');

    // Aggiorna dinamicamente il testo principale e i dati dei pulsanti
    function updatePageContent(selectedTierId) {
        const selectedTier = tiers.find(tier => tier.tierId === selectedTierId);
        if (!selectedTier) return;

        priceText1.textContent = selectedTier.displayText;
        priceText2.textContent = selectedTier.displayText;
        
        stripeButtons.forEach(button => {
            button.dataset.price = selectedTier.value;
            button.dataset.tierId = selectedTier.tierId;
            button.dataset.dropdownText = `${selectedTier.menuText}? Find out now.`;
        });

        updateDesktopNav(selectedTierId);
    }

    // Popola il menu a tendina per dispositivi mobili
    function populateMobileMenu() {
        mobileMenuItemsList.innerHTML = '';
        tiers.forEach(tier => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.tierId = tier.tierId;
            const phrase = "How many paid ";
            const priceText = tier.linkText.replace(/\s?\${1,3}$/, '');
            const dollarSign = tier.linkText.includes('$$$') ? '$$$' : '$';
            link.innerHTML = `${phrase}<strong>${priceText}</strong><span class="dollar-sign">${dollarSign}</span>`;
            listItem.appendChild(link);
            mobileMenuItemsList.appendChild(listItem);
        });
    }

    // Aggiorna la navigazione desktop, mostrando solo gli altri livelli
    function updateDesktopNav(currentTierId) {
        desktopNavLinks.innerHTML = '';
        tiers
            .filter(t => t.tierId !== currentTierId)
            .forEach(tier => {
                const link = document.createElement('a');
                link.href = '#';
                link.dataset.tierId = tier.tierId;
                const textContent = tier.linkText.replace(/\s?\${1,3}$/, '');
                const dollarSign = tier.linkText.includes('$$$') ? '$$$' : '$';
                link.innerHTML = `${textContent}<span class="dollar-sign">${dollarSign}</span>`;
                desktopNavLinks.appendChild(link);
            });
    }

    // Imposta tutti gli "ascoltatori di eventi" della pagina
    function setupEventListeners() {
        // Gestisce l'apertura/chiusura del menu mobile
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('is-active');
            mobileDropdownMenu.classList.toggle('is-open');
        });

        // Gestore unico per i click sui link di navigazione (mobile e desktop)
        const navClickHandler = (event) => {
            event.preventDefault();
            const linkElement = event.target.closest('a');
            if (linkElement && linkElement.dataset.tierId) {
                updatePageContent(linkElement.dataset.tierId);
                // Chiude il menu mobile se è aperto dopo un click
                if (mobileDropdownMenu.classList.contains('is-open')) {
                    menuToggle.classList.remove('is-active');
                    mobileDropdownMenu.classList.remove('is-open');
                }
            }
        };

        mobileMenuItemsList.addEventListener('click', navClickHandler);
        desktopNavLinks.addEventListener('click', navClickHandler);
        
        // Aggiunge l'evento di pagamento a tutti i pulsanti Stripe
        stripeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const price = button.dataset.price;
                const tierId = button.dataset.tierId;
                const dropdownText = button.dataset.dropdownText;
                try {
                    // *** LA CORREZIONE FINALE È QUI ***
                    // Chiama la rotta API corretta per creare la sessione di checkout
                    const response = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ price: parseFloat(price), tierId, dropdownText }),
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const session = await response.json();
                    if (session.id) {
                        stripe.redirectToCheckout({ sessionId: session.id });
                    }
                } catch (error) {
                    console.error('Error during checkout session creation:', error);
                }
            });
        });
    }

    // --- Funzione di Inizializzazione ---
    function initializePage() {
        populateMobileMenu();
        // Inizializza la pagina con il primo livello di prezzo come predefinito
        const initialTier = tiers[0];
        if (initialTier) {
            updatePageContent(initialTier.tierId);
        }
        setupEventListeners();
    }

    // Avvia l'applicazione
    initializePage();
});