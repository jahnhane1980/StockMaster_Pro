// server/services/StockService.js
const MESSAGES = require('../utils/Messages');
const { StockMasterError, ProviderLimitError, ResourceNotFoundError } = require('../utils/Errors');
const { PRIORITY, PROVIDER, TECH, CONFIG } = require('../utils/AppConstants');

/**
 * Fassade für alle Aktien-bezogenen Operationen.
 * Intent: Dieser Service bündelt die Logik für Ticker-Stammdaten und Kurse. 
 * Er verwaltet die Fallback-Hierarchie zwischen Providern und harmonisiert Fehler.
 */
class StockService {
  /**
   * Erstellt eine Instanz des StockService.
   * @param {Object} avMarketDataRepo - Repository für AV Kursdaten.
   * @param {Object} avIntelligenceRepo - Repository für AV Sentiment.
   * @param {Object} avFundamentalRepo - Repository für AV Fundamentals.
   * @param {Object} massiveRepo - Repository für Massive.
   * @param {Object} tickerRepository - Repository für Ticker-Stammdaten.
   * @param {Object} historicalDataDAO - DAO für historische Daten.
   * @param {Object} intelligenceDAO - DAO für Intelligence-Daten.
   * @param {Object} logger - Logger-Instanz.
   * @param {Object} requestManager - Der RequestManager für Queueing.
   */
  constructor(avMarketDataRepo, avIntelligenceRepo, avFundamentalRepo, massiveRepo, tickerRepository, historicalDataDAO, intelligenceDAO, logger, requestManager) {
    this.avMarketDataRepo = avMarketDataRepo;
    this.avIntelligenceRepo = avIntelligenceRepo;
    this.avFundamentalRepo = avFundamentalRepo;
    this.massiveRepo = massiveRepo;
    this.tickerRepository = tickerRepository;
    this.historicalDataDAO = historicalDataDAO;
    this.intelligenceDAO = intelligenceDAO;
    this.logger = logger;
    this.requestManager = requestManager;
  }

  /**
   * Zentraler Error-Mapper (Regel 12).
   */
  _handleError(error, context) {
    this.logger.error(`[StockService] ${context}: ${error.message}`);
    
    if (error instanceof ProviderLimitError || error instanceof ResourceNotFoundError) {
      return error;
    }
    
    return new StockMasterError(`${MESSAGES.ERR_INTERNAL_SERVER} (${context})`, 500);
  }

  /**
   * Holt den Echtzeit-Preis.
   */
  async getRealtimePrice(symbol) {
    try {
      return await this.requestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, () => this.massiveRepo.getRealtimeQuote(symbol));
    } catch (e) {
      throw this._handleError(e, `RealtimePrice ${symbol}`);
    }
  }

  /**
   * Synchronisiert einen Ticker (Hintergrund-Task).
   */
  async syncTickerData(ticker) {
    try {
      const lastDate = await this.historicalDataDAO.getLastRecordDate(ticker);
      
      if (!lastDate) {
        this.logger.info(`[StockService] Starte Full-Sync für ${ticker}`);
        return await this.initializeTicker(ticker);
      }

      this.logger.info(`[StockService] Starte inkrementelles Update für ${ticker} (ab ${lastDate})`);
      return await this.initializeTicker(ticker);
    } catch (e) {
      this.logger.error(`[StockService] Sync-Fehler für ${ticker}: ${e.message}`);
    }
  }

  /**
   * Initialisiert einen neuen Ticker im System (Regel 11).
   * Holt alle Basisdaten von den Providern parallel.
   */
  async initializeTicker(ticker) {
    this.logger.info(`[StockService] Initiating parallel data fetch for ${ticker}`);
    try {
      // 1. Parallel fetch from all four repositories (Regel 27.2)
      const results = await Promise.allSettled([
        this.avMarketDataRepo.getDailyHistory(ticker),
        this.avIntelligenceRepo.getNewsSentiment(ticker),
        this.avFundamentalRepo.getFundamentalsOverview(ticker),
        this.getRealtimePrice(ticker)
      ]);

      // 2. Destructuring der Ergebnisse mit Fallback (Robustheit)
      const [marketData, intelligenceData, fundamentalData, massiveData] = results.map(r => 
        r.status === TECH.FULFILLED ? r.value : null
      );

      // 3. Persistierung (Parallel, sofern Daten vorhanden)
      const persistenceTasks = [];

      if (massiveData) {
        persistenceTasks.push(this.tickerRepository.updateLastPrice(massiveData));
      }

      if (marketData && marketData.length > 0) {
        persistenceTasks.push(this.historicalDataDAO.insertMany(ticker, marketData, PROVIDER.ALPHA_VANTAGE));
      }

      if (intelligenceData) {
        persistenceTasks.push(this.intelligenceDAO.insertSentiment(ticker, [intelligenceData]));
      }

      if (fundamentalData) {
        persistenceTasks.push(this.intelligenceDAO.upsertMetadata(ticker, fundamentalData));
      }

      await Promise.allSettled(persistenceTasks);

      return { marketData, intelligenceData, fundamentalData, massiveData };
      
    } catch (error) {
      throw this._handleError(error, `InitializeTicker ${ticker}`);
    }
  }

  /**
   * Synchronisiert die Daten für das Intelligence Board (Aggregator).
   * Optimiert auf parallele Abfragen für maximale Performance.
   */
  async getIntelligenceData(ticker) {
    this.logger.info(`[StockService] Initiating parallel data fetch for ${ticker}`);
    try {
      // 1. Parallel fetch from DB and non-conditional API calls (OBV/Price)
      const [massiveData, dbHistory, dbMetadata, sentiment, correlations, obvResult] = await Promise.allSettled([
        this.getRealtimePrice(ticker),
        this.historicalDataDAO.getHistoryForChart(ticker),
        this.intelligenceDAO.getMetadata(ticker),
        this.intelligenceDAO.getLatestSentiment(ticker, 5),
        this.intelligenceDAO.getCorrelations(ticker),
        this.avFundamentalRepo.getOBV(ticker)
      ]);

      // Helper zum Extrahieren der Werte
      const getVal = (res, fallback = null) => res.status === TECH.FULFILLED ? res.value : fallback;

      const quote = getVal(massiveData);
      const obvData = getVal(obvResult);
      
      if (quote) {
        this.tickerRepository.updateLastPrice(quote).catch(e => this.logger.error(e.message));
      }

      // 2. Conditional Fallbacks (Parallel falls beide fehlen)
      let history = getVal(dbHistory, []);
      let metadata = getVal(dbMetadata);

      const needsHistory = !history || history.length === 0;
      const needsMetadata = !metadata || (Date.now() - new Date(metadata.last_updated_fundamentals).getTime() > CONFIG.CACHE_DURATION_MS);

      if (needsHistory || needsMetadata) {
        this.logger.info(`[StockService] Fetching missing/stale data from AV for ${ticker}`);
        const [freshHistory, freshMetadata] = await Promise.allSettled([
          needsHistory ? this.avMarketDataRepo.getDailyHistory(ticker) : Promise.resolve(null),
          needsMetadata ? this.avFundamentalRepo.getFundamentalsOverview(ticker) : Promise.resolve(null)
        ]);

        if (getVal(freshHistory)) {
          history = freshHistory.value;
          this.historicalDataDAO.insertMany(ticker, history, PROVIDER.ALPHA_VANTAGE).catch(e => this.logger.error(e.message));
        }
        if (getVal(freshMetadata)) {
          metadata = freshMetadata.value;
          this.intelligenceDAO.upsertMetadata(ticker, metadata).catch(e => this.logger.error(e.message));
        }
      }

      // 3. DTO zusammenbauen
      return {
        ticker: ticker,
        currentPrice: quote ? quote.price : null,
        change: quote ? quote.changePercent : 0,
        quote,
        history,
        fundamentals: metadata,
        sentiment: getVal(sentiment, []),
        correlations: getVal(correlations, []),
        indicators: { obv: obvData ? obvData.data : null }
      };

    } catch (error) {
      throw this._handleError(error, `IntelligenceData ${ticker}`);
    }
  }
}

module.exports = StockService;
