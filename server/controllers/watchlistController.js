// server/controllers/watchlistController.js
const db = require('../database');
const alphaVantageRepo = require('../repositories/AlphaVantageRepo');
const stockService = require('../services/StockService');

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

    // 1. Ticker in der Datenbank speichern (in der "tickers" Tabelle)
    db.run(
      `INSERT INTO tickers (symbol, name) VALUES (?, ?) ON CONFLICT(symbol) DO NOTHING`,
      [ticker, name || ''],
      function(err) {
        if (err) {
          console.error('[WatchlistController] DB Fehler:', err);
          return res.status(500).json({ error: 'Datenbankfehler beim Speichern.' });
        }

        // 2. Hintergrund-Jobs an den RequestManager übergeben!
        // Wir warten hier NICHT mit 'await', weil der User sofort ein Feedback 
        // im UI haben soll ("Ticker hinzugefügt"). Die Daten laden im Hintergrund.
        
        console.log(`[WatchlistController] Ticker ${ticker} hinzugefügt. Starte Hintergrund-Sync...`);
        
        // P2: Historie (Wichtig für den Chart)
        alphaVantageRepo.getDailyHistory(ticker)
          .then(rawData => {
            // Hier müssten die Daten über eine DB-Klasse gespeichert werden
            console.log(`[Background] Historie für ${ticker} geladen und wird gespeichert.`);
            // db.run("INSERT INTO historical_data ...")
          })
          .catch(e => console.error(`[Background] Fehler Historie ${ticker}:`, e.message));

        // P3: Fundamentals (Niedrige Prio)
        alphaVantageRepo.getFundamentalsOverview(ticker)
          .then(rawData => console.log(`[Background] Fundamentals für ${ticker} geladen.`))
          .catch(e => console.error(`[Background] Fehler Fundamentals ${ticker}:`, e.message));

        // P3: Sentiment (Niedrige Prio)
        alphaVantageRepo.getNewsSentiment(ticker)
          .then(rawData => console.log(`[Background] Sentiment für ${ticker} geladen.`))
          .catch(e => console.error(`[Background] Fehler Sentiment ${ticker}:`, e.message));

        // Antwort an das Frontend
        return res.status(200).json({ 
          message: `${ticker} zur Watchlist hinzugefügt. Daten werden im Hintergrund synchronisiert.` 
        });
      }
    );
  }

  /**
   * Wird aufgerufen, wenn du im Frontend auf eine Aktie klickst, um das Board zu öffnen
   * GET /api/intelligence/:ticker
   */
  async getIntelligenceBoard(req, res) {
    const ticker = req.params.ticker.toUpperCase();

    try {
      // Hier rufen wir den StockService aus Schritt 4 auf!
      // Er prüft die DB, holt P1-Livedaten von Massive und harmonisiert alles.
      const intelligenceData = await stockService.getIntelligenceData(ticker);
      
      return res.status(200).json(intelligenceData);
    } catch (error) {
      if (error.message === 'MASSIVE_LIMIT_REACHED' || error.message === 'AV_DAILY_LIMIT_REACHED') {
        return res.status(429).json({ 
          error: 'Provider Limit erreicht.', 
          details: 'Daten können aktuell nicht vollständig geladen werden. Bitte später erneut versuchen.' 
        });
      }
      
      console.error('[WatchlistController] Fehler Board:', error);
      return res.status(500).json({ error: 'Interner Serverfehler.' });
    }
  }
}

module.exports = new WatchlistController();