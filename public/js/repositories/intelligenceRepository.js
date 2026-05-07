/**
 * StockMaster IntelligenceRepository (Frontend)
 * Kommuniziert mit der Node.js API unter Verwendung des HttpClient.
 * Gemäß Regel 1: Kommunikation via Events.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.IntelligenceRepository = (function() {
  const API_URL = '/api/intelligence';

  /**
   * Hilfsfunktion zum Abfeuern von Events.
   * @param {string} eventName - Name des Events.
   * @param {any} [detail={}] - Daten, die mit dem Event gesendet werden.
   */
  function dispatch(eventName, detail = {}) {
    if (window.StockMaster.Events) {
      document.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }

  return {
    /**
     * Initialisiert das Repository.
     * @returns {Promise<void>}
     */
    async init() {
      console.log('📡 IntelligenceRepository: Initialisiert.');
      return Promise.resolve();
    },

    /**
     * Holt die allgemeinen Intelligence-Daten (Sentiment, Fundamentals, History).
     * Feuert INTELLIGENCE_DATA_LOADED bei Erfolg.
     * @param {string} symbol - Das Aktiensymbol.
     * @returns {Promise<void>}
     */
    async getForSymbol(symbol) {
      const data = await window.StockMaster.HttpClient.get(`${API_URL}/${symbol}`);
      dispatch(window.StockMaster.Events.INTELLIGENCE_DATA_LOADED, data);
    },

    /**
     * Holt Markt-Korrelationen (BTC, Gold) für ein Symbol.
     * Feuert MARKET_CORRELATIONS_LOADED bei Erfolg.
     * @param {string} symbol - Das Aktiensymbol.
     * @returns {Promise<void>}
     */
    async getCorrelations(symbol) {
      const data = await window.StockMaster.HttpClient.get(`${API_URL}/correlations/${symbol}`);
      dispatch(window.StockMaster.Events.MARKET_CORRELATIONS_LOADED, data);
    }
  };
})();
