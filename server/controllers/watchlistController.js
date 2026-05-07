// server/controllers/watchlistController.js
const { db } = require('../database');
const TickerRepository = require('../repositories/tickerRepository');
const stockService = require('../services/StockService');
const intelligenceDAO = require('../models/IntelligenceDAO');

class WatchlistController {
  
  /**
   * Wird aufgerufen, wenn das Frontend einen neuen Ticker hinzufügt
   * POST /api/watchlist
   */
  async addTickerToWatchlist(req, res) {
    const { symbol, name } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol fehlt.' });
    }

    const ticker = symbol.toUpperCase();

    try {
      // 1. Ticker in der Datenbank speichern
      TickerRepository.upsertTicker({ 
        symbol: ticker, 
        name: name || '' 
      });

      // Log für den Sync-Start
      console.log(`Background-Sync gestartet für Symbol: ${ticker}`);
      
      // 2. Hintergrund-Sync anstoßen (ohne await, um UI nicht zu blockieren)
      // Der StockService kümmert sich um das Abrufen und Persistieren aller Daten.
      stockService.syncTickerData(ticker).catch(e => {
        console.error(`[WatchlistController] Hintergrund-Sync Fehler für ${ticker}:`, e.message);
      });

      // Antwort an das Frontend
      return res.status(200).json({ 
        success: true,
        message: `${ticker} zur Watchlist hinzugefügt. Daten werden im Hintergrund synchronisiert.` 
      });
    } catch (err) {
      console.error('[WatchlistController] Fehler beim Hinzufügen:', err.message);
      return res.status(500).json({ error: 'Interner Serverfehler beim Speichern des Tickers.' });
    }
  }

  /**
   * Verknüpft einen Ticker mit einem Basiswert (Korrelation)
   * POST /api/correlations
   */
  async addCorrelation(req, res) {
    const { mainTicker, linkedTicker, score } = req.body;

    if (!mainTicker || !linkedTicker) {
      return res.status(400).json({ error: 'Haupt-Ticker oder verknüpfter Ticker fehlt.' });
    }

    try {
      intelligenceDAO.upsertCorrelation(
        mainTicker.toUpperCase(), 
        linkedTicker.toUpperCase(), 
        score || 0
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[WatchlistController] Fehler beim Erstellen der Korrelation:', err.message);
      return res.status(500).json({ error: 'Interner Serverfehler.' });
    }
  }

  /**
   * Wird aufgerufen, wenn im Frontend auf eine Aktie geklickt wird
   * GET /api/intelligence/:ticker
   */
  async getIntelligenceBoard(req, res) {
    const ticker = req.params.ticker.toUpperCase();

    try {
      const intelligenceData = await stockService.getIntelligenceData(ticker);
      return res.status(200).json(intelligenceData);
    } catch (error) {
      if (error.message.includes('Limit Reached') || error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'Provider Limit erreicht.', 
          details: 'Daten können aktuell nicht vollständig geladen werden. Bitte später erneut versuchen.' 
        });
      }
      
      console.error('[WatchlistController] Fehler Board:', error.message);
      return res.status(500).json({ error: 'Interner Serverfehler beim Laden der Board-Daten.' });
    }
  }
}

module.exports = new WatchlistController();
