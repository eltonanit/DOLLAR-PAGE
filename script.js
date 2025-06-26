const stripe = Stripe('pk_live_51ReEzOLpO3xj2xwl7lJ3ya1IdjO4e3lECl4CK5mXUCLBg0RwyvbXTiQq0RSeIgaLn9DrwH6cDQfJy7ODVMfDUUSo00986ugpUO');

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
const stripeButtons = document.querySelectorAll('.stripe-button');

// Elementi Menu Mobile (a tendina)
const menuToggle = document.getElementById('menu-toggle');
const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
const mobileMenuItemsList = document.getElementById('mobile-menu-items-list');

// Elementi Menu Desktop (orizzontale)
const desktopNavLinks = document.getElementById('desktop-nav-links');

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

function toggleMobileMenu() {
    menuToggle.classList.toggle('is-active');
    mobileDropdownMenu.classList.toggle('is-open');
}

function setupEventListeners() {
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

    desktopNavLinks.addEventListener('click', (event) => {
        event.preventDefault();
        const linkElement = event.target.closest('a');
        if (linkElement && linkElement.dataset.tierId) {
            updatePageContent(linkElement.dataset.tierId);
        }
    });
    
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
                
                // Aggiungiamo un controllo per l'errore 404
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const session = await response.json();
                if (session.id) {
                    stripe.redirectToCheckout({ sessionId: session.id });
                }
            } catch (error) {
                // Modifichiamo il log dell'errore per essere più specifici
                console.error('Error during checkout session creation:', error);
            }
        });
    });
}

// NUOVO - Funzione per caricare i conteggi iniziali dal server
async function loadInitialCounts() {
    try {
        const response = await fetch('/get-count');
        if (!response.ok) {
            throw new Error(`Network response was not ok for /get-count. Status: ${response.status}`);
        }
        const counts = await response.json();
        console.log('Initial counts loaded successfully:', counts);
        // Qui potresti aggiungere la logica per mostrare i conteggi se lo desideri
    } catch (error) {
        console.error('Failed to load initial counts:', error);
    }
}

function initializePage() {
    populateMobileMenu();
    
    const urlParams = new URLSearchParams(window.location.search);
    const tierIdFromUrl = urlParams.get('tierId');
    const initialTier = tiers.find(t => t.tierId === tierIdFromUrl) || tiers[0];
    
    if (initialTier) {
        updatePageContent(initialTier.tierId);
    }
    
    setupEventListeners();

    // NUOVO - Chiamiamo la funzione per caricare i conteggi all'avvio
    loadInitialCounts(); 
}

initializePage();