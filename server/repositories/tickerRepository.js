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
    }
};

module.exports = TickerRepository;
