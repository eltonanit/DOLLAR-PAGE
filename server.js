const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Legge le chiavi segrete dalle variabili d'ambiente di Vercel
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Connessione a Vercel Postgres
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

// Funzione per creare la tabella se non esiste
async function createTable() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS counters (
                "tierId" TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            );
        `);
        console.log('Table "counters" is ready.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        client.release();
    }
}
createTable();

const app = express();

// Middleware per il webhook (deve venire PRIMA di express.json())
// CORRETTO: Aggiunto /api/
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
    } catch (err) {
        console.log(`❌ Webhook Error: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const tierId = session.metadata.tierId;
        if (tierId) {
            try {
                await pool.query('UPDATE counters SET count = count + 1 WHERE "tierId" = $1', [tierId]);
                console.log(`✅ Counter for ${tierId} incremented.`);
            } catch (err) {
                console.error('DB Error on update:', err.message);
            }
        }
    }
    response.json({ received: true });
});

app.use(express.json());

// Rotta per creare la sessione di checkout
// CORRETTO: Aggiunto /api/
app.post('/api/create-checkout-session', async (req, res) => {
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
        console.error('Stripe session creation error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Rotta per ottenere i conteggi iniziali
// CORRETTO: Aggiunto /api/
app.get('/api/get-count', async (req, res) => {
    try {
        const result = await pool.query('SELECT "tierId", count FROM counters');
        const counts = result.rows.reduce((acc, row) => {
            acc[row.tierId] = row.count;
            return acc;
        }, {});
        res.json(counts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Esporta l'app per Vercel
module.exports = app;