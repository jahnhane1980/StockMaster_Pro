// server/models/WatchlistDAO.js
const { db } = require('../db/Database');
const { TECH } = require('../utils/AppConstants');
const MESSAGES = require('../utils/Messages');
const Logger = require('../utils/Logger');

/**
 * Datenzugriffsobjekt für die Watchlist.
 * Intent: Trennung von Datenzugriffslogik und Geschäftslogik (Regel 1).
 */
class WatchlistDAO {
  /**
   * Holt alle Ticker aus der Watchlist.
   * @returns {Array<Object>} - Liste der Ticker.
   */
  findAll() {
    try {
      const stmt = db.prepare('SELECT * FROM tickers ORDER BY symbol ASC');
      return stmt.all();
    } catch (error) {
      Logger.error(`[WatchlistDAO] Error in findAll: ${error.message}`);
      throw new Error(MESSAGES.ERR_DB_OP);
    }
  }

  /**
   * Erstellt einen neuen Ticker oder aktualisiert einen bestehenden.
   * @param {Object} ticker - Das Ticker-Objekt.
   * @returns {Object} - Ergebnis der Operation.
   */
  upsert(ticker) {
    try {
      const stmt = db.prepare(`
        INSERT INTO tickers (symbol, name, type, sector, industry, linked_assets, last_updated)
        VALUES (@symbol, @name, @type, @sector, @industry, @linked_assets, @last_updated)
        ON CONFLICT(symbol) DO UPDATE SET
            name=excluded.name,
            type=excluded.type,
            sector=excluded.sector,
            industry=excluded.industry,
            linked_assets=excluded.linked_assets,
            last_updated=excluded.last_updated
      `);

      return stmt.run({
        symbol: ticker.symbol,
        name: ticker.name || '',
        type: ticker.type || TECH.TYPE_STOCK,
        sector: ticker.sector || '',
        industry: ticker.industry || '',
        last_updated: ticker.last_updated || Date.now(),
        linked_assets: JSON.stringify(ticker.linked_assets || [])
      });
    } catch (error) {
      Logger.error(`[WatchlistDAO] Error in upsert for ${ticker.symbol}: ${error.message}`);
      throw new Error(MESSAGES.ERR_DB_OP);
    }
  }

  /**
   * Löscht einen Ticker aus der Watchlist.
   * @param {string} symbol - Das Symbol.
   * @returns {Object} - Ergebnis der Operation.
   */
  delete(symbol) {
    try {
      const stmt = db.prepare('DELETE FROM tickers WHERE symbol = ?');
      return stmt.run(symbol);
    } catch (error) {
      Logger.error(`[WatchlistDAO] Error in delete for ${symbol}: ${error.message}`);
      throw new Error(MESSAGES.ERR_DB_OP);
    }
  }
}

module.exports = new WatchlistDAO();
