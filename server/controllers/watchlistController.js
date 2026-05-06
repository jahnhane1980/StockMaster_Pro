// server/controllers/watchlistController.js
const { db } = require('../database');
const TickerRepository = require('../repositories/tickerRepository');
const stockService = require('../services/StockService');
const alphaVantageRepo = require('../repositories/AlphaVantageRepo');

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

      console.log(`[WatchlistController] Ticker ${ticker} hinzugefügt. Starte Hintergrund-Sync...`);
      
      // 2. Hintergrund-Jobs (ohne await, um UI nicht zu blockieren)
      // Wir rufen hier Methoden auf, die den RequestManager nutzen
      
      // Historie & Fundamentals im Hintergrund anstoßen
      // Hinweis: StockService.getIntelligenceData macht das eigentlich auch beim ersten Aufruf,
      // aber hier triggern wir es proaktiv.
      alphaVantageRepo.getDailyHistory(ticker).catch(e => console.error(`[Background] Fehler Historie ${ticker}:`, e.message));
      alphaVantageRepo.getFundamentalsOverview(ticker).catch(e => console.error(`[Background] Fehler Fundamentals ${ticker}:`, e.message));
      alphaVantageRepo.getNewsSentiment(ticker).catch(e => console.error(`[Background] Fehler Sentiment ${ticker}:`, e.message));

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
