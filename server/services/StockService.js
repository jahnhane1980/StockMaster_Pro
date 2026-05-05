// server/services/StockService.js
const alphaVantageRepo = require('../repositories/AlphaVantageRepo');
const massiveRepo = require('../repositories/MassiveRepo');

// HINWEIS: Hier würdest du deine echten Datenbank-Modelle importieren
// const Stock = require('../models/Stock'); 

class StockService {
  
  /**
   * Die Hauptfunktion, die vom Controller/Frontend aufgerufen wird,
   * wenn ein User auf einen Ticker im Intelligence Board klickt.
   */
  async getIntelligenceData(ticker) {
    try {
      console.log(`[StockService] Lade Intelligence-Daten für: ${ticker}`);

      // 1. ECHTZEIT-DATEN HOLEN (Massive - Prio 1)
      // Das wollen wir immer frisch haben, wenn das Board geöffnet wird.
      const realtimeData = await massiveRepo.getRealtimeQuote(ticker);

      // 2. DATENBANK-CHECK FÜR HISTORIE & FUNDAMENTALS
      // let dbRecord = await Stock.findOne({ ticker });
      let dbRecord = null; // Platzhalter: Tun wir so, als ob die DB noch leer ist

      let historicalData = [];
      let fundamentals = {};

      if (!dbRecord || this._isDataStale(dbRecord.lastUpdated)) {
        // Daten fehlen oder sind zu alt -> Alpha Vantage fragen (Prio 2 & 3)
        console.log(`[StockService] Daten für ${ticker} fehlen/veraltet. Hole von AV...`);

        // Wir feuern die Requests parallel ab, der RequestManager sortiert sie nach Prio!
        const [historyRaw, fundamentalsRaw] = await Promise.all([
          alphaVantageRepo.getDailyHistory(ticker),         // P2
          alphaVantageRepo.getFundamentalsOverview(ticker)  // P3
        ]);

        // Rohdaten harmonisieren
        historicalData = this._mapAlphaVantageHistory(historyRaw);
        fundamentals = this._mapAlphaVantageFundamentals(fundamentalsRaw);

        // 3. DATENBANK UPDATEN
        // await Stock.findOneAndUpdate(
        //   { ticker }, 
        //   { history: historicalData, fundamentals, lastUpdated: new Date() },
        //   { upsert: true }
        // );
      } else {
        // Wir haben frische Daten in der DB! Spart uns wertvolle API-Requests.
        console.log(`[StockService] Lade Historie & Fundamentals für ${ticker} aus der DB.`);
        historicalData = dbRecord.history;
        fundamentals = dbRecord.fundamentals;
      }

      // 4. DATEN FÜRS FRONTEND ZUSAMMENBAUEN (DTO - Data Transfer Object)
      return {
        ticker: ticker.toUpperCase(),
        currentPrice: realtimeData.price, // Je nach Massive-JSON Struktur anpassen
        change: realtimeData.change,
        lastUpdated: new Date().toISOString(),
        fundamentals: fundamentals,
        history: historicalData
      };

    } catch (error) {
      console.error(`[StockService] Fehler beim Laden der Daten für ${ticker}:`, error.message);
      // Wenn wir ein 429 Limit-Error bekommen, werfen wir ihn weiter zum Controller
      throw error; 
    }
  }

  /**
   * Prüft, ob die Daten in der DB älter als 24 Stunden sind.
   */
  _isDataStale(lastUpdated) {
    if (!lastUpdated) return true;
    const oneDay = 24 * 60 * 60 * 1000;
    return (new Date() - new Date(lastUpdated)) > oneDay;
  }

  /**
   * Harmonisiert die Alpha Vantage Historie in ein sauberes Array
   */
  _mapAlphaVantageHistory(rawData) {
    const timeSeries = rawData['Time Series (Daily)'];
    if (!timeSeries) return [];

    // Mappt das wilde AV-Objekt in ein sauberes Array: [{ date, close, volume }, ...]
    return Object.keys(timeSeries).slice(0, 1250).map(date => { // Max 5 Jahre (ca. 1250 Handelstage)
      const dayData = timeSeries[date];
      return {
        date: date,
        close: parseFloat(dayData['4. close']),
        adjustedClose: parseFloat(dayData['5. adjusted close']),
        volume: parseInt(dayData['6. volume'], 10)
      };
    });
  }

  /**
   * Harmonisiert die Alpha Vantage Fundamentaldaten
   */
  _mapAlphaVantageFundamentals(rawData) {
    if (!rawData || !rawData.Symbol) return {};
    return {
      marketCap: rawData.MarketCapitalization,
      peRatio: rawData.PERatio,
      eps: rawData.EPS,
      sector: rawData.Sector,
      industry: rawData.Industry
    };
  }
}

module.exports = new StockService();