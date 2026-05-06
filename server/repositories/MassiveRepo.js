// server/repositories/MassiveRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');

class MassiveRepo {
  constructor() {
    this.apiKey = process.env.MASSIVE_API_KEY;
    // Standard REST Base-URL laut Massive Quickstart Docs
    this.baseUrl = 'https://api.massive.com/v1'; 
    this.providerName = 'MASSIVE';
  }

  /**
   * Hilfsfunktion für den eigentlichen API-Call an Massive
   */
  async _fetchFromAPI(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          // Die genaue Auth-Methode hängt von den Massive-Docs ab, oft Bearer Token oder x-api-key Header
          'Authorization': `Bearer ${this.apiKey}`, 
          'Accept': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      // Spezielles Error-Handling für Massive, falls sie 429 werfen
      if (error.response && error.response.status === 429) {
        throw new Error('MASSIVE_LIMIT_REACHED');
      }
      throw error;
    }
  }

  /**
   * Holt den absoluten Echtzeit-Kurs für das Board (Höchste Prio: P1)
   */
  async getRealtimeQuote(ticker) {
    // Endpunkt ist ein Platzhalter basierend auf typischen REST-Strukturen
    const task = () => this._fetchFromAPI(`/stocks/${ticker}/quote`);

    console.log(`[MassiveRepo] Queueing Realtime Quote for ${ticker} (P1)`);
    return requestManager.enqueue('P1', this.providerName, task);
  }

  /**
   * Holt Intraday-Daten (z.B. für VWAP Berechnung im Intelligence Board) (Prio: P1)
   */
  async getIntradayData(ticker) {
    const task = () => this._fetchFromAPI(`/stocks/${ticker}/intraday`, {
      interval: '5m' // 5-Minuten Kerzen für den heutigen Tag
    });

    console.log(`[MassiveRepo] Queueing Intraday Data for ${ticker} (P1)`);
    return requestManager.enqueue('P1', this.providerName, task);
  }

  /**
   * Holt historische Tagesdaten für einen bestimmten Zeitraum (Prio: P2)
   * Wird genutzt, um die Lücke zwischen dem letzten DB-Eintrag und heute zu füllen.
   */
  async getHistoricalData(ticker, fromDate, toDate) {
    const task = () => this._fetchFromAPI(`/stocks/${ticker}/history`, {
      from: fromDate,
      to: toDate,
      interval: '1d'
    });

    console.log(`[MassiveRepo] Queueing History Diff for ${ticker} (${fromDate} to ${toDate}) (P2)`);
    return requestManager.enqueue('P2', this.providerName, task);
  }
}

module.exports = new MassiveRepo();