const express = require('express');
const path = require('path');
const db = require('./database'); // Importiamo le nostre funzioni del database

// =========================================================================
//           ✅ CHIAVE SEGRETA DI STRIPE INSERITA ✅
// =========================================================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// =========================================================================
//           ✅ CHIAVE SEGRETA DEL WEBHOOK INSERITA ✅
// =========================================================================
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
const PORT = 3000;

// Il webhook di Stripe ha bisogno del corpo "grezzo" della richiesta per la verifica
// quindi questo middleware deve venire PRIMA di app.use(express.json())
app.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`❌ Errore nella verifica della firma del webhook:`, err.message);
        return res.sendStatus(400);
    }
    
    // Gestisce l'evento "checkout.session.completed"
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        // Recuperiamo il tierId che abbiamo salvato nei metadati!
        const tierId = session.metadata.tierId;

        if (tierId) {
            console.log(`✅ Pagamento riuscito per il livello: ${tierId}`);
            
            try {
                await db.incrementCount(tierId);
                console.log(`📈 Contatore incrementato per ${tierId}`);
            } catch(err) {
                console.error("Errore durante l'aggiornamento del database:", err.message);
            }
        }
    }

    res.json({received: true});
});

// Adesso possiamo usare il middleware JSON per tutte le altre route
app.use(express.json());
app.use(express.static(__dirname));

// ROUTE: /create-checkout-session (MODIFICATA per includere i metadati)
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { price, tierId, dropdownText } = req.body;
        if (!price || !tierId || !dropdownText) {
            return res.status(400).json({ error: 'Dati mancanti per la sessione di pagamento.' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Paytozee: The Curiosity Counter',
                            description: `Access to see the count for: ${dropdownText}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // !! IMPORTANTE: Salviamo il tierId nei metadati !!
            // In questo modo, il webhook saprà quale contatore incrementare.
            metadata: {
                tierId: tierId 
            },
            success_url: `http://localhost:${PORT}/success.html?tierId=${tierId}`,
            cancel_url: `http://localhost:${PORT}/`,
        });
        res.json({ id: session.id });
    } catch (error) {
        console.error("Errore durante la creazione della sessione Stripe:", error.message);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

// NUOVA ROUTE: /get-count/:tierId
// La pagina success.html chiamerà questa route per ottenere il numero aggiornato
app.get('/get-count/:tierId', async (req, res) => {
    try {
        const tierId = req.params.tierId;
        const count = await db.getCount(tierId);
        res.json({ tierId: tierId, count: count });
    } catch (error) {
        console.error("Errore nel recuperare il conteggio:", error.message);
        res.status(500).json({ error: 'Impossibile recuperare il conteggio.' });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server Paytozee in ascolto su http://localhost:${PORT}`);
});