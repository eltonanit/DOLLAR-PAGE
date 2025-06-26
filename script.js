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

// Elementi UI
const priceText1 = document.getElementById('price-text-1');
const priceText2 = document.getElementById('price-text-2');
const stripeButton = document.getElementById('stripe-button');
// Elementi Menu Mobile
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const mobileMenu = document.getElementById('mobile-menu');
const menuItemsList = document.getElementById('menu-items-list');
// Elementi Menu Desktop
const desktopNavLinks = document.getElementById('desktop-nav-links');

// FUNZIONE CENTRALE: Aggiorna il contenuto della pagina
function updatePageContent(selectedTierId) {
    const selectedTier = tiers.find(tier => tier.tierId === selectedTierId);
    if (!selectedTier) return;

    priceText1.textContent = selectedTier.displayText;
    priceText2.textContent = selectedTier.displayText;
    stripeButton.dataset.price = selectedTier.value;
    stripeButton.dataset.tierId = selectedTier.tierId;
    stripeButton.dataset.dropdownText = `${selectedTier.menuText}? Find out now.`;

    // Dopo aver aggiornato la pagina, aggiorna anche i link "See also:"
    updateDesktopNav(selectedTierId);
}

// Funzione per popolare il menu a comparsa (Mobile) - AGGIORNATA
function populateSideMenu() {
    menuItemsList.innerHTML = ''; // Pulisce il menu

    // Aggiungiamo un titolo "See also:"
    const titleItem = document.createElement('li');
    titleItem.classList.add('menu-title'); // Aggiungiamo una classe per lo stile
    titleItem.textContent = 'See also who paid:';
    menuItemsList.appendChild(titleItem);

    // Creiamo i link per ogni livello
    tiers.forEach(tier => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.tierId = tier.tierId;

        // Creiamo il testo con lo span per il dollaro verde
        const textContent = tier.linkText.replace(/\s?\${1,3}$/, '');
        const dollarSign = tier.linkText.includes('$$$') ? '$$$' : '$';
        link.innerHTML = `${textContent}<span class="dollar-sign">${dollarSign}</span>`;
        
        listItem.appendChild(link);
        menuItemsList.appendChild(listItem);
    });
}

// =====================================================================
//           ⬇️ QUESTA È LA FUNZIONE CHE ABBIAMO CORRETTO ⬇️
// =====================================================================
// Funzione per aggiornare il menu di navigazione desktop ("See also")
function updateDesktopNav(currentTierId) {
    desktopNavLinks.innerHTML = ''; // Pulisce i link precedenti
    tiers
        .filter(t => t.tierId !== currentTierId) // Mostra tutti i livelli TRANNE quello attuale
        .forEach(tier => {
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.tierId = tier.tierId;

            // Dividiamo il testo dal simbolo del dollaro
            // Questa espressione regolare rimuove '$' o '$$$' alla fine del testo
            const textContent = tier.linkText.replace(/\s?\${1,3}$/, ''); 
            const dollarSign = tier.linkText.includes('$$$') ? '$$$' : '$';
            
            // Creiamo il contenuto del link con span separati
            // In questo modo il CSS può applicare lo stile solo allo span ".dollar-sign"
            link.innerHTML = `${textContent}<span class="dollar-sign">${dollarSign}</span>`;
            
            desktopNavLinks.appendChild(link);
        });
}
// =====================================================================

// Event Listeners
function setupEventListeners() {
    // Menu Mobile
    menuToggle.addEventListener('click', () => mobileMenu.classList.add('is-open'));
    menuClose.addEventListener('click', () => mobileMenu.classList.remove('is-open'));
    menuItemsList.addEventListener('click', (event) => {
        event.preventDefault();
        const tierId = event.target.dataset.tierId;
        if (tierId) {
            updatePageContent(tierId);
            mobileMenu.classList.remove('is-open');
        }
    });

    // Menu Desktop
    desktopNavLinks.addEventListener('click', (event) => {
        event.preventDefault();
        const tierId = event.target.dataset.tierId;
        // Bisogna controllare se l'elemento cliccato è il link 'a' o lo span interno
        const linkElement = event.target.closest('a');
        if (linkElement && linkElement.dataset.tierId) {
            updatePageContent(linkElement.dataset.tierId);
        }
    });

    // Pulsante Stripe
    stripeButton.addEventListener('click', async () => {
        const price = stripeButton.dataset.price;
        const tierId = stripeButton.dataset.tierId;
        const dropdownText = stripeButton.dataset.dropdownText;
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
}

// Funzione di Inizializzazione
function initializePage() {
    populateSideMenu();
    
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