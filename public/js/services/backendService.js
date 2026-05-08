// public/js/services/BackendService.js

/**
 * StockMaster BackendService
 * Kapselt die Kommunikation mit der REST-API unter Verwendung des HttpClient.
 * Intent: Dieser Service dient als saubere Abstraktionsschicht. Er vertraut darauf, 
 * dass der HttpClient die standardisierten Antworten (Regel 13) validiert, 
 * Fehler wirft und die reinen Daten-Payloads liefert.
 */
class BackendService {
    /**
     * Initialisiert den Service.
     */
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Sendet einen neuen Ticker an den Server.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Die Server-Antwort (data-Feld).
     */
    async addTickerToWatchlist(ticker) {
        return window.StockMaster.HttpClient.post(`${this.baseUrl}/watchlist`, { symbol: ticker });
    }

    /**
     * Holt die aggregierten Intelligence-Daten vom Server.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Das vollständige Intelligence-Datenpaket.
     */
    async getIntelligenceData(ticker) {
        return window.StockMaster.HttpClient.get(`${this.baseUrl}/intelligence/${ticker}`);
    }

    /**
     * Holt gezielt Markt-Korrelationen (BTC, Gold) für einen Ticker.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Korrelationsdaten.
     */
    async getMarketCorrelations(ticker) {
        return window.StockMaster.HttpClient.get(`${this.baseUrl}/intelligence/correlations/${ticker}`);
    }

    /**
     * Holt gezielt Fundamentaldaten für einen Ticker.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Die Fundamentaldaten.
     */
    async getFundamentals(ticker) {
        return window.StockMaster.HttpClient.get(`${this.baseUrl}/fundamentals/${ticker}`);
    }

    /**
     * Erstellt eine Korrelation zwischen zwei Assets.
     * @param {string} mainTicker - Haupt-Ticker.
     * @param {string} linkedTicker - Verknüpfter Ticker.
     * @param {number} [score=0] - Korrelations-Score.
     * @returns {Promise<Object>} - Die Server-Bestätigung.
     */
    async addCorrelation(mainTicker, linkedTicker, score = 0) {
        return window.StockMaster.HttpClient.post(`${this.baseUrl}/correlations`, { mainTicker, linkedTicker, score });
    }
}

// Global als Instanz verfügbar machen, damit deine Module darauf zugreifen können
window.backendService = new BackendService();
