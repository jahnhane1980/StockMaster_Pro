// server/repositories/TickerRepository.js
const RequestManager = require('../services/RequestManager');
const RepoFactory = require('./RepoFactory');
const WatchlistDAO = require('../models/WatchlistDAO');
const { PRIORITY, PROVIDER } = require('../utils/AppConstants');

/**
 * Repository für die Verwaltung der Ticker-Stammdaten und Preisabfragen.
 * Intent: Implementiert eine hybride Datenstrategie. Lesezugriffe (getAllTickers) 
 * erfolgen direkt gegen den lokalen SQLite-Cache via WatchlistDAO. 
 * Schreibvorgänge (upsert) synchronisieren den lokalen Zustand. 
 * Externe API-Anfragen (getRealtimePrice) werden über den RequestManager delegiert.
 */
const TickerRepository = {
    /**
     * Holt alle Ticker aus der lokalen Datenbank.
     * @returns {Array<Object>} - Liste aller Ticker inklusive geparster linked_assets.
     */
    getAllTickers: () => {
        const rows = WatchlistDAO.findAll();
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
        return RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, () => RepoFactory.getMassiveRepo().getRealtimeQuote(symbol));
    },

    /**
     * Erstellt einen neuen Ticker oder aktualisiert einen bestehenden.
     * @param {Object} ticker - Das Ticker-Objekt mit allen Stammdaten.
     * @returns {Object} - Das Ergebnis der DAO-Operation.
     */
    upsertTicker: (ticker) => {
        return WatchlistDAO.upsert(ticker);
    },

    /**
     * Löscht einen Ticker aus der lokalen Datenbank.
     * @param {string} symbol - Das zu löschende Symbol.
     * @returns {Object} - Das Ergebnis der DAO-Operation.
     */
    deleteTicker: (symbol) => {
        return WatchlistDAO.delete(symbol);
    },

    /**
     * Aktualisiert den letzten Preis in der Datenbank (Regel 1).
     * @param {Object} quote - Das harmonisierte Quote-Objekt.
     * @param {string} quote.symbol - Das Aktiensymbol.
     * @param {number} quote.price - Der aktuelle Kurs.
     * @param {number} quote.volume - Das Handelsvolumen.
     * @param {number} quote.change - Die absolute Änderung.
     * @param {number} quote.changePercent - Die prozentuale Änderung.
     * @param {string} quote.timestamp - Der ISO-Zeitstempel.
     * @returns {Object} - Das Ergebnis der DAO-Operation.
     */
    updateLastPrice: (quote) => {
        if (!quote || !quote.symbol) return null;
        return WatchlistDAO.updatePrice(quote.symbol, quote.price, quote.changePercent);
    }
};

module.exports = TickerRepository;
