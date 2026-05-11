const HttpClient = require('../utils/HttpClient');
const MESSAGES = require('../utils/Messages');
const { ProviderLimitError, ResourceNotFoundError } = require('../utils/Errors');
const { PROVIDER, API, LOG } = require('../utils/AppConstants');

/**
 * Basis-Klasse für AlphaVantage Repositories.
 * Kapselt die technische API-Kommunikation und Fehlerbehandlung.
 */
class AVBaseRepo {
  /**
   * Erstellt eine Instanz des AVBaseRepo.
   * @param {Object} logger - Die Logger-Instanz.
   * @param {Object} requestManager - Der RequestManager für Queueing.
   */
  constructor(logger, requestManager) {
    this.logger = logger;
    this.requestManager = requestManager;
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY;
    this.baseUrl = API.ALPHA_VANTAGE.BASE_URL;
    this.providerName = PROVIDER.ALPHA_VANTAGE;
  }

  /**
   * Hilfsfunktion für den eigentlichen API-Call.
   * Prüft die Antwort auf provider-spezifische Error-Messages (Rate-Limits).
   * @param {Object} params - Die Query-Parameter für die API.
   * @returns {Promise<Object|null>} - Die Rohdaten der API oder null.
   * @protected
   */
  async _fetchFromAPI(params) {
    const symbol = params.symbol || params.tickers || 'N/A';
    const endpoint = params.function || 'N/A';
    const className = this.constructor.name;

    this.logger.info(`[${className}] Requesting ${endpoint} for ${symbol}...`);

    try {
      const urlParams = new URLSearchParams({
        ...params,
        apikey: this.apiKey
      });
      
      const response = await HttpClient.get(`${this.baseUrl}?${urlParams.toString()}`);
      const data = response.data;
      
      this.logger.info(`[${className}] Response Received - Status: ${response.status}`);

      // Alpha Vantage gibt bei Limits oft 200 OK zurück, aber mit einer Info-Message im Body
      if (data && data.Information && data.Information.includes('rate limit')) {
        throw new ProviderLimitError(MESSAGES.ERR_AV_DAILY_LIMIT);
      }
      
      if (data && data.Note && data.Note.includes('API call frequency')) {
        throw new ProviderLimitError(MESSAGES.ERR_AV_MINUTE_LIMIT);
      }

      // Fehlerprüfung für ungültige Symbole oder fehlende Daten
      if (data && (data['Error Message'] || (Object.keys(data).length === 0))) {
        throw new ResourceNotFoundError(`${MESSAGES.ERR_AV_NO_DATA} ${symbol}`);
      }

      return data;
    } catch (error) {
      const statusCode = error.response ? error.response.status : 'N/A';
      this.logger.error(`[${className}] API Error for ${symbol} - Status: ${statusCode} - Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reicht einen Task an den RequestManager ein und loggt den Trace.
   * @param {string} priority - Die Priorität (P1-P3).
   * @param {string} symbol - Das Ticker-Symbol für das Tracing.
   * @param {Function} taskFn - Die asynchrone Task-Funktion.
   * @returns {Promise<any>}
   * @protected
   */
  _enqueue(priority, symbol, taskFn) {
    const queueSize = this.requestManager.getQueueSize();
    this.logger.info(LOG.TRACE.REPO_HANDOVER, symbol, queueSize);
    return this.requestManager.enqueue(priority, this.providerName, taskFn);
  }
}

module.exports = AVBaseRepo;
