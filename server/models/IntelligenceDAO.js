// server/models/IntelligenceDAO.js
const { db } = require('../db/Database');
const Logger = require('../utils/Logger');
const { TECH } = require('../utils/AppConstants');

/**
 * Datenzugriffsobjekt für Market Intelligence Daten.
 * Verwaltet Fundamentaldaten (Metadata), Sentiment-Analysen und Asset-Korrelationen.
 */
class IntelligenceDAO {
  
  // ==========================================
  // MARKET METADATA (Fundamentals & Caching)
  // ==========================================

  /**
   * Aktualisiert oder erstellt Fundamentaldaten für ein Symbol.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {Object} data - Die Metadaten (Market Cap, Kennzahlen, Timestamps).
   * @returns {number} - Die Anzahl der betroffenen Zeilen.
   */
  upsertMetadata(ticker, data) {
    const sql = `
      INSERT OR REPLACE INTO market_metadata 
      (ticker, asset_type, market_cap, debt_equity, revenue_growth, last_updated_fundamentals, last_updated_history)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT last_updated_history FROM market_metadata WHERE ticker = ?)))
    `;
    
    const stmt = db.prepare(sql);
    const result = stmt.run(
      ticker,
      data.asset_type || TECH.TYPE_STOCK_UPPER,
      data.market_cap || null,
      data.debt_equity || null,
      data.revenue_growth || null,
      data.last_updated_fundamentals || new Date().toISOString(),
      data.last_updated_history || null,
      ticker
    );
    return result.changes;
  }

  /**
   * Holt die Metadaten für ein Symbol (z. B. für das Intelligence Board).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Object|undefined} - Das Metadaten-Objekt oder undefined, falls nicht vorhanden.
   */
  getMetadata(ticker) {
    const stmt = db.prepare(`SELECT * FROM market_metadata WHERE ticker = ?`);
    return stmt.get(ticker);
  }


  // ==========================================
  // SENTIMENT HISTORY
  // ==========================================

  /**
   * Speichert ein Array von News-Sentiment-Daten in der Historie.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {Array<Object>} sentiments - Array mit Sentiment-Objekten (score, relevance, timestamp).
   * @returns {number} - Die Anzahl der verarbeiteten Einträge.
   */
  insertSentiment(ticker, sentiments) {
    if (!sentiments || sentiments.length === 0) return 0;
    
    // In better-sqlite3 werden Transaktionen über db.transaction() abgebildet
    const insert = db.prepare(`
      INSERT OR IGNORE INTO sentiment_history 
      (ticker, timestamp, sentiment_score, relevance_score) 
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction((data) => {
      for (const item of data) {
        insert.run(ticker, item.timestamp, item.sentiment_score, item.relevance_score);
      }
    });

    transaction(sentiments);
    Logger.info(`[DAO] Sentiment-Einträge für ${ticker} verarbeitet.`);
    return sentiments.length;
  }

  /**
   * Holt die aktuellsten Sentiment-Scores für einen Ticker.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {number} [limit=20] - Maximale Anzahl der Einträge.
   * @returns {Array<Object>} - Liste der Sentiment-Einträge.
   */
  getLatestSentiment(ticker, limit = 20) {
    const stmt = db.prepare(`
      SELECT * FROM sentiment_history 
      WHERE ticker = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(ticker, limit);
  }


  // ==========================================
  // ASSET CORRELATIONS (Basiswerte)
  // ==========================================

  /**
   * Verknüpft eine Aktie mit einem Basiswert (z. B. Korrelation mit Gold oder BTC).
   * @param {string} mainTicker - Das primäre Aktiensymbol.
   * @param {string} linkedTicker - Das Symbol des verknüpften Assets.
   * @param {number} [score=0] - Der Korrelations-Score.
   * @returns {number|bigint} - Die ID des neuen/aktualisierten Eintrags.
   */
  upsertCorrelation(mainTicker, linkedTicker, score = 0) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO asset_correlations 
      (main_ticker, linked_ticker, correlation_score) 
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(mainTicker, linkedTicker, score);
    return result.lastInsertRowid;
  }

  /**
   * Holt alle verknüpften Assets für einen Ticker (z. B. BTC für Krypto-Aktien).
   * @param {string} mainTicker - Das primäre Aktiensymbol.
   * @returns {Array<Object>} - Liste der verknüpften Assets und deren Scores.
   */
  getCorrelations(mainTicker) {
    const stmt = db.prepare(`
      SELECT linked_ticker, correlation_score 
      FROM asset_correlations 
      WHERE main_ticker = ?
    `);
    return stmt.all(mainTicker);
  }
}

module.exports = new IntelligenceDAO();
