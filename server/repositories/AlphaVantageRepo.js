// server/repositories/AlphaVantageRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const { ProviderLimitError, ResourceNotFoundError } = require('../utils/Errors');
const { PRIORITY, PROVIDER } = require('../utils/AppConstants');

/**
 * Repository für den Zugriff auf die AlphaVantage API.
 * Intent: Da AlphaVantage im Free-Tier strikte Limits hat (5 Requests/Min, 500/Tag), 
 * werden alle Anfragen über den RequestManager geschleust. Dieser sorgt für die 
 * Einhaltung der Zeitabstände und priorisiert wichtige Daten (History) vor Hintergrund-Daten (Sentiment).
 */
class AlphaVantageRepo {
  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY;
    this.baseUrl = process.env.ALPHAVANTAGE_BASE_URL || 'https://www.alphavantage.co/query';
    this.providerName = PROVIDER.ALPHA_VANTAGE;
  }

  /**
   * Hilfsfunktion für den eigentlichen API-Call.
   * Prüft die Antwort auf provider-spezifische Error-Messages (Rate-Limits).
   * @param {Object} params - Die Query-Parameter für die API.
   * @returns {Promise<Object|null>} - Die Rohdaten der API oder null.
   * @private
   */
  async _fetchFromAPI(params) {
    const urlParams = new URLSearchParams({
      ...params,
      apikey: this.apiKey
    });
    
    const response = await axios.get(`${this.baseUrl}?${urlParams.toString()}`);
    
    // Validierung des HTTP-Status (Regel 12)
    if (response.status !== HttpStatus.OK) {
        throw new Error(`Alpha Vantage API lieferte Status ${response.status}`);
    }

    // Alpha Vantage gibt bei Limits oft 200 OK zurück, aber mit einer Info-Message
    if (response.data && response.data.Information && response.data.Information.includes('rate limit')) {
      throw new ProviderLimitError('Alpha Vantage Daily Rate Limit erreicht.');
    }
    
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      throw new ProviderLimitError('Alpha Vantage Minute Rate Limit erreicht.');
    }

    // Fehlerprüfung für ungültige Symbole oder fehlende Daten (Regel 12)
    if (response.data && (response.data['Error Message'] || (Object.keys(response.data).length === 0))) {
      throw new ResourceNotFoundError(`Keine Daten bei Alpha Vantage für Parameter: ${urlParams.get('symbol') || urlParams.get('tickers')}`);
    }

    return response.data;
  }

  /**
   * Holt historische Tagesdaten (Wichtig für neue Ticker -> Prio: P2).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Die Zeitreihendaten.
   */
  async getDailyHistory(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: ticker,
      outputsize: 'full' // 'full' holt bis zu 20 Jahre, 'compact' nur 100 Tage.
    });

    Logger.info(`[AlphaVantageRepo] Queueing History for ${ticker} (${PRIORITY.IMPORTANT})`);
    return requestManager.enqueue(PRIORITY.IMPORTANT, this.providerName, task);
  }

  /**
   * Holt das News Sentiment (Hintergrund-Task -> Prio: P3).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Sentiment-Daten und News-Links.
   */
  async getNewsSentiment(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'NEWS_SENTIMENT',
      tickers: ticker,
      limit: 50 // Holt die letzten 50 relevanten News
    });

    Logger.info(`[AlphaVantageRepo] Queueing Sentiment for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }

  /**
   * Holt Fundamentaldaten: Company Overview (Hintergrund-Task -> Prio: P3).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Unternehmensprofil und Kennzahlen.
   */
  async getFundamentalsOverview(ticker) {
    return this.getCompanyOverview(ticker);
  }

  /**
   * Alias für getFundamentalsOverview (Hintergrund-Task -> Prio: P3).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Unternehmensprofil.
   */
  async getCompanyOverview(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'OVERVIEW',
      symbol: ticker
    });

    Logger.info(`[AlphaVantageRepo] Queueing Company Overview for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }

  /**
   * Holt technische Indikatoren: On-Balance Volume (Hintergrund -> Prio: P3).
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} [interval='daily'] - Zeitintervall.
   * @returns {Promise<Object|null>} - OBV-Zeitreihe.
   */
  async getOBV(ticker, interval = 'daily') {
    const task = () => this._fetchFromAPI({
      function: 'OBV',
      symbol: ticker,
      interval: interval
    });

    Logger.info(`[AlphaVantageRepo] Queueing OBV for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }
}

module.exports = new AlphaVantageRepo();
