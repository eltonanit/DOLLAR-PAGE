const sqlite3 = require('sqlite3').verbose();

// Apre una connessione al nostro file di database
const db = new sqlite3.Database('./paytozee_data.db', (err) => {
    if (err) {
        console.error("Errore durante la connessione al database:", err.message);
    } else {
        console.log("Connesso al database 'paytozee_data'.");
    }
});

// Funzione per creare la tabella dei contatori (se non esiste già)
const setupDatabase = () => {
    const sql = `
    CREATE TABLE IF NOT EXISTS counters (
        tierId TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
    )`;
    return db.run(sql);
};

// Funzione ASINCRONA per recuperare il conteggio di un livello
const getCount = (tierId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT count FROM counters WHERE tierId = ?`;
        db.get(sql, [tierId], (err, row) => {
            if (err) {
                reject(err);
            }
            // Se non esiste una riga per quel tier, restituisce 0
            resolve(row ? row.count : 0);
        });
    });
};

// Funzione ASINCRONA per incrementare il conteggio di un livello
const incrementCount = (tierId) => {
    return new Promise((resolve, reject) => {
        // Usiamo INSERT OR IGNORE per creare la riga se non esiste, e poi UPDATE
        const insertSql = `INSERT OR IGNORE INTO counters (tierId, count) VALUES (?, 0)`;
        const updateSql = `UPDATE counters SET count = count + 1 WHERE tierId = ?`;

        db.serialize(() => {
            db.run(insertSql, [tierId], (err) => {
                if (err) return reject(err);
                db.run(updateSql, [tierId], function(err) {
                    if (err) return reject(err);
                    resolve(this.changes);
                });
            });
        });
    });
};

// Funzione ASINCRONA per recuperare tutti i conteggi
const getAllCounts = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM counters`;
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
};

// Esportiamo le funzioni per poterle usare nel nostro server.js
module.exports = {
    setupDatabase,
    getCount,
    getAllCounts,
    incrementCount
};