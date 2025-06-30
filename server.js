const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

const ALL_TIERS = ['1_dollar', '10_dollars', '100_dollars', '1000_dollars', '10000_dollars', '100000_dollars', '1M_dollars'];

// Funzione di inizializzazione
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS counters (
                    "tierId" TEXT PRIMARY KEY,
                    count INTEGER NOT NULL DEFAULT 0
                );
            `);
            for (const tierId of ALL_TIERS) {
                await client.query('INSERT INTO counters ("tierId", count) VALUES ($1, 0) ON CONFLICT ("tierId") DO NOTHING', [tierId]);
            }
            console.log('Database initialized successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('DATABASE INITIALIZATION FAILED:', err);
    }
}
initializeDatabase();

const app = express();

// Webhook
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    // ... codice webhook identico ...
    const sig = request.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
    } catch (err) {
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const tierId = session.metadata.tierId;
        if (tierId) {
            await pool.query('UPDATE counters SET count = count + 1 WHERE "tierId" = $1', [tierId]);
        }
    }
    response.json({ received: true });
});

app.use(express.json());

// Create Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
    // ... codice checkout identico ...
    const { price, tierId, dropdownText } = req.body;
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Guess Who Paid', description: dropdownText }, unit_amount: Math.round(price * 100) }, quantity: 1 }],
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html?tierId=${tierId}`,
            cancel_url: `${req.headers.origin}/index.html`,
            metadata: { tierId: tierId }
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ***** MODIFICA CHIAVE QUI *****
// Rotta "corazzata" per ottenere i conteggi
app.get('/api/get-count', async (req, res) => {
    try {
        const result = await pool.query('SELECT "tierId", count FROM counters');
        let counts = result.rows.reduce((acc, row) => {
            acc[row.tierId] = row.count;
            return acc;
        }, {});

        // CONTROLLO DI SICUREZZA: se qualche tier manca, lo aggiungiamo ora!
        let needsUpdate = false;
        for (const tierId of ALL_TIERS) {
            if (counts[tierId] === undefined) {
                counts[tierId] = 0;
                needsUpdate = true;
            }
        }
        
        // Se mancava qualcosa, lo scriviamo sul DB per le prossime volte
        if (needsUpdate) {
            const client = await pool.connect();
            try {
                for (const tierId of ALL_TIERS) {
                    await client.query('INSERT INTO counters ("tierId", count) VALUES ($1, 0) ON CONFLICT ("tierId") DO NOTHING', [tierId]);
                }
                console.log('GUARDIAN: A missing tier was found and initialized.');
            } finally {
                client.release();
            }
        }
        
        res.json(counts);

    } catch (err) {
        console.error('DB Error on get-count:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;