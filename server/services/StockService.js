// server/services/StockService.js
const alphaVantageRepo = require('../repositories/AlphaVantageRepo');
const MassiveRepo = require('../repositories/MassiveRepo');
const RequestManager = require('./RequestManager');
const analysisService = require('./AnalysisService');
const historicalDataDAO = require('../models/HistoricalDataDAO');
const intelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');

class StockService {

  /**
   * Holt den Echtzeit-Preis über den RequestManager (Massive P1)
   */
  async getRealtimeQuote(symbol) {
    return RequestManager.enqueue('P1', 'MASSIVE', () => MassiveRepo.getRealtimeQuote(symbol));
  }

  /**
   * Synchronisiert alle Daten für einen Ticker (Realtime, Historie, News-Sentiment)
   * Wird typischerweise im Hintergrund aufgerufen (z.B. beim Hinzufügen zur Watchlist).
   */
  async syncTickerData(symbol) {
    Logger.info(`[StockService] Starte Full-Sync für: ${symbol}`);
    const ticker = symbol.toUpperCase();

    try {
      // 1. Parallel alles abrufen, was wir für einen frischen Ticker brauchen
      // Realtime (Massive P1), Historie (AV P2) und Sentiment (AV P3)
      const [realtime, historyRaw, sentimentRaw] = await Promise.all([
        this.getRealtimeQuote(ticker).catch(err => {
          Logger.warn(`[Sync] Realtime-Fehler für ${ticker}: ${err.message}`);
          return null;
        }),
        alphaVantageRepo.getDailyHistory(ticker).catch(err => {
          Logger.warn(`[Sync] Historie-Fehler für ${ticker}: ${err.message}`);
          return null;
        }),
        alphaVantageRepo.getNewsSentiment(ticker).catch(err => {
          Logger.warn(`[Sync] Sentiment-Fehler für ${ticker}: ${err.message}`);
          return null;
        })
      ]);

      // 2. Historie persistieren (falls erfolgreich geladen)
      if (historyRaw) {
        const mappedHistory = this._mapAlphaVantageHistory(historyRaw);
        await historicalDataDAO.insertMany(ticker, mappedHistory, 'AV');
      }

      // 3. News-Sentiment persistieren (falls erfolgreich geladen)
      if (sentimentRaw && sentimentRaw.feed) {
        const mappedSentiment = this._mapAlphaVantageSentiment(sentimentRaw, ticker);
        await intelligenceDAO.insertSentiment(ticker, mappedSentiment);
      }

      Logger.info(`[StockService] Sync für ${ticker} erfolgreich abgeschlossen.`);
      
      // 4. Korrelationen neu berechnen (falls Basiswerte vorhanden sind)
      await this.recalculateCorrelations(ticker);

      return true;

    } catch (error) {
      Logger.error(`[StockService] Kritischer Fehler im Sync-Prozess für ${ticker}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Die Hauptfunktion, die vom Controller/Frontend aufgerufen wird,
   * wenn ein User auf einen Ticker im Intelligence Board klickt.
   */
  async getIntelligenceData(ticker) {
    try {
      Logger.info(`[StockService] Lade Intelligence-Daten für: ${ticker}`);

      // 1. ECHTZEIT-DATEN HOLEN (Massive - Prio 1) - Wrapped in try-catch
      let realtimeData = { price: 0, change: 0 };
      try {
        realtimeData = await this.getRealtimeQuote(ticker);
      } catch (err) {
        Logger.error(`[StockService] Fehler beim Laden der Echtzeit-Daten für ${ticker}: ${err.message}`);
      }

      // 2. HISTORISCHE DATEN (Hybrid-Logik: AV vs. Massive)
      const lastRecordDate = await historicalDataDAO.getLastRecordDate(ticker);
      const todayStr = new Date().toISOString().split('T')[0];

      if (!lastRecordDate) {
        // Fall A: Keine Daten vorhanden -> Initiale Betankung (5 Jahre) über Alpha Vantage
        Logger.info(`[StockService] Keine Historie für ${ticker}. Hole 5 Jahre von AV...`);
        const historyRaw = await alphaVantageRepo.getDailyHistory(ticker);
        const mappedHistory = this._mapAlphaVantageHistory(historyRaw);
        await historicalDataDAO.insertMany(ticker, mappedHistory, 'AV');
        
      } else if (lastRecordDate < todayStr) {
        // Fall B: Daten vorhanden, aber Lücke -> Update über Massive
        Logger.info(`[StockService] Historie für ${ticker} veraltet (Stand: ${lastRecordDate}). Hole Diffs von Massive...`);
        const historyRaw = await MassiveRepo.getHistoricalData(ticker, lastRecordDate, todayStr);
        const mappedHistory = this._mapMassiveHistory(historyRaw);
        await historicalDataDAO.insertMany(ticker, mappedHistory, 'MASSIVE');
      }

      // Lade die nun vollständige Historie aus unserer SQLite-Datenbank für das Chart
      const finalHistory = await historicalDataDAO.getHistoryForChart(ticker);

      // 3. FUNDAMENTALDATEN HOLEN & UPDATEN
      let metadata = await intelligenceDAO.getMetadata(ticker);
      
      if (!metadata || this._isDataStale(metadata.last_updated_fundamentals, 30)) {
        // Fundamentaldaten fehlen oder sind älter als 30 Tage -> AV fragen
        Logger.info(`[StockService] Fundamentals für ${ticker} veraltet. Hole von AV...`);
        const fundamentalsRaw = await alphaVantageRepo.getFundamentalsOverview(ticker);
        const mappedFundamentals = this._mapAlphaVantageFundamentals(fundamentalsRaw);
        
        await intelligenceDAO.upsertMetadata(ticker, mappedFundamentals);
        metadata = await intelligenceDAO.getMetadata(ticker); // Frisch aus der DB laden
      }

      // 4. SENTIMENT (Die im Hintergrund geladenen Scores aus der DB holen)
      const sentimentHistory = await intelligenceDAO.getLatestSentiment(ticker, 5);

      // 5. TECHNISCHE INDIKATOREN (OBV)
      let obvData = null;
      try {
        const obvRaw = await alphaVantageRepo.getOBV(ticker);
        obvData = this._mapAlphaVantageOBV(obvRaw);
      } catch (err) {
        Logger.warn(`[StockService] OBV konnte für ${ticker} nicht geladen werden: ${err.message}`);
      }

      // 6. KORRELATIONEN (Basiswerte wie BTC, Gold etc.)
      const correlations = await intelligenceDAO.getCorrelations(ticker);
      const linkedData = [];

      if (correlations && correlations.length > 0) {
          for (const corr of correlations) {
              try {
                  const linkedQuote = await this.getRealtimeQuote(corr.linked_ticker);
                  linkedData.push({
                      symbol: corr.linked_ticker,
                      price: linkedQuote.price,
                      change: linkedQuote.change,
                      correlation_score: corr.correlation_score
                  });
              } catch (err) {
                  Logger.warn(`[StockService] Konnte Korrelations-Daten für ${corr.linked_ticker} nicht laden: ${err.message}`);
              }
          }
      }

      // 6. DATEN FÜRS FRONTEND ZUSAMMENBAUEN (DTO)
      return {
        ticker: ticker.toUpperCase(),
        currentPrice: realtimeData.price, 
        change: realtimeData.change,
        lastUpdated: new Date().toISOString(),
        fundamentals: metadata,
        sentiment: sentimentHistory,
        history: finalHistory,
        correlations: linkedData,
        indicators: {
          obv: obvData
        }
      };

    } catch (error) {
      Logger.error(`[StockService] Fehler beim Laden der Daten für ${ticker}: ${error.message}`);
      throw error; 
    }
  }

  /**
   * Berechnet die Korrelations-Scores für einen Ticker neu,
   * basierend auf den in der DB vorhandenen historischen Daten.
   */
  async recalculateCorrelations(ticker) {
    try {
      const correlations = await intelligenceDAO.getCorrelations(ticker);
      if (!correlations || correlations.length === 0) return;

      const mainHistory = await historicalDataDAO.getHistoryForChart(ticker);
      if (mainHistory.length < 10) return;

      Logger.info(`[StockService] Berechne Korrelationen für ${ticker} neu...`);

      for (const corr of correlations) {
        const linkedHistory = await historicalDataDAO.getHistoryForChart(corr.linked_ticker);
        
        if (linkedHistory.length >= 10) {
          const result = analysisService.calculateCorrelation(mainHistory, linkedHistory);
          
          await intelligenceDAO.upsertCorrelation(
            ticker, 
            corr.linked_ticker, 
            result.correlation
          );
          
          Logger.info(`[StockService] Korrelation ${ticker} <-> ${corr.linked_ticker}: ${result.correlation} (${result.quality})`);
        }
      }
    } catch (err) {
      Logger.error(`[StockService] Fehler bei der Korrelations-Berechnung für ${ticker}: ${err.message}`);
    }
  }

  /**
   * Prüft, ob die Daten in der DB älter als X Tage sind.
   */
  _isDataStale(lastUpdated, days = 1) {
    if (!lastUpdated) return true;
    const timeLimit = days * 24 * 60 * 60 * 1000;
    return (new Date() - new Date(lastUpdated)) > timeLimit;
  }

  /**
   * Harmonisiert die Alpha Vantage Historie
   */
  _mapAlphaVantageHistory(rawData) {
    const timeSeries = rawData['Time Series (Daily)'];
    if (!timeSeries) return [];

    return Object.keys(timeSeries).slice(0, 1250).map(date => { 
      const dayData = timeSeries[date];
      return {
        date: date,
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        adjustedClose: parseFloat(dayData['5. adjusted close']),
        volume: parseInt(dayData['6. volume'], 10)
      };
    });
  }

  /**
   * Harmonisiert die Massive Historie
   */
  _mapMassiveHistory(rawData) {
    // Massive API Mapping: Wir erwarten hier das Format von Massive
    const data = Array.isArray(rawData) ? rawData : (rawData.data || []);
    
    if (data.length === 0) {
        Logger.warn("StockService: MassiveRepo lieferte leeres Array für Ticker");
    }

    return data.map(item => ({
      date: item.date, 
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      vwap: item.vwap || null
    }));
  }

  /**
   * Harmonisiert das Alpha Vantage Sentiment
   */
  _mapAlphaVantageSentiment(rawData, ticker) {
    if (!rawData || !rawData.feed) return [];
    
    return rawData.feed.map(item => {
      // Suche den Ticker im Ticker-Sentiment-Array
      const tickerData = item.ticker_sentiment.find(t => t.ticker === ticker);
      return {
        timestamp: this._formatAVTimestamp(item.time_published),
        sentiment_score: parseFloat(item.overall_sentiment_score),
        relevance_score: tickerData ? parseFloat(tickerData.relevance_score) : 0
      };
    });
  }

  /**
   * Hilfsfunktion zum Formatieren von AV Zeitstempeln (YYYYMMDDTHHMMSS -> ISO)
   */
  _formatAVTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    const year = ts.substring(0, 4);
    const month = ts.substring(4, 6);
    const day = ts.substring(6, 8);
    const hour = ts.substring(9, 11);
    const min = ts.substring(11, 13);
    const sec = ts.substring(13, 15);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
  }

  /**
   * Harmonisiert die Alpha Vantage OBV Daten
   */
  _mapAlphaVantageOBV(rawData) {
    if (!rawData || !rawData['Technical Analysis: OBV']) return null;
    const timeSeries = rawData['Technical Analysis: OBV'];
    const latestDate = Object.keys(timeSeries)[0];
    return {
      value: parseFloat(timeSeries[latestDate].OBV),
      date: latestDate
    };
  }

  /**
   * Harmonisiert die Alpha Vantage Fundamentaldaten
   */
  _mapAlphaVantageFundamentals(rawData) {
    if (!rawData || !rawData.Symbol) return {};
    return {
      asset_type: rawData.AssetType || 'STOCK',
      market_cap: rawData.MarketCapitalization,
      debt_equity: rawData.DebtToEquity || null,
      revenue_growth: rawData.QuarterlyRevenueGrowthYOY || null
    };
  }
}

module.exports = new StockService();
