// server/controllers/WatchlistController.js
const { db } = require('../db/Database');
const TickerRepository = require('../repositories/TickerRepository');
const StockService = require('../services/StockService');
const IntelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');
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
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit Erfolgsstatus.
   * Antwort-Schema: { success: boolean, message: string }
   */
  async addTickerToWatchlist(req, res) {
    const { symbol, name } = req.body;

    // Strikte Validierung (Regel 4 & 12)
    const symbolRegex = /^[A-Za-z0-9]{1,10}$/;
    if (!symbol || !symbolRegex.test(symbol)) {
      Logger.warn(`[WatchlistController] Ungültiges Symbol abgelehnt: ${symbol}`);
      return res.status(400).json({ 
        success: false, 
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
      // Der StockService kümmert sich um das Abrufen und Persistieren aller Daten.
      StockService.syncTickerData(ticker).catch(e => {
        Logger.error(`[WatchlistController] Hintergrund-Sync Fehler für ${ticker}: ${e.message}`);
      });

      // Antwort an das Frontend
      return res.status(200).json({ 
        success: true,
        message: `${ticker} zur Watchlist hinzugefügt. Daten werden im Hintergrund synchronisiert.` 
      });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Hinzufügen: ${err.message}`);
      return res.status(500).json({ error: 'Interner Serverfehler beim Speichern des Tickers.' });
    }
  }

  /**
   * Verknüpft einen Ticker mit einem Basiswert (Korrelation).
   * POST /api/correlations
   * 
   * @param {Object} req - Das Express Request-Objekt. Erwartet { mainTicker, linkedTicker, score } im Body.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet JSON-Erfolgsstatus { success: boolean }.
   */
  async addCorrelation(req, res) {
    const { mainTicker, linkedTicker, score } = req.body;

    if (!mainTicker || !linkedTicker) {
      return res.status(400).json({ error: 'Haupt-Ticker oder verknüpfter Ticker fehlt.' });
    }

    // Score Validierung (Regel 4)
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < -1 || numericScore > 1) {
      Logger.warn(`[WatchlistController] Ungültiger Korrelations-Score: ${score}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Score muss eine Zahl zwischen -1 und 1 sein.' 
      });
    }

    try {
      IntelligenceDAO.upsertCorrelation(
        mainTicker.toUpperCase(), 
        linkedTicker.toUpperCase(), 
        numericScore
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      Logger.error(`[WatchlistController] Fehler beim Erstellen der Korrelation: ${err.message}`);
      return res.status(500).json({ error: 'Interner Serverfehler.' });
    }
  }

  /**
   * Wird aufgerufen, wenn im Frontend auf eine Aktie geklickt wird (Board-Daten laden).
   * GET /api/intelligence/:ticker
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit dem aggregierten Datenpaket (DTO).
   */
  async getIntelligenceBoard(req, res) {
    const ticker = req.params.ticker.toUpperCase();

    try {
      // StockService aggregiert Daten von verschiedenen Providern und aus der DB.
      const intelligenceData = await StockService.getIntelligenceData(ticker);
      return res.status(200).json(intelligenceData);
    } catch (error) {
      Logger.error(`[WatchlistController] Fehler Board für ${ticker}: ${error.message}`);
      
      if (error instanceof StockMasterError) {
        return res.status(error.statusCode).json({ 
          success: false,
          error: error.message 
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Interner Serverfehler beim Laden der Board-Daten.' 
      });
    }
  }
}

module.exports = new WatchlistController();
