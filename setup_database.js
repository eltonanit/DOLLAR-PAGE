const { setupDatabase } = require('./database.js');

console.log("Esecuzione dello script di setup del database...");

setupDatabase();

console.log("Setup del database completato. La tabella 'counters' è stata creata (se non esisteva già).");

// Nota: questo script è molto semplice. Non ha bisogno di rimanere in esecuzione.