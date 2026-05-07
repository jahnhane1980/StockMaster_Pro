// server/repositories/AlphaVantageRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');

class AlphaVantageRepo {
  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY;
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.providerName = 'AV';
  }

  /**
   * Hilfsfunktion für den eigentlichen API-Call
   */
  async _fetchFromAPI(params) {
    const urlParams = new URLSearchParams({
      ...params,
      apikey: this.apiKey
    });
    
    const response = await axios.get(`${this.baseUrl}?${urlParams.toString()}`);
    
    // Alpha Vantage gibt bei Limits oft 200 OK zurück, aber mit einer Info-Message
    if (response.data && response.data.Information && response.data.Information.includes('rate limit')) {
      throw new Error('AV_DAILY_LIMIT_REACHED');
    }
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      throw new Error('AV_MINUTE_LIMIT_REACHED'); // Falls doch mal einer durchrutscht
    }

    return response.data;
  }

  /**
   * Holt historische Tagesdaten (Wichtig für neue Ticker -> Prio: P2)
   */
  async getDailyHistory(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: ticker,
      outputsize: 'full' // 'full' holt bis zu 20 Jahre, 'compact' nur 100 Tage.
    });

    console.log(`[AlphaVantageRepo] Queueing History for ${ticker} (P2)`);
    return requestManager.enqueue('P2', this.providerName, task);
  }

  /**
   * Holt das News Sentiment (Hintergrund-Task -> Prio: P3)
   */
  async getNewsSentiment(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'NEWS_SENTIMENT',
      tickers: ticker,
      limit: 50 // Holt die letzten 50 relevanten News
    });

    console.log(`[AlphaVantageRepo] Queueing Sentiment for ${ticker} (P3)`);
    return requestManager.enqueue('P3', this.providerName, task);
  }

  /**
   * Holt Fundamentaldaten: Company Overview (Hintergrund-Task -> Prio: P3)
   */
  async getFundamentalsOverview(ticker) {
    return this.getCompanyOverview(ticker);
  }

  /**
   * Alias für getFundamentalsOverview (Hintergrund-Task -> Prio: P3)
   */
  async getCompanyOverview(ticker) {
    const task = () => this._fetchFromAPI({
      function: 'OVERVIEW',
      symbol: ticker
    });

    console.log(`[AlphaVantageRepo] Queueing Company Overview for ${ticker} (P3)`);
    return requestManager.enqueue('P3', this.providerName, task);
  }

  /**
   * Holt technische Indikatoren: On-Balance Volume (Hintergrund -> Prio: P3)
   */
  async getOBV(ticker, interval = 'daily') {
    const task = () => this._fetchFromAPI({
      function: 'OBV',
      symbol: ticker,
      interval: interval
    });

    console.log(`[AlphaVantageRepo] Queueing OBV for ${ticker} (P3)`);
    return requestManager.enqueue('P3', this.providerName, task);
  }
}

module.exports = new AlphaVantageRepo();