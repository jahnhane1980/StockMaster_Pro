// server/controllers/WatchlistController.js
const { db } = require('../db/Database');
const TickerRepository = require('../repositories/TickerRepository');
const StockService = require('../services/StockService');
const IntelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const { StockMasterError } = require('../utils/Errors');

/**
 * Controller für die Verwaltung der Watchlist und des Intelligence Boards.
 */
class WatchlistController {
  
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
    const symbolRegex = /^[A-Za-z0-9]{1,10}$/;
    if (!symbol || !symbolRegex.test(symbol)) {
      Logger.warn(`[WatchlistController] Ungültiges Symbol abgelehnt: ${symbol}`);
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        success: false, 
        data: null,
        error: 'Ungültiges Symbol. Nur alphanumerische Zeichen (max. 10) erlaubt.' 
      });
    }

    const ticker = symbol.toUpperCase();

    try {
      // 1. Ticker in der Datenbank speichern (Initialer Eintrag)
      TickerRepository.upsertTicker({ 
        symbol: ticker, 
        name: name || '' 
      });

      // Log für den Sync-Start
      Logger.info(`Background-Sync gestartet für Symbol: ${ticker}`);
      
      // 2. Hintergrund-Sync anstoßen (ohne await, um UI nicht zu blockieren)
      StockService.syncTickerData(ticker).catch(e => {
        Logger.error(`[WatchlistController] Hintergrund-Sync Fehler für ${ticker}: ${e.message}`);
      });

      // Antwort an das Frontend (Regel 13)
      return res.status(HttpStatus.OK).json({ 
        success: true,
        data: { message: `${ticker} zur Watchlist hinzugefügt. Daten werden im Hintergrund synchronisiert.` },
        error: null
      });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Hinzufügen: ${err.message}`);
      return res.status(HttpStatus.SERVER_ERROR).json({ 
        success: false, 
        data: null, 
        error: 'Interner Serverfehler beim Speichern des Tickers.' 
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
        success: false, 
        data: null, 
        error: 'Haupt-Ticker oder verknüpfter Ticker fehlt.' 
      });
    }

    // Score Validierung (Regel 4)
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < -1 || numericScore > 1) {
      Logger.warn(`[WatchlistController] Ungültiger Korrelations-Score: ${score}`);
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        success: false, 
        data: null,
        error: 'Score muss eine Zahl zwischen -1 und 1 sein.' 
      });
    }

    try {
      IntelligenceDAO.upsertCorrelation(
        mainTicker.toUpperCase(), 
        linkedTicker.toUpperCase(), 
        numericScore
      );

      return res.status(HttpStatus.OK).json({ 
        success: true, 
        data: null, 
        error: null 
      });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Erstellen der Korrelation: ${err.message}`);
      return res.status(HttpStatus.SERVER_ERROR).json({ 
        success: false, 
        data: null, 
        error: 'Interner Serverfehler.' 
      });
    }
  }

  /**
   * Wird aufgerufen, wenn im Frontend auf eine Aktie geklickt wird (Board-Daten laden).
   * GET /api/intelligence/:ticker
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit dem aggregierten Datenpaket (DTO) (Regel 13).
   */
  async getIntelligenceBoard(req, res) {
    const ticker = req.params.ticker.toUpperCase();

    try {
      // StockService aggregiert Daten von verschiedenen Providern und aus der DB.
      const intelligenceData = await StockService.getIntelligenceData(ticker);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: intelligenceData,
        error: null
      });
    } catch (error) {
      Logger.error(`[WatchlistController] Fehler Board für ${ticker}: ${error.message}`);
      
      if (error instanceof StockMasterError) {
        return res.status(error.statusCode).json({ 
          success: false,
          data: null,
          error: error.message 
        });
      }
      
      return res.status(HttpStatus.SERVER_ERROR).json({ 
        success: false,
        data: null,
        error: 'Interner Serverfehler beim Laden der Board-Daten.' 
      });
    }
  }
}

module.exports = new WatchlistController();
