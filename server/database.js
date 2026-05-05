// server/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Pfad zur SQLite-Datei (wird beim Start neu erstellt, wenn sie nicht existiert)
const dbPath = path.resolve(__dirname, 'stockmaster.db'); 
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[DB] Fehler beim Öffnen der Datenbank:', err.message);
    } else {
        console.log('[DB] Erfolgreich mit der SQLite-Datenbank verbunden.');
    }
});

// Tabellen initialisieren
db.serialize(() => {
    // 1. TICKERS (Unsere Watchlist & Basis-Tabelle)
    db.run(`CREATE TABLE IF NOT EXISTS tickers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. HISTORICAL DATA (Hybrid-Tabelle für AV und Massive)
    db.run(`CREATE TABLE IF NOT EXISTS historical_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        date_str TEXT NOT NULL,      -- 'YYYY-MM-DD'
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        adjusted_close REAL,         -- Kommt primär von AV
        volume INTEGER,
        vwap REAL,                   -- Kommt primär von Massive
        provider TEXT DEFAULT 'AV',  -- 'AV' oder 'MASSIVE'
        UNIQUE(ticker, date_str),
        FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
    )`);

    // 3. MARKET METADATA (Für Fundamentaldaten & Caching-Timestamps)
    db.run(`CREATE TABLE IF NOT EXISTS market_metadata (
        ticker TEXT PRIMARY KEY,
        asset_type TEXT,
        market_cap INTEGER,
        debt_equity REAL,
        revenue_growth REAL,
        last_updated_fundamentals DATETIME,
        last_updated_history DATETIME,
        FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
    )`);

    // 4. SENTIMENT HISTORY (Speichert die News-Scores im Zeitverlauf)
    db.run(`CREATE TABLE IF NOT EXISTS sentiment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        sentiment_score REAL,
        relevance_score REAL,
        UNIQUE(ticker, timestamp),
        FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
    )`);

    // 5. ASSET CORRELATIONS (Für das Tracking von Basiswerten wie Gold, BTC)
    db.run(`CREATE TABLE IF NOT EXISTS asset_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        main_ticker TEXT NOT NULL,
        linked_ticker TEXT NOT NULL,
        correlation_score REAL DEFAULT 0,
        UNIQUE(main_ticker, linked_ticker),
        FOREIGN KEY (main_ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
    )`);
});

// Hilfsfunktion: Graceful Shutdown für die Datenbank
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('[DB] Fehler beim Schließen der Datenbank:', err.message);
        } else {
            console.log('[DB] Datenbankverbindung geschlossen.');
        }
        process.exit(0);
    });
});

module.exports = db;