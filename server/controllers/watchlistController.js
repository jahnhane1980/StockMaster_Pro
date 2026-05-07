// server/controllers/WatchlistController.js
const { db } = require('../db/Database');
const TickerRepository = require('../repositories/TickerRepository');
const StockService = require('../services/StockService');
const IntelligenceDAO = require('../models/IntelligenceDAO');
const Logger = require('../utils/Logger');

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

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol fehlt.' });
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

    try {
      IntelligenceDAO.upsertCorrelation(
        mainTicker.toUpperCase(), 
        linkedTicker.toUpperCase(), 
        score || 0
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
      if (error.message.includes('Limit Reached') || error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'Provider Limit erreicht.', 
          details: 'Daten können aktuell nicht vollständig geladen werden. Bitte später erneut versuchen.' 
        });
      }
      
      Logger.error(`[WatchlistController] Fehler Board: ${error.message}`);
      return res.status(500).json({ error: 'Interner Serverfehler beim Laden der Board-Daten.' });
    }
  }
}

module.exports = new WatchlistController();
