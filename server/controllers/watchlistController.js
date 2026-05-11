// server/controllers/WatchlistController.js
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const MESSAGES = require('../utils/Messages');
const { StockMasterError } = require('../utils/Errors');
const { TECH, CONFIG, RESPONSE_KEYS, VALIDATION } = require('../utils/AppConstants');

/**
 * Controller für die Verwaltung der Watchlist und des Intelligence Boards.
 */
class WatchlistController {
  
  /**
   * Erstellt eine Instanz des WatchlistController.
   * @param {Object} stockService - Der Service für Aktien-Operationen.
   * @param {Object} tickerRepository - Repository für Ticker-Stammdaten.
   * @param {Object} intelligenceDAO - DAO für Intelligence-Daten.
   */
  constructor(stockService, tickerRepository, intelligenceDAO) {
    this.stockService = stockService;
    this.tickerRepository = tickerRepository;
    this.intelligenceDAO = intelligenceDAO;
  }

  /**
   * Wird aufgerufen, wenn das Frontend einen neuen Ticker hinzufügt.
   * POST /api/watchlist
   * 
   * @param {Object} req - Das Express Request-Objekt. Erwartet { symbol: string, name?: string } im Body.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit Erfolgsstatus (Regel 13).
   */
  async addTickerToWatchlist(req, res) {
    const { symbol, name } = req.body;

    // Strikte Validierung (Regel 4 & 12)
    if (!symbol || !VALIDATION.SYMBOL_REGEX.test(symbol)) {
      Logger.warn(`[WatchlistController] Ungültiges Symbol abgelehnt: ${symbol}`);
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null,
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_INVALID_SYMBOL 
      });
    }

    const ticker = symbol.toUpperCase();

    try {
      // 1. Ticker in der Datenbank speichern (Initialer Eintrag)
      this.tickerRepository.upsertTicker({ 
        symbol: ticker, 
        name: name || TECH.EMPTY_STRING 
      });

      // Log für den Sync-Start
      Logger.info(`Background-Sync gestartet für Symbol: ${ticker}`);
      
      // 2. Hintergrund-Sync anstoßen (ohne await, um UI nicht zu blockieren)
      this.stockService.syncTickerData(ticker).catch(e => {
        Logger.error(`[WatchlistController] Hintergrund-Sync Fehler für ${ticker}: ${e.message}`);
      });

      // Antwort an das Frontend (Regel 13)
      return res.status(HttpStatus.OK).json({ 
        [RESPONSE_KEYS.SUCCESS]: true,
        [RESPONSE_KEYS.DATA]: { message: `${ticker} ${MESSAGES.MSG_TICKER_ADDED} ${MESSAGES.MSG_SYNC_STARTED}` },
        [RESPONSE_KEYS.ERROR]: null
      });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Hinzufügen: ${err.message}`);
      return res.status(HttpStatus.SERVER_ERROR).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null, 
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_SAVE_TICKER_FAILED 
      });
    }
  }

  /**
   * Verknüpft einen Ticker mit einem Basiswert (Korrelation).
   * POST /api/correlations
   * 
   * @param {Object} req - Das Express Request-Objekt. Erwartet { mainTicker, linkedTicker, score } im Body.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet JSON-Erfolgsstatus (Regel 13).
   */
  async addCorrelation(req, res) {
    const { mainTicker, linkedTicker, score } = req.body;

    if (!mainTicker || !linkedTicker) {
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null, 
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_MISSING_TICKERS 
      });
    }

    // Score Validierung (Regel 4)
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < CONFIG.SCORE_THRESHOLDS.NEGATIVE || numericScore > CONFIG.SCORE_THRESHOLDS.POSITIVE) {
      Logger.warn(`[WatchlistController] Ungültiger Korrelations-Score: ${score}`);
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null,
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_INVALID_SCORE 
      });
    }

    try {
      this.intelligenceDAO.upsertCorrelation(
        mainTicker.toUpperCase(), 
        linkedTicker.toUpperCase(), 
        numericScore
      );

      return res.status(HttpStatus.OK).json({ 
        [RESPONSE_KEYS.SUCCESS]: true, 
        [RESPONSE_KEYS.DATA]: null, 
        [RESPONSE_KEYS.ERROR]: null 
      });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Erstellen der Korrelation: ${err.message}`);
      return res.status(HttpStatus.SERVER_ERROR).json({ 
        [RESPONSE_KEYS.SUCCESS]: false, 
        [RESPONSE_KEYS.DATA]: null, 
        [RESPONSE_KEYS.ERROR]: MESSAGES.ERR_INTERNAL_SERVER 
      });
    }
  }
}

module.exports = WatchlistController;
