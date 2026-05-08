// server/services/StockService.js
const AlphaVantageRepo = require('../repositories/AlphaVantageRepo');
const MassiveRepo = require('../repositories/MassiveRepo');
const RequestManager = require('./RequestManager');
const HistoricalDataDAO = require('../models/HistoricalDataDAO');
const IntelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');
const MESSAGES = require('../utils/Messages');
const { PRIORITY, PROVIDER, TECH } = require('../utils/AppConstants');

/**
 * Fassade für alle Aktien-bezogenen Operationen.
 * Intent: Dieser Service bündelt die Logik für Ticker-Stammdaten und Kurse. 
 * Er verwaltet die Fallback-Hierarchie zwischen Providern: AlphaVantage wird für 
 * historische Daten und Sentiment genutzt (da kostengünstig/Free Tier), 
 * Massive für kritische Echtzeit-Kurse (P1) und das Schließen von Datenlücken (Diffs).
 */
class StockService {
  /**
   * Holt den Echtzeit-Preis über den RequestManager (Massive P1).
   * @param {string} symbol - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das aktuelle Preis-Objekt.
   */
  async getRealtimePrice(symbol) {
    return RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, () => MassiveRepo.getRealtimeQuote(symbol));
  }

  /**
   * Initialisiert einen neuen Ticker im System (Regel 11).
   * Führt einen Full-Sync der Daten durch.
   * @param {string} ticker - Das Symbol.
   */
  async initializeTicker(ticker) {
    try {
      Logger.info(`[StockService] Initialisiere Ticker: ${ticker}`);
      
      // Realtime (Massive P1), Historie (AV P2) und Sentiment (AV P3)
      const results = await Promise.allSettled([
        this.getRealtimePrice(ticker),
        AlphaVantageRepo.getDailyHistory(ticker).catch(err => {
            Logger.error(`[StockService] Fehler bei History-Sync (${ticker}): ${err.message}`);
            return null;
        }),
        AlphaVantageRepo.getNewsSentiment(ticker).catch(err => {
            Logger.warn(`[StockService] Sentiment für ${ticker} konnte nicht geladen werden.`);
            return null;
        })
      ]);

      const [quote, historyRaw, sentimentRaw] = results.map(r => r.status === TECH.FULFILLED ? r.value : null);

      if (historyRaw) {
        const mappedHistory = this._mapAlphaVantageHistory(historyRaw);
        await HistoricalDataDAO.insertMany(ticker, mappedHistory, PROVIDER.ALPHA_VANTAGE);
      }

      if (sentimentRaw) {
        const mappedSentiment = this._mapAlphaVantageSentiment(sentimentRaw, ticker);
        await IntelligenceDAO.upsertSentiment(ticker, mappedSentiment);
      }

      return { quote, hasHistory: !!historyRaw };
      
    } catch (error) {
      Logger.error(`[StockService] Kritischer Fehler bei Ticker-Initialisierung (${ticker}): ${error.message}`);
      throw error;
    }
  }

  /**
   * Synchronisiert die Daten für das Intelligence Board (Aggregator).
   * @param {string} ticker - Das Symbol.
   * @returns {Promise<Object>} - Kombiniertes Datenobjekt.
   */
  async getIntelligenceData(ticker) {
    try {
      // 1. STAMMDATEN & PREIS
      const quote = await this.getRealtimePrice(ticker);

      // 2. HISTORISCHE DATEN (Hybrid-Logik: AV vs. Massive)
      let history = await HistoricalDataDAO.getByTicker(ticker);
      
      if (!history || history.length === 0) {
        Logger.info(`[StockService] Keine Historie für ${ticker}. Hole 5 Jahre von AV...`);
        const historyRaw = await AlphaVantageRepo.getDailyHistory(ticker);
        const mappedHistory = this._mapAlphaVantageHistory(historyRaw);
        await HistoricalDataDAO.insertMany(ticker, mappedHistory, PROVIDER.ALPHA_VANTAGE);
        history = mappedHistory;
      }

      // 3. FUNDAMENTALDATEN
      let fundamentals = await IntelligenceDAO.getFundamentals(ticker);
      if (!fundamentals || (Date.now() - fundamentals.last_updated > 2592000000)) { 
        // Fundamentaldaten fehlen oder sind älter als 30 Tage -> AV fragen
        Logger.info(`[StockService] Fundamentals für ${ticker} veraltet. Hole von AV...`);
        const fundamentalsRaw = await AlphaVantageRepo.getFundamentalsOverview(ticker);
        const mappedFundamentals = this._mapAlphaVantageFundamentals(fundamentalsRaw);
        await IntelligenceDAO.upsertFundamentals(ticker, mappedFundamentals);
        fundamentals = mappedFundamentals;
      }

      // 4. TECHNICALS (OBV)
      let obvData = null;
      try {
        const obvRaw = await AlphaVantageRepo.getOBV(ticker);
        obvData = this._mapAlphaVantageOBV(obvRaw);
      } catch (e) {
        Logger.warn(`[StockService] OBV für ${ticker} nicht verfügbar.`);
      }

      return {
        quote,
        history,
        fundamentals,
        technicals: { obv: obvData }
      };

    } catch (error) {
      Logger.error(`[StockService] Fehler beim Laden der Intelligence-Daten (${ticker}): ${error.message}`);
      throw error;
    }
  }

  // --- PRIVATE MAPPING FUNKTIONEN (Clean Code: Separation of Concerns) ---

  /**
   * Transformiert die AlphaVantage Time Series in unser DB-Schema.
   * @param {Object} rawData - Die Rohdaten von AV.
   * @returns {Array<Object>} - Formatierte Historie.
   * @private
   */
  _mapAlphaVantageHistory(rawData) {
    const timeSeries = rawData['Time Series (Daily)'];
    if (!timeSeries) return [];

    return Object.keys(timeSeries).map(date => ({
      date,
      open: parseFloat(timeSeries[date]['1. open']),
      high: parseFloat(timeSeries[date]['2. high']),
      low: parseFloat(timeSeries[date]['3. low']),
      close: parseFloat(timeSeries[date]['4. close']),
      volume: parseInt(timeSeries[date]['6. volume'])
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Transformiert AlphaVantage Sentiment in unser Schema.
   * @param {Object} rawData - Rohdaten von AV.
   * @param {string} ticker - Das Symbol.
   * @returns {Object} - Mapped Sentiment.
   * @private
   */
  _mapAlphaVantageSentiment(rawData, ticker) {
    const feed = rawData.feed || [];
    // Durchschnittliches Sentiment der Top 10 News berechnen
    const relevantNews = feed.slice(0, 10);
    const avgScore = relevantNews.reduce((sum, item) => {
        const tickerData = item.ticker_sentiment.find(s => s.ticker === ticker);
        return sum + (tickerData ? parseFloat(tickerData.ticker_sentiment_score) : 0);
    }, 0) / (relevantNews.length || 1);

    return {
        score: parseFloat(avgScore.toFixed(4)),
        news_count: feed.length,
        last_news_title: relevantNews[0]?.title || MESSAGES.UI_NO_NEWS,
        last_news_url: relevantNews[0]?.url || TECH.EMPTY_STRING,
        timestamp: this._formatAVTimestamp(item.time_published),
        provider: PROVIDER.ALPHA_VANTAGE
    };
  }

  /**
   * Hilfsfunktion zum Formatieren von AV Zeitstempeln (YYYYMMDDTHHMMSS -> ISO).
   * @param {string} ts - AV Zeitstempel.
   * @returns {string} - ISO Datum.
   * @private
   */
  _formatAVTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    // Beispiel: 20240315T153000 -> 2024-03-15T15:30:00Z
    return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  }

  /**
   * Transformiert AlphaVantage OBV in unser Schema.
   * @param {Object} rawData - Rohdaten von AV.
   * @returns {Array<Object>} - OBV Zeitreihe.
   * @private
   */
  _mapAlphaVantageOBV(rawData) {
    const data = rawData['Technical Analysis: OBV'] || {};
    return Object.keys(data).slice(0, 30).map(date => ({
        date,
        value: parseFloat(data[date]['OBV'])
    })).reverse();
  }

  /**
   * Transformiert AlphaVantage Company Overview in unser Schema.
   * @param {Object} rawData - Rohdaten von AV.
   * @returns {Object} - Fundamentaldaten.
   * @private
   */
  _mapAlphaVantageFundamentals(rawData) {
    return {
        pe_ratio: parseFloat(rawData.PERatio) || 0,
        eps: parseFloat(rawData.EPS) || 0,
        market_cap: parseInt(rawData.MarketCapitalization) || 0,
        dividend_yield: parseFloat(rawData.DividendYield) || 0,
        beta: parseFloat(rawData.Beta) || 0,
        revenue_ttm: parseInt(rawData.RevenueTTM) || 0,
        gross_profit_ttm: parseInt(rawData.GrossProfitTTM) || 0,
        last_updated: Date.now()
    };
  }
}

module.exports = new StockService();
