// server/services/StockService.js
const RepoFactory = require('../repositories/RepoFactory');
const TickerRepository = require('../repositories/TickerRepository');
const RequestManager = require('./RequestManager');
const HistoricalDataDAO = require('../models/HistoricalDataDAO');
const IntelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');
const MESSAGES = require('../utils/Messages');
const { StockMasterError, ProviderLimitError, ResourceNotFoundError } = require('../utils/Errors');
const { PRIORITY, PROVIDER, TECH } = require('../utils/AppConstants');

/**
 * Fassade für alle Aktien-bezogenen Operationen.
 * Intent: Dieser Service bündelt die Logik für Ticker-Stammdaten und Kurse. 
 * Er verwaltet die Fallback-Hierarchie zwischen Providern und harmonisiert Fehler.
 */
class StockService {
  constructor() {
    this.alphaVantageRepo = RepoFactory.getAlphaVantageRepo();
    this.massiveRepo = RepoFactory.getMassiveRepo();
  }

  /**
   * Zentraler Error-Mapper (Regel 12).
   * Übersetzt Provider-Fehler in ein einheitliches App-Format.
   * @param {Error} error - Der ursprüngliche Fehler.
   * @param {string} context - Kontext der Operation.
   * @private
   */
  _handleError(error, context) {
    Logger.error(`[StockService] ${context}: ${error.message}`);
    
    if (error instanceof ProviderLimitError || error instanceof ResourceNotFoundError) {
      return error;
    }
    
    // Fallback auf Standard-Fehler
    return new StockMasterError(`${MESSAGES.ERR_INTERNAL} (${context})`, 500);
  }

  /**
   * Holt den Echtzeit-Preis über den RequestManager (Massive P1).
   * @param {string} symbol - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das aktuelle harmonisierte Preis-Objekt.
   */
  async getRealtimePrice(symbol) {
    try {
      return await RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, () => this.massiveRepo.getRealtimeQuote(symbol));
    } catch (e) {
      throw this._handleError(e, `RealtimePrice ${symbol}`);
    }
  }

  /**
   * Synchronisiert einen Ticker (Hintergrund-Task).
   * Prüft ob ein Full-Sync oder ein inkrementelles Update (Diff) nötig ist.
   * @param {string} ticker - Das Symbol.
   */
  async syncTickerData(ticker) {
    try {
      const lastDate = await HistoricalDataDAO.getLastRecordDate(ticker);
      
      if (!lastDate) {
        Logger.info(`[StockService] Starte Full-Sync für ${ticker}`);
        return await this.initializeTicker(ticker);
      }

      Logger.info(`[StockService] Starte inkrementelles Update für ${ticker} (ab ${lastDate})`);
      // Hier könnte später die Massive-Diff-Logik folgen. Aktuell priorisieren wir initializeTicker.
      return await this.initializeTicker(ticker);
    } catch (e) {
      Logger.error(`[StockService] Sync-Fehler für ${ticker}: ${e.message}`);
    }
  }

  /**
   * Initialisiert einen neuen Ticker im System (Regel 11).
   * Führt einen Full-Sync der Daten durch.
   * @param {string} ticker - Das Symbol.
   */
  async initializeTicker(ticker) {
    try {
      Logger.info(`[StockService] Initialisiere Ticker: ${ticker}`);
      
      // Nutzt ausschließlich harmonisierte Repository-Methoden (Regel 1)
      const results = await Promise.allSettled([
        this.getRealtimePrice(ticker),
        this.alphaVantageRepo.getDailyHistory(ticker),
        this.alphaVantageRepo.getNewsSentiment(ticker)
      ]);

      const [quote, history, sentiment] = results.map(r => r.status === TECH.FULFILLED ? r.value : null);

      if (quote) {
        // Persistiert den letzten Preis in der Ticker-Tabelle (Regel 1)
        await TickerRepository.updateLastPrice(quote);
      }

      if (history && history.length > 0) {
        await HistoricalDataDAO.insertMany(ticker, history, PROVIDER.ALPHA_VANTAGE);
      }

      if (sentiment) {
        // Sentiment-Einträge müssen als Array übergeben werden (DAO-Vorgabe)
        await IntelligenceDAO.insertSentiment(ticker, [sentiment]);
      }

      return { quote, hasHistory: !!history };
      
    } catch (error) {
      throw this._handleError(error, `InitializeTicker ${ticker}`);
    }
  }

  /**
   * Synchronisiert die Daten für das Intelligence Board (Aggregator).
   * @param {string} ticker - Das Symbol.
   * @returns {Promise<Object>} - Kombiniertes Datenobjekt (DTO).
   */
  async getIntelligenceData(ticker) {
    try {
      // 1. STAMMDATEN & PREIS
      const quote = await this.getRealtimePrice(ticker);
      
      if (quote) {
        // Auch bei Board-Anfrage den Preis persistieren
        await TickerRepository.updateLastPrice(quote);
      }

      // 2. HISTORISCHE DATEN (Hybrid-Logik: AV vs. Massive)
      let history = await HistoricalDataDAO.getHistoryForChart(ticker);
      
      if (!history || history.length === 0) {
        Logger.info(`[StockService] Keine Historie für ${ticker}. Hole von AV...`);
        history = await this.alphaVantageRepo.getDailyHistory(ticker);
        if (history && history.length > 0) {
          await HistoricalDataDAO.insertMany(ticker, history, PROVIDER.ALPHA_VANTAGE);
        }
      }

      // 3. FUNDAMENTALDATEN (Metadata)
      let metadata = await IntelligenceDAO.getMetadata(ticker);
      if (!metadata || (Date.now() - new Date(metadata.last_updated_fundamentals).getTime() > 2592000000)) { 
        Logger.info(`[StockService] Fundamentals für ${ticker} veraltet. Hole von AV...`);
        const harmonizedFundamentals = await this.alphaVantageRepo.getFundamentalsOverview(ticker);
        await IntelligenceDAO.upsertMetadata(ticker, harmonizedFundamentals);
        metadata = harmonizedFundamentals;
      }

      // 4. SENTIMENT
      const sentiment = await IntelligenceDAO.getLatestSentiment(ticker, 5);

      // 5. TECHNICALS (OBV)
      const obvResult = await this.alphaVantageRepo.getOBV(ticker).catch(() => null);

      // 6. KORRELATIONEN (Peer-Assets)
      const correlations = await IntelligenceDAO.getCorrelations(ticker);

      // DTO für das Frontend zusammenbauen (Regel 11 & 13)
      return {
        ticker: ticker,
        currentPrice: quote ? quote.price : null,
        change: quote ? quote.changePercent : 0,
        quote,
        history,
        fundamentals: metadata,
        sentiment,
        correlations,
        indicators: { obv: obvResult ? obvResult.data : null }
      };

    } catch (error) {
      throw this._handleError(error, `IntelligenceData ${ticker}`);
    }
  }
}

module.exports = new StockService();
