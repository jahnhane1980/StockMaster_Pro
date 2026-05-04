const Database = require('better-sqlite3');
const path = require('path');

// Die Datenbankdatei wird im server-Ordner erstellt
const db = new Database(path.join(__dirname, 'stockmaster.db'));

// Tabellen-Initialisierung
const initDB = () => {
    // 1. Tickers Stammdaten
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickers (
            symbol TEXT PRIMARY KEY,
            name TEXT,
            type TEXT,
            sector TEXT,
            industry TEXT,
            linked_assets TEXT, -- Hier speichern wir das Array als JSON-String
            last_updated INTEGER
        )
    `);

    // 2. Historische Kursdaten (Harmonisiertes Format)
    db.exec(`
        CREATE TABLE IF NOT EXISTS chart_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            timestamp INTEGER,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            source TEXT,
            UNIQUE(symbol, timestamp)
        )
    `);

    // 3. Fundamentaldaten & Intelligence
    db.exec(`
        CREATE TABLE IF NOT EXISTS intelligence (
            symbol TEXT PRIMARY KEY,
            fundamentals_json TEXT,
            sentiment_score REAL,
            dark_pool_flag INTEGER,
            last_updated INTEGER,
            FOREIGN KEY (symbol) REFERENCES tickers (symbol)
        )
    `);

    console.log("✅ SQLite Datenbank-Schema erfolgreich initialisiert.");
};

module.exports = { db, initDB };