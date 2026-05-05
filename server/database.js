const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Datenbank-Verbindung mit dem Namen aus der .env herstellen
const dbName = process.env.DB_NAME || 'stockmaster.db';
const db = new Database(path.join(__dirname, dbName));

/**
 * Initialisiert das Datenbank-Schema
 */
function initDB() {
    console.log(`StockMaster: Datenbank (${dbName}) wird initialisiert...`);

    // Tickers Tabelle (Stammdaten)
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickers (
            symbol TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            sector TEXT,
            industry TEXT,
            linked_assets TEXT,
            last_updated INTEGER
        )
    `);

    // Intelligence Tabelle (Detaildaten & Fundamentals)
    db.exec(`
        CREATE TABLE IF NOT EXISTS intelligence (
            symbol TEXT PRIMARY KEY,
            fundamentals_json TEXT,
            sentiment_score REAL,
            dark_pool_flag INTEGER,
            last_updated INTEGER
        )
    `);

    // Chart Data Tabelle (Historische Kurse)
    db.exec(`
        CREATE TABLE IF NOT EXISTS chart_data (
            symbol TEXT PRIMARY KEY,
            data_json TEXT,
            last_updated INTEGER
        )
    `);

    console.log('✅ SQLite Datenbank-Schema erfolgreich initialisiert.');
}

module.exports = {
    db,
    initDB
};