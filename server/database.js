// server/database.js
const Database = require('better-sqlite3');
const path = require('path');
const Logger = require('./utils/Logger');

// Pfad zur SQLite-Datei
const dbPath = path.resolve(__dirname, 'stockmaster.db');

// Synchrones Öffnen der Datenbank
// better-sqlite3 öffnet die Verbindung sofort beim Instanziieren
const db = new Database(dbPath, { 
    verbose: (msg) => Logger.info(msg) // Kann für tiefere Analysen aktiviert werden
});

// Performance-Optimierungen für SQLite (WAL Mode ist für Concurrent Reads/Writes empfohlen)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

/**
 * Tabellen initialisieren (Synchron beim Start)
 * Diese Funktion wird direkt nach dem Laden des Moduls aufgerufen.
 */
const initDB = () => {
    Logger.info('[DB] Initialisiere Tabellen mit better-sqlite3...');

    // Wir nutzen ein Try-Catch Block, um Fehler bei der Initialisierung abzufangen
    try {
        // 1. TICKERS (Zentrale Tabelle für die Watchlist)
        db.prepare(`CREATE TABLE IF NOT EXISTS tickers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE NOT NULL,
            name TEXT,
            type TEXT DEFAULT 'stock',
            sector TEXT,
            industry TEXT,
            linked_assets TEXT, -- Gespeichert als JSON-String
            last_updated INTEGER,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`).run();

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
        throw err; // Anwendung sollte bei DB-Fehlern nicht starten
    }
};

// Initialisierung sofort beim Laden ausführen
initDB();

// Exportiere das db-Objekt (Singleton) und die initDB Funktion für server.js
module.exports = { db, initDB };
