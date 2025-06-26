const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// IMPORTANTE: Legge le chiavi segrete dalle variabili d'ambiente di Vercel
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
const PORT = process.env.PORT || 3000;

// Configura il percorso del database
const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS counters (
      tierId TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    )`);
  }
});

// Serve i file statici (HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname)));

// Middleware per il webhook (deve venire PRIMA di express.json() per il rawBody)
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    console.log(`❌ Webhook Error: ${err.message}`);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Gestisce l'evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const tierId = session.metadata.tierId;

    if (tierId) {
      db.run(`UPDATE counters SET count = count + 1 WHERE tierId = ?`, [tierId], function(err) {
        if (err) {
          return console.error('DB Error on update:', err.message);
        }
        console.log(`✅ Counter for ${tierId} incremented. New count: ${this.changes}`);
      });
    }
  }

  response.json({ received: true });
});

// Middleware per parsare il JSON delle altre richieste
app.use(express.json());

// Rotta per creare la sessione di checkout
app.post('/create-checkout-session', async (req, res) => {
  const { price, tierId, dropdownText } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Guess Who Paid',
            description: dropdownText,
          },
          unit_amount: Math.round(price * 100), // Converte in centesimi
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html?tierId=${tierId}`,
      cancel_url: `${req.headers.origin}/index.html`,
      metadata: {
        tierId: tierId // Passiamo il tierId a Stripe
      }
    });
    res.json({ id: session.id });
  } catch (e) {
    console.error('Stripe session creation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// NUOVO - Rotta per ottenere i conteggi iniziali
app.get('/get-count', (req, res) => {
    db.all("SELECT tierId, count FROM counters", [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const counts = rows.reduce((acc, row) => {
        acc[row.tierId] = row.count;
        return acc;
      }, {});
      res.json(counts);
    });
});

// Esporta l'app per Vercel
module.exports = app;

// La parte app.listen è necessaria solo per il test in locale,
// Vercel gestisce l'avvio del server tramite module.exports.
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}