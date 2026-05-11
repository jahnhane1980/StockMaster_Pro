// server/repositories/MassiveRepo.js
const axios = require('axios');
const requestManager = require('../services/RequestManager');
const MarketDataMapper = require('../utils/MarketDataMapper');
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const { PRIORITY, PROVIDER, API, INTERNAL_ERR, TECH, LOG } = require('../utils/AppConstants');

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
   * @param {string} [symbol='N/A'] - Das Symbol für das Logging.
   * @returns {Promise<Object|null>} - Die Antwortdaten der API.
   * @private
   */
  async _fetchFromAPI(endpoint, params = {}, symbol = 'N/A') {
    const className = 'MassiveRepo';
    Logger.info(`[${className}] Requesting ${endpoint} for ${symbol}...`);

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': TECH.MIME_JSON
        }
      });

      Logger.info(`[${className}] Response Received - Status: ${response.status}`);
      return response.data;
    } catch (error) {
      const statusCode = error.response ? error.response.status : 'N/A';
      Logger.error(`[${className}] API Error for ${symbol} - Status: ${statusCode} - Error: ${error.message}`);
      
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
    const endpoint = `/v2/aggs/ticker/${symbol}/prev`;
    const task = async () => {
      const rawData = await this._fetchFromAPI(endpoint, {}, symbol);
      if (!rawData || !rawData.results || rawData.results.length === 0) return null;
      
      const result = rawData.results[0];
      // Nutzt den zentralen Mapper (Regel 1)
      return MarketDataMapper.toQuote(symbol, result.c, result.o, result.v, result.t);
    };

    Logger.info(`[MassiveRepo] Queueing Realtime Quote (v2) for ${symbol} (${PRIORITY.CRITICAL})`);
    Logger.info(LOG.TRACE.REPO_HANDOVER, symbol, requestManager.getQueueSize());
    return requestManager.enqueue(PRIORITY.CRITICAL, this.providerName, task);
  }

  /**
   * Holt Intraday-Daten (z.B. für VWAP Berechnung im Intelligence Board) (Prio: PRIORITY.CRITICAL).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Die Intraday-Zeitreihe.
   */
  async getIntradayData(ticker) {
    const symbol = ticker.toUpperCase();
    const endpoint = `/stocks/${symbol}/intraday`;
    const task = () => this._fetchFromAPI(endpoint, {
      interval: API.MASSIVE_PARAMS.INTERVAL_5M // 5-Minuten Kerzen für den heutigen Tag
    }, symbol);

    Logger.info(`[MassiveRepo] Queueing Intraday Data for ${symbol} (${PRIORITY.CRITICAL})`);
    Logger.info(LOG.TRACE.REPO_HANDOVER, symbol, requestManager.getQueueSize());
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
    const symbol = ticker.toUpperCase();
    const endpoint = `/stocks/${symbol}/history`;
    const task = () => this._fetchFromAPI(endpoint, {
      from: fromDate,
      to: toDate,
      interval: API.MASSIVE_PARAMS.INTERVAL_1D
    }, symbol);

    Logger.info(`[MassiveRepo] Queueing History Diff for ${symbol} (${fromDate} to ${toDate}) (${PRIORITY.CRITICAL})`);
    Logger.info(LOG.TRACE.REPO_HANDOVER, symbol, requestManager.getQueueSize());
    return requestManager.enqueue(PRIORITY.CRITICAL, this.providerName, task);
  }
}

module.exports = new MassiveRepo();
