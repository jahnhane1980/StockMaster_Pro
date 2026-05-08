// server/repositories/MassiveRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');
const MarketDataMapper = require('../utils/MarketDataMapper');
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const { PRIORITY, PROVIDER, API, INTERNAL_ERR, TECH } = require('../utils/AppConstants');

/**
 * Repository für den Zugriff auf die Massive API (Hochverfügbare Marktdaten).
 * Wird primär für Echtzeit-Kurse und Intraday-Daten mit hoher Priorität (PRIORITY.CRITICAL) genutzt.
 */
class MassiveRepo {
  constructor() {
    this.apiKey = process.env.MASSIVE_API_KEY;
    this.baseUrl = API.MASSIVE.BASE_URL;
    this.providerName = PROVIDER.MASSIVE;
  }

  /**
   * Hilfsfunktion für den eigentlichen API-Call an Massive.
   * @param {string} endpoint - Der API-Endpunkt.
   * @param {Object} [params={}] - Optionale Query-Parameter.
   * @returns {Promise<Object|null>} - Die Antwortdaten der API.
   * @private
   */
  async _fetchFromAPI(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': TECH.MIME_JSON
        }
      });

      return response.data;
    } catch (error) {
      if (error.response && error.response.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw new Error(INTERNAL_ERR.MASSIVE_LIMIT);
      }
      throw error;
    }
  }

  /**
   * Holt den absoluten Echtzeit-Kurs für das Board (Höchste Prio: PRIORITY.CRITICAL).
   * Nutzt nun den Aggregat-Endpunkt für den letzten Handelstag (Regel 15).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das harmonisierte Kurs-Objekt.
   */
  async getRealtimeQuote(ticker) {
    const symbol = ticker.toUpperCase();
    const task = async () => {
      const rawData = await this._fetchFromAPI(`/v2/aggs/ticker/${symbol}/prev`);
      if (!rawData || !rawData.results || rawData.results.length === 0) return null;
      
      const result = rawData.results[0];
      // Nutzt den zentralen Mapper (Regel 1)
      return MarketDataMapper.toQuote(symbol, result.c, result.o, result.v, result.t);
    };

    Logger.info(`[MassiveRepo] Queueing Realtime Quote (v2) for ${symbol} (${PRIORITY.CRITICAL})`);
    return requestManager.enqueue(PRIORITY.CRITICAL, this.providerName, task);
  }

  /**
   * Holt Intraday-Daten (z.B. für VWAP Berechnung im Intelligence Board) (Prio: PRIORITY.CRITICAL).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Die Intraday-Zeitreihe.
   */
  async getIntradayData(ticker) {
    const task = () => this._fetchFromAPI(`/stocks/${ticker}/intraday`, {
      interval: API.MASSIVE_PARAMS.INTERVAL_5M // 5-Minuten Kerzen für den heutigen Tag
    });

    Logger.info(`[MassiveRepo] Queueing Intraday Data for ${ticker} (${PRIORITY.CRITICAL})`);
    return requestManager.enqueue(PRIORITY.CRITICAL, this.providerName, task);
  }

  /**
   * Holt historische Tagesdaten für einen bestimmten Zeitraum (Prio: PRIORITY.CRITICAL).
   * Wird genutzt, um die Lücke zwischen dem letzten DB-Eintrag und heute zu füllen.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} fromDate - Startdatum (YYYY-MM-DD).
   * @param {string} toDate - Enddatum (YYYY-MM-DD).
   * @returns {Promise<Object|null>} - Die historischen Kursdaten.
   */
  async getHistoricalData(ticker, fromDate, toDate) {
    const task = () => this._fetchFromAPI(`/stocks/${ticker}/history`, {
      from: fromDate,
      to: toDate,
      interval: API.MASSIVE_PARAMS.INTERVAL_1D
    });

    Logger.info(`[MassiveRepo] Queueing History Diff for ${ticker} (${fromDate} to ${toDate}) (${PRIORITY.CRITICAL})`);
    return requestManager.enqueue(PRIORITY.CRITICAL, this.providerName, task);
  }
}

module.exports = new MassiveRepo();
