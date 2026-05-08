// server/controllers/IntelligenceController.js
const HistoricalDataDAO = require('../models/HistoricalDataDAO');
const AnalysisService = require('../services/AnalysisService');
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
   * Berechnet Korrelationen eines Symbols zu Markt-Benchmarks (BTC, Gold).
   * GET /api/intelligence/correlations/:symbol
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit Korrelations-Scores (Regel 13).
   */
  async getMarketCorrelations(req, res) {
    const symbol = req.params.symbol ? req.params.symbol.toUpperCase() : null;

    // Strikte Validierung (Regel 4 & 12)
    if (!symbol || !VALIDATION.SYMBOL_REGEX.test(symbol)) {
      Logger.warn(`[IntelligenceController] Ungültiges Symbol abgelehnt: ${symbol}`);
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null,
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_INVALID_SYMBOL 
      });
    }

    try {
      Logger.info(`[IntelligenceController] Berechne Markt-Korrelationen für: ${symbol}`);

      // 1. Historische Daten abrufen: Basis für die mathematische Korrelation
      const mainHistory = await HistoricalDataDAO.getHistoryForChart(symbol);
      const btcHistory = await HistoricalDataDAO.getHistoryForChart('BTC');
      const goldHistory = await HistoricalDataDAO.getHistoryForChart('GOLD');

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
        correlations.btc = AnalysisService.calculateCorrelation(mainHistory, btcHistory);
      } else {
        correlations.btc = { correlation: 0, quality: 'Keine BTC-Referenzdaten' };
      }

      if (goldHistory && goldHistory.length >= CONFIG.MIN_HISTORY_POINTS) {
        correlations.gold = AnalysisService.calculateCorrelation(mainHistory, goldHistory);
      } else {
        correlations.gold = { correlation: 0, quality: 'Keine Gold-Referenzdaten' };
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
      Logger.error(`[IntelligenceController] Fehler bei Korrelations-Abfrage für ${symbol}: ${error.message}`);
      
      if (error instanceof StockMasterError) {
        return res.status(error.statusCode).json({ 
          [RESPONSE_KEYS.SUCCESS]: false,
          [RESPONSE_KEYS.DATA]: null,
          [RESPONSE_KEYS.ERROR]: error.message 
        });
      }

      return res.status(HttpStatus.SERVER_ERROR).json({ 
        [RESPONSE_KEYS.SUCCESS]: false,
        [RESPONSE_KEYS.DATA]: null,
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_CORRELATION_FAILED 
      });
    }
  }
}

module.exports = new IntelligenceController();
