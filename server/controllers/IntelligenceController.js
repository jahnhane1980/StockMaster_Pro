// server/controllers/IntelligenceController.js
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const MESSAGES = require('../utils/Messages');
const { StockMasterError } = require('../utils/Errors');
const { CONFIG, RESPONSE_KEYS, VALIDATION } = require('../utils/AppConstants');

/**
 * Controller für komplexe Markt-Analysen und Intelligence-Abfragen.
 */
class IntelligenceController {

  /**
   * Erstellt eine Instanz des IntelligenceController.
   * @param {Object} analysisService - Der Service für statistische Analysen.
   * @param {Object} historicalDataDAO - DAO für den Zugriff auf historische Daten.
   * @param {Object} stockService - Der Service für aggregierte Aktien-Daten.
   */
  constructor(analysisService, historicalDataDAO, stockService) {
    this.analysisService = analysisService;
    this.historicalDataDAO = historicalDataDAO;
    this.stockService = stockService;
  }

  /**
   * Aggregiert alle Intelligence-Daten für einen Ticker (Board-DTO).
   * GET /api/intelligence/:ticker (oder via Query-Param ticker oder symbol)
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet das aggregierte Board-DTO (Regel 13).
   */
  async getIntelligence(req, res) {
    const symbol = (req.params.ticker || req.query.ticker || req.query.symbol || '').toUpperCase();

    if (!symbol || !VALIDATION.SYMBOL_REGEX.test(symbol)) {
      return this._sendError(res, HttpStatus.BAD_REQUEST, MESSAGES.ERR_INVALID_SYMBOL);
    }

    try {
      // Delegiert die Aggregation an den StockService
      const intelligenceData = await this.stockService.getIntelligenceData(symbol);
      
      return res.status(HttpStatus.OK).json({
        [RESPONSE_KEYS.SUCCESS]: true,
        [RESPONSE_KEYS.DATA]: intelligenceData,
        [RESPONSE_KEYS.ERROR]: null
      });
    } catch (error) {
      return this._handleException(res, error, `Board für ${symbol}`);
    }
  }

  /**
   * Berechnet Korrelationen eines Symbols zu Markt-Benchmarks (BTC, Gold).
   * GET /api/intelligence/correlations/:symbol
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit Korrelations-Scores (Regel 13).
   */
  async getMarketCorrelations(req, res) {
    const symbol = (req.params.symbol || req.query.symbol || '').toUpperCase();

    // Strikte Validierung (Regel 4 & 12)
    if (!symbol || !VALIDATION.SYMBOL_REGEX.test(symbol)) {
      return this._sendError(res, HttpStatus.BAD_REQUEST, MESSAGES.ERR_INVALID_SYMBOL);
    }

    try {
      Logger.info(`[IntelligenceController] Berechne Markt-Korrelationen für: ${symbol}`);

      // 1. Historische Daten abrufen: Basis für die mathematische Korrelation
      const mainHistory = await this.historicalDataDAO.getHistoryForChart(symbol);
      const btcHistory = await this.historicalDataDAO.getHistoryForChart('BTC');
      const goldHistory = await this.historicalDataDAO.getHistoryForChart('GOLD');

      if (!mainHistory || mainHistory.length < CONFIG.MIN_HISTORY_POINTS) {
        return res.status(HttpStatus.BAD_REQUEST).json({ 
          [RESPONSE_KEYS.SUCCESS]: false,
          [RESPONSE_KEYS.DATA]: { symbol: symbol },
          [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_INSUFFICIENT_DATA
        });
      }

      // 2. Korrelationen berechnen: Pearson-Algorithmus via AnalysisService
      const correlations = {};

      if (btcHistory && btcHistory.length >= CONFIG.MIN_HISTORY_POINTS) {
        correlations.btc = this.analysisService.calculateCorrelation(mainHistory, btcHistory);
      } else {
        correlations.btc = { correlation: 0, quality: MESSAGES.MSG_QUALITY_NO_BTC };
      }

      if (goldHistory && goldHistory.length >= CONFIG.MIN_HISTORY_POINTS) {
        correlations.gold = this.analysisService.calculateCorrelation(mainHistory, goldHistory);
      } else {
        correlations.gold = { correlation: 0, quality: MESSAGES.MSG_QUALITY_NO_GOLD };
      }

      // 3. Antwort senden (Regel 13)
      return res.status(HttpStatus.OK).json({
        [RESPONSE_KEYS.SUCCESS]: true,
        [RESPONSE_KEYS.DATA]: {
          symbol: symbol,
          timestamp: new Date().toISOString(),
          correlations: correlations
        },
        [RESPONSE_KEYS.ERROR]: null
      });

    } catch (error) {
      return this._handleException(res, error, `Korrelations-Abfrage für ${symbol}`);
    }
  }

  /**
   * Zentrale Fehlerbehandlung für Exceptions (Regel 12).
   * @private
   */
  _handleException(res, error, context) {
    Logger.error(`[IntelligenceController] Fehler bei ${context}: ${error.message}`);
    
    if (error instanceof StockMasterError) {
      return this._sendError(res, error.statusCode, error.message);
    }
    
    const fallbackMsg = context.includes('Board') ? MESSAGES.ERR_BOARD_LOAD_FAILED : MESSAGES.ERR_CORRELATION_FAILED;
    return this._sendError(res, HttpStatus.SERVER_ERROR, fallbackMsg);
  }

  /**
   * Hilfsmethode zum Senden standardisierter Error-Antworten.
   * @private
   */
  _sendError(res, statusCode, message) {
    return res.status(statusCode).json({
      [RESPONSE_KEYS.SUCCESS]: false,
      [RESPONSE_KEYS.DATA]: null,
      [RESPONSE_KEYS.ERROR]: message
    });
  }
}

module.exports = IntelligenceController;
