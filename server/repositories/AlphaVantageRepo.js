// server/repositories/AlphaVantageRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');
const MarketDataMapper = require('../utils/MarketDataMapper');
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const MESSAGES = require('../utils/Messages');
const { ProviderLimitError, ResourceNotFoundError } = require('../utils/Errors');
const { PRIORITY, PROVIDER, API } = require('../utils/AppConstants');

/**
 * Repository für den Zugriff auf die AlphaVantage API.
 * Intent: Da AlphaVantage im Free-Tier strikte Limits hat (5 Requests/Min, 500/Tag), 
 * werden alle Anfragen über den RequestManager geschleust. Dieser sorgt für die 
 * Einhaltung der Zeitabstände und priorisiert wichtige Daten (PRIORITY.IMPORTANT) vor Hintergrund-Daten (PRIORITY.BACKGROUND).
 */
class AlphaVantageRepo {
  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY;
    this.baseUrl = API.ALPHA_VANTAGE.BASE_URL;
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
        throw new Error(`${MESSAGES.ERR_AV_STATUS} ${response.status}`);
    }

    // Alpha Vantage gibt bei Limits oft 200 OK zurück, aber mit einer Info-Message
    if (response.data && response.data.Information && response.data.Information.includes('rate limit')) {
      throw new ProviderLimitError(MESSAGES.ERR_AV_DAILY_LIMIT);
    }
    
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      throw new ProviderLimitError(MESSAGES.ERR_AV_MINUTE_LIMIT);
    }

    // Fehlerprüfung für ungültige Symbole oder fehlende Daten (Regel 12)
    if (response.data && (response.data['Error Message'] || (Object.keys(response.data).length === 0))) {
      throw new ResourceNotFoundError(`${MESSAGES.ERR_AV_NO_DATA} ${urlParams.get('symbol') || urlParams.get('tickers')}`);
    }

    return response.data;
  }

  /**
   * Holt den aktuellen Kurs via GLOBAL_QUOTE (Prio: PRIORITY.CRITICAL/PRIORITY.IMPORTANT).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das harmonisierte Kurs-Objekt.
   */
  async getRealtimeQuote(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.GLOBAL_QUOTE,
        symbol: ticker
      });
      const quote = rawData[API.AV_RESPONSE_KEYS.GLOBAL_QUOTE];
      if (!quote || Object.keys(quote).length === 0) return null;

      // Nutzt den zentralen Mapper (Regel 1)
      return MarketDataMapper.toQuote(
        quote[API.AV_RESPONSE_KEYS.SYMBOL],
        quote[API.AV_RESPONSE_KEYS.PRICE],
        quote[API.AV_RESPONSE_KEYS.OPEN],
        quote[API.AV_RESPONSE_KEYS.VOLUME],
        quote[API.AV_RESPONSE_KEYS.LATEST_DAY]
      );
    };

    Logger.info(`[AlphaVantageRepo] Queueing Global Quote for ${ticker} (${PRIORITY.IMPORTANT})`);
    return requestManager.enqueue(PRIORITY.IMPORTANT, this.providerName, task);
  }

  /**
   * Holt historische Tagesdaten (Wichtig für neue Ticker -> Prio: PRIORITY.IMPORTANT).
   * Gibt nun eine Liste harmonisierter Modelle zurück.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Array<Object>>} - Die harmonisierten Zeitreihendaten.
   */
  async getDailyHistory(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.DAILY_ADJUSTED,
        symbol: ticker,
        outputsize: API.AV_PARAMS.FULL
      });

      const timeSeries = rawData[API.AV_RESPONSE_KEYS.TIME_SERIES_DAILY];
      if (!timeSeries) return [];

      return Object.keys(timeSeries).map(date => {
        const entry = timeSeries[date];
        // Nutzt den zentralen Mapper (Regel 1)
        return MarketDataMapper.toHistoryEntry(
          ticker,
          date,
          entry['1. open'],
          entry['2. high'],
          entry['3. low'],
          entry['4. close'],
          entry['6. volume']
        );
      }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    Logger.info(`[AlphaVantageRepo] Queueing Harmonized History for ${ticker} (${PRIORITY.IMPORTANT})`);
    return requestManager.enqueue(PRIORITY.IMPORTANT, this.providerName, task);
  }

  /**
   * Holt das News Sentiment (Hintergrund-Task -> Prio: PRIORITY.BACKGROUND).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Harmonisiertes Sentiment-Modell.
   */
  async getNewsSentiment(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.SENTIMENT,
        tickers: ticker,
        limit: API.ALPHA_VANTAGE.NEWS_LIMIT
      });
      
      const feed = rawData.feed || [];
      const relevantNews = feed.slice(0, API.ALPHA_VANTAGE.NEWS_SELECTION);
      const avgScore = relevantNews.reduce((sum, item) => {
        const tickerData = item.ticker_sentiment?.find(s => s.ticker === ticker);
        return sum + (tickerData ? parseFloat(tickerData.ticker_sentiment_score) : 0);
      }, 0) / (relevantNews.length || 1);

      return {
        sentiment_score: parseFloat(avgScore.toFixed(API.ALPHA_VANTAGE.DECIMAL_PRECISION)),
        relevance_score: 1.0,
        news_count: feed.length,
        last_news_title: relevantNews[0]?.title || 'Keine News verfügbar',
        last_news_url: relevantNews[0]?.url || '',
        timestamp: this._formatTimestamp(relevantNews[0]?.time_published),
        provider: PROVIDER.ALPHA_VANTAGE
      };
    };

    Logger.info(`[AlphaVantageRepo] Queueing Harmonized Sentiment for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }

  /**
   * Holt Fundamentaldaten: Company Overview (Hintergrund-Task -> Prio: PRIORITY.BACKGROUND).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Harmonisiertes Metadaten-Modell.
   */
  async getFundamentalsOverview(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.OVERVIEW,
        symbol: ticker
      });

      return {
        ticker: ticker,
        market_cap: parseInt(rawData.MarketCapitalization) || 0,
        debt_equity: parseFloat(rawData.DebtToEquityRatio) || 0,
        revenue_growth: parseFloat(rawData.RevenueGrowthYOY) || 0,
        pe_ratio: parseFloat(rawData.PERatio) || 0,
        eps: parseFloat(rawData.EPS) || 0,
        dividend_yield: parseFloat(rawData.DividendYield) || 0,
        beta: parseFloat(rawData.Beta) || 0,
        last_updated_fundamentals: new Date().toISOString()
      };
    };

    Logger.info(`[AlphaVantageRepo] Queueing Harmonized Fundamentals for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }

  /**
   * Alias für getFundamentalsOverview.
   */
  async getCompanyOverview(ticker) {
    return this.getFundamentalsOverview(ticker);
  }

  /**
   * Holt technische Indikatoren: On-Balance Volume (Hintergrund -> Prio: PRIORITY.BACKGROUND).
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} [interval=API.AV_PARAMS.DAILY] - Zeitintervall.
   * @returns {Promise<Object|null>} - Harmonisierte OBV-Zeitreihe.
   */
  async getOBV(ticker, interval = API.AV_PARAMS.DAILY) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.OBV,
        symbol: ticker,
        interval: interval
      });

      const data = rawData[API.AV_RESPONSE_KEYS.TECHNICAL_OBV] || {};
      const obvList = Object.keys(data).slice(0, API.ALPHA_VANTAGE.OBV_PERIOD).map(date => ({
        date,
        value: parseFloat(data[date]['OBV'])
      })).reverse();

      return {
        ticker: ticker,
        indicator: 'OBV',
        data: obvList
      };
    };

    Logger.info(`[AlphaVantageRepo] Queueing Harmonized OBV for ${ticker} (${PRIORITY.BACKGROUND})`);
    return requestManager.enqueue(PRIORITY.BACKGROUND, this.providerName, task);
  }

  /**
   * Hilfsfunktion zum Formatieren von AV Zeitstempeln (YYYYMMDDTHHMMSS -> ISO).
   * @param {string} ts - AV Zeitstempel.
   * @returns {string} - ISO Datum.
   * @private
   */
  _formatTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  }
}

module.exports = new AlphaVantageRepo();
