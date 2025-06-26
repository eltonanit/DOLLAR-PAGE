const stripe = Stripe('pk_test_51QNJQe2K4Rvit6akUzYXtwt8QOhL8OUxgrpvCWW3topeqp2mej3a42LHbJGMkZ71vmzQwmcVCS6COZ03HSKtSouC002DSmcHL1');

const tiers = [
    { value: 1, tierId: '1_dollar', displayText: 'A DOLLAR', menuText: 'How many paid 1$', linkText: '1$' },
    { value: 10, tierId: '10_dollars', displayText: '10 DOLLARS', menuText: 'How many paid 10$', linkText: '10$' },
    { value: 100, tierId: '100_dollars', displayText: '100 DOLLARS', menuText: 'How many paid 100$', linkText: '100$' },
    { value: 1000, tierId: '1000_dollars', displayText: '1,000 DOLLARS', menuText: 'How many paid 1,000$', linkText: '1,000$' },
    { value: 10000, tierId: '10000_dollars', displayText: '10,000 DOLLARS', menuText: 'How many paid 10,000$', linkText: '10,000$' },
    { value: 100000, tierId: '100000_dollars', displayText: '100,000 DOLLARS', menuText: 'How many paid 100,000$', linkText: '100,000$' },
    { value: 999999, tierId: '1M_dollars', displayText: '1 MILLION DOLLARS', menuText: 'How many paid 1,000,000$', linkText: '1 Million $$$' }
];

// Elementi UI Principali
const priceText1 = document.getElementById('price-text-1');
const priceText2 = document.getElementById('price-text-2');

// MODIFICA: Selezioniamo tutti i pulsanti Stripe tramite la loro classe
const stripeButtons = document.querySelectorAll('.stripe-button');

// Elementi Menu Mobile (a tendina)
const menuToggle = document.getElementById('menu-toggle');
const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
const mobileMenuItemsList = document.getElementById('mobile-menu-items-list');

// Elementi Menu Desktop (orizzontale)
const desktopNavLinks = document.getElementById('desktop-nav-links');

// FUNZIONE CENTRALE: Aggiorna il contenuto della pagina
function updatePageContent(selectedTierId) {
    const selectedTier = tiers.find(tier => tier.tierId === selectedTierId);
    if (!selectedTier) return;

    priceText1.textContent = selectedTier.displayText;
    priceText2.textContent = selectedTier.displayText;
    
    // MODIFICA: Aggiorniamo i dati su TUTTI i pulsanti
    stripeButtons.forEach(button => {
        button.dataset.price = selectedTier.value;
        button.dataset.tierId = selectedTier.tierId;
        button.dataset.dropdownText = `${selectedTier.menuText}? Find out now.`;
    });

    // Aggiorna anche il menu desktop per riflettere la nuova selezione
    updateDesktopNav(selectedTierId);
}

// Funzione per popolare il menu a tendina MOBILE
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

// Funzione per popolare il menu DESKTOP
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

// Funzione per aprire/chiudere il menu a tendina MOBILE
function toggleMobileMenu() {
    menuToggle.classList.toggle('is-active');
    mobileDropdownMenu.classList.toggle('is-open');
}

// Funzione per impostare tutti gli "ascoltatori di eventi"
function setupEventListeners() {
    // Menu Mobile
    menuToggle.addEventListener('click', toggleMobileMenu);
    mobileMenuItemsList.addEventListener('click', (event) => {
        event.preventDefault();
        const linkElement = event.target.closest('a');
        if (linkElement && linkElement.dataset.tierId) {
            updatePageContent(linkElement.dataset.tierId);
            if (mobileDropdownMenu.classList.contains('is-open')) {
                toggleMobileMenu();
            }
        }
    });

    // Menu Desktop
    desktopNavLinks.addEventListener('click', (event) => {
        event.preventDefault();
        const linkElement = event.target.closest('a');
        if (linkElement && linkElement.dataset.tierId) {
            updatePageContent(linkElement.dataset.tierId);
        }
    });
    
    // MODIFICA: Aggiungiamo l'event listener a TUTTI i pulsanti Stripe
    stripeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const price = button.dataset.price;
            const tierId = button.dataset.tierId;
            const dropdownText = button.dataset.dropdownText;
            try {
                const response = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ price: parseFloat(price), tierId, dropdownText }),
                });
                const session = await response.json();
                if (session.id) {
                    stripe.redirectToCheckout({ sessionId: session.id });
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });
}

// Funzione di Inizializzazione della pagina
function initializePage() {
    populateMobileMenu();
    
    const urlParams = new URLSearchParams(window.location.search);
    const tierIdFromUrl = urlParams.get('tierId');
    const initialTier = tiers.find(t => t.tierId === tierIdFromUrl) || tiers[0];
    
    if (initialTier) {
        updatePageContent(initialTier.tierId);
    }
    
    setupEventListeners();
}

// Avvio
initializePage();