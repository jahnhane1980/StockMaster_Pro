/**
 * StockMaster TickerRepository (Frontend)
 * Kommuniziert mit der Node.js API unter Verwendung des HttpClient.
 * Gemäß Regel 1: Keine direkte Rückgabe von Daten an die UI, Kommunikation via Events.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.TickerRepository = (function() {
  const API_URL = '/api/tickers';

  /**
   * Hilfsfunktion zum Abfeuern von Events.
   * @param {string} eventName - Name des Events.
   * @param {any} detail - Daten, die mit dem Event gesendet werden.
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
      console.log('📡 TickerRepository: API-Modus initialisiert');
      return Promise.resolve();
    },

    /**
     * Holt historische Chart-Daten über den Intelligence-Endpunkt.
     * Feuert CHART_DATA_READY bei Erfolg.
     * @param {string} symbol - Das Aktiensymbol.
     * @returns {Promise<void>}
     */
    async getChartData(symbol) {
      const data = await window.StockMaster.HttpClient.get(`/api/intelligence/${symbol}`);
      
      dispatch(window.StockMaster.Events.CHART_DATA_READY, {
        symbol: symbol,
        history: data.history || [],
        correlations: data.correlations || []
      });
    },

    /**
     * Holt alle Ticker aus der Watchlist.
     * Feuert TICKERS_LOADED bei Erfolg.
     * @returns {Promise<void>}
     */
    async getAllTickers() {
      const data = await window.StockMaster.HttpClient.get(API_URL);
      dispatch(window.StockMaster.Events.TICKERS_LOADED, { tickers: data });
    },

    /**
     * Löscht einen Ticker aus der Watchlist.
     * Feuert TICKER_DELETED bei Erfolg.
     * @param {string} symbol - Das zu löschende Symbol.
     * @returns {Promise<void>}
     */
    async deleteTicker(symbol) {
      await window.StockMaster.HttpClient.delete(`${API_URL}/${symbol}`);
      dispatch(window.StockMaster.Events.TICKER_DELETED, { symbol });
    }
  };
})();
