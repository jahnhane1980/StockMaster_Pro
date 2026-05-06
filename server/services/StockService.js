// server/services/StockService.js
const alphaVantageRepo = require('../repositories/AlphaVantageRepo');
const massiveRepo = require('../repositories/MassiveRepo');
const historicalDataDAO = require('../models/HistoricalDataDAO');
const intelligenceDAO = require('../models/IntelligenceDAO');

class StockService {
  
  /**
   * Die Hauptfunktion, die vom Controller/Frontend aufgerufen wird,
   * wenn ein User auf einen Ticker im Intelligence Board klickt.
   */
  async getIntelligenceData(ticker) {
    try {
      console.log(`[StockService] Lade Intelligence-Daten für: ${ticker}`);

      // 1. ECHTZEIT-DATEN HOLEN (Massive - Prio 1)
      const realtimeData = await massiveRepo.getRealtimeQuote(ticker);

      // 2. HISTORISCHE DATEN (Hybrid-Logik: AV vs. Massive)
      const lastRecordDate = await historicalDataDAO.getLastRecordDate(ticker);
      const todayStr = new Date().toISOString().split('T')[0];

      if (!lastRecordDate) {
        // Fall A: Keine Daten vorhanden -> Initiale Betankung (5 Jahre) über Alpha Vantage
        console.log(`[StockService] Keine Historie für ${ticker}. Hole 5 Jahre von AV...`);
        const historyRaw = await alphaVantageRepo.getDailyHistory(ticker);
        const mappedHistory = this._mapAlphaVantageHistory(historyRaw);
        await historicalDataDAO.insertMany(ticker, mappedHistory, 'AV');
        
      } else if (lastRecordDate < todayStr) {
        // Fall B: Daten vorhanden, aber Lücke -> Update über Massive
        console.log(`[StockService] Historie für ${ticker} veraltet (Stand: ${lastRecordDate}). Hole Diffs von Massive...`);
        // Beachte: Massive Repo muss den Zeitraum von lastRecordDate bis heute abfragen
        const historyRaw = await massiveRepo.getHistoricalData(ticker, lastRecordDate, todayStr);
        const mappedHistory = this._mapMassiveHistory(historyRaw);
        await historicalDataDAO.insertMany(ticker, mappedHistory, 'MASSIVE');
      }

      // Lade die nun vollständige Historie aus unserer SQLite-Datenbank für das Chart
      const finalHistory = await historicalDataDAO.getHistoryForChart(ticker);


      // 3. FUNDAMENTALDATEN HOLEN & UPDATEN
      let metadata = await intelligenceDAO.getMetadata(ticker);
      
      if (!metadata || this._isDataStale(metadata.last_updated_fundamentals, 30)) {
        // Fundamentaldaten fehlen oder sind älter als 30 Tage -> AV fragen
        console.log(`[StockService] Fundamentals für ${ticker} veraltet. Hole von AV...`);
        const fundamentalsRaw = await alphaVantageRepo.getFundamentalsOverview(ticker);
        const mappedFundamentals = this._mapAlphaVantageFundamentals(fundamentalsRaw);
        
        await intelligenceDAO.upsertMetadata(ticker, mappedFundamentals);
        metadata = await intelligenceDAO.getMetadata(ticker); // Frisch aus der DB laden
      }

      // 4. SENTIMENT (Die im Hintergrund geladenen Scores aus der DB holen)
      const sentimentHistory = await intelligenceDAO.getLatestSentiment(ticker, 5);


      // 5. DATEN FÜRS FRONTEND ZUSAMMENBAUEN (DTO)
      return {
        ticker: ticker.toUpperCase(),
        currentPrice: realtimeData.price, // An Massive JSON-Struktur anpassen
        change: realtimeData.change,
        lastUpdated: new Date().toISOString(),
        fundamentals: metadata,
        sentiment: sentimentHistory,
        history: finalHistory
      };

    } catch (error) {
      console.error(`[StockService] Fehler beim Laden der Daten für ${ticker}:`, error.message);
      throw error; 
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
    // ACHTUNG: Dies ist ein Platzhalter! 
    // Du musst hier die genauen Feldnamen der Massive API eintragen.
    if (!rawData || !rawData.data) return [];

    return rawData.data.map(item => ({
      date: item.date, // z.B. '2024-05-15'
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      vwap: item.vwap || null
    }));
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