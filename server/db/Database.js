// server/db/Database.js
const Database = require('better-sqlite3');
const path = require('path');
const Logger = require('../utils/Logger');

/**
 * Pfad zur SQLite-Datenbankdatei.
 * Intent: Wir priorisieren die Umgebungsvariable DB_STORAGE_PATH, um in verschiedenen 
 * Umgebungen (Prod/Dev/Docker) maximale Flexibilität ohne Code-Änderung zu ermöglichen.
 * @type {string}
 */
const dbPath = process.env.DB_STORAGE_PATH 
    ? path.resolve(process.cwd(), process.env.DB_STORAGE_PATH)
    : path.resolve(__dirname, '../data/stockmaster.db');

/**
 * Zentrale Datenbankinstanz (better-sqlite3).
 * @type {Database}
 */
const db = new Database(dbPath, { 
    verbose: (msg) => Logger.info(msg) 
});

// Performance-Optimierungen für SQLite (WAL Mode ist für Concurrent Reads/Writes empfohlen)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

/**
 * Initialisiert das Datenbankschema beim Anwendungsstart.
 * Erstellt alle notwendigen Tabellen und Indizes, falls diese noch nicht existieren.
 * @returns {void}
 */
const initDB = () => {
    Logger.info(`[DB] Initialisiere Tabellen unter: ${dbPath}`);

    try {
        // 1. TICKERS (Zentrale Tabelle für die Watchlist)
        db.prepare(`CREATE TABLE IF NOT EXISTS tickers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE NOT NULL,
            name TEXT,
            type TEXT DEFAULT 'stock',
            sector TEXT,
            industry TEXT,
            last_price REAL,
            price_change_percent REAL,
            linked_assets TEXT, -- Gespeichert als JSON-String
            last_updated INTEGER,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`).run();

        // Migration: Spalten hinzufügen, falls sie in einer älteren Version fehlen
        const tableInfo = db.prepare("PRAGMA table_info(tickers)").all();
        const hasLastPrice = tableInfo.some(col => col.name === 'last_price');
        if (!hasLastPrice) {
            db.prepare("ALTER TABLE tickers ADD COLUMN last_price REAL").run();
            db.prepare("ALTER TABLE tickers ADD COLUMN price_change_percent REAL").run();
            Logger.info('[DB] Migration: last_price Spalten zu tickers hinzugefügt.');
        }

        // 2. HISTORICAL DATA (Hybrid-Tabelle für verschiedene Provider)
        db.prepare(`CREATE TABLE IF NOT EXISTS historical_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            date_str TEXT NOT NULL,      -- 'YYYY-MM-DD'
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            adjusted_close REAL,
            volume INTEGER,
            vwap REAL,
            provider TEXT DEFAULT 'AV',
            UNIQUE(ticker, date_str),
            FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
        )`).run();

        // 3. MARKET METADATA (Fundamentaldaten & Caching-Timestamps)
        db.prepare(`CREATE TABLE IF NOT EXISTS market_metadata (
            ticker TEXT PRIMARY KEY,
            asset_type TEXT,
            market_cap INTEGER,
            debt_equity REAL,
            revenue_growth REAL,
            last_updated_fundamentals DATETIME,
            last_updated_history DATETIME,
            FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
        )`).run();

        // 4. SENTIMENT HISTORY (Zeitverlauf der News-Bewertungen)
        db.prepare(`CREATE TABLE IF NOT EXISTS sentiment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            sentiment_score REAL,
            relevance_score REAL,
            UNIQUE(ticker, timestamp),
            FOREIGN KEY (ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
        )`).run();

        // 5. ASSET CORRELATIONS (Verknüpfung von Assets mit Basiswerten wie BTC/Gold)
        db.prepare(`CREATE TABLE IF NOT EXISTS asset_correlations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            main_ticker TEXT NOT NULL,
            linked_ticker TEXT NOT NULL,
            correlation_score REAL DEFAULT 0,
            UNIQUE(main_ticker, linked_ticker),
            FOREIGN KEY (main_ticker) REFERENCES tickers(symbol) ON DELETE CASCADE
        )`).run();

        // Zusätzliche Tabelle für Chart-Daten (wird vom ChartRepository erwartet)
        db.prepare(`CREATE TABLE IF NOT EXISTS chart_data (
            symbol TEXT PRIMARY KEY,
            data_json TEXT,
            last_updated INTEGER
        )`).run();

        Logger.info('[DB] Alle Tabellen erfolgreich geprüft/erstellt.');
    } catch (err) {
        Logger.error(`[DB] Kritischer Fehler bei der Tabellen-Initialisierung: ${err.message}`);
        throw err;
    }
};

// Initialisierung sofort beim Laden ausführen
initDB();

module.exports = { db, initDB };
