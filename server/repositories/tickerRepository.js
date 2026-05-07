const { db } = require('../db/Database');
const RequestManager = require('../services/RequestManager');
const MassiveRepo = require('./MassiveRepo');

/**
 * Repository für die Verwaltung der Ticker-Stammdaten und Preisabfragen.
 * Intent: Implementiert eine hybride Datenstrategie. Lesezugriffe (getAllTickers) 
 * erfolgen direkt gegen den lokalen SQLite-Cache für maximale Performance. 
 * Schreibvorgänge (upsert) synchronisieren den lokalen Zustand. 
 * Externe API-Anfragen (getRealtimePrice) werden über den RequestManager delegiert.
 */
const TickerRepository = {
    /**
     * Holt alle Ticker aus der lokalen Datenbank.
     * @returns {Array<Object>} - Liste aller Ticker inklusive geparster linked_assets.
     */
    getAllTickers: () => {
        const stmt = db.prepare('SELECT * FROM tickers ORDER BY symbol ASC');
        const rows = stmt.all();
        return rows.map(row => ({
            ...row,
            linked_assets: row.linked_assets ? JSON.parse(row.linked_assets) : []
        }));
    },

    /**
     * Holt den Echtzeit-Preis über den RequestManager (Massive P1).
     * @param {string} symbol - Das Aktiensymbol.
     * @returns {Promise<Object|null>} - Das aktuelle Preis-Objekt von Massive.
     */
    async getRealtimePrice(symbol) {
        return RequestManager.enqueue('P1', 'MASSIVE', () => MassiveRepo.getRealtimeQuote(symbol));
    },

    /**
     * Erstellt einen neuen Ticker oder aktualisiert einen bestehenden.
     * @param {Object} ticker - Das Ticker-Objekt mit allen Stammdaten.
     * @returns {Object} - Das Ergebnis des SQLite-Statements (changes, lastInsertRowid).
     */
    upsertTicker: (ticker) => {
        // Wir definieren das Statement einmal
        const stmt = db.prepare(`
            INSERT INTO tickers (symbol, name, type, sector, industry, linked_assets, last_updated)
            VALUES (@symbol, @name, @type, @sector, @industry, @linked_assets, @last_updated)
            ON CONFLICT(symbol) DO UPDATE SET
                name=excluded.name,
                type=excluded.type,
                sector=excluded.sector,
                industry=excluded.industry,
                linked_assets=excluded.linked_assets,
                last_updated=excluded.last_updated
        `);

        // Wir füllen JEDES Feld mit einem Fallback, damit SQLite nicht meckert
        return stmt.run({
            symbol: ticker.symbol,
            name: ticker.name || '',
            type: ticker.type || 'stock',
            sector: ticker.sector || '',   // WICHTIG: Fallback auf leerer String
            industry: ticker.industry || '', // WICHTIG: Fallback auf leerer String
            last_updated: ticker.last_updated || Date.now(),
            linked_assets: JSON.stringify(ticker.linked_assets || [])
        });
    },

    /**
     * Löscht einen Ticker aus der lokalen Datenbank.
     * @param {string} symbol - Das zu löschende Symbol.
     * @returns {Object} - Das Ergebnis des SQLite-Statements.
     */
    deleteTicker: (symbol) => {
        const stmt = db.prepare('DELETE FROM tickers WHERE symbol = ?');
        return stmt.run(symbol);
    }
};

module.exports = TickerRepository;