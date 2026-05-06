// server/models/IntelligenceDAO.js
const { db } = require('../database');

class IntelligenceDAO {
  
  // ==========================================
  // MARKET METADATA (Fundamentals & Caching)
  // ==========================================

  /**
   * Aktualisiert oder erstellt Fundamentaldaten
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
      data.asset_type || 'STOCK',
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
   * Holt die Metadaten (für das Intelligence Board)
   */
  getMetadata(ticker) {
    const stmt = db.prepare(`SELECT * FROM market_metadata WHERE ticker = ?`);
    return stmt.get(ticker);
  }


  // ==========================================
  // SENTIMENT HISTORY
  // ==========================================

  /**
   * Speichert neue Sentiment-Daten
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
    console.log(`[DAO] Sentiment-Einträge für ${ticker} verarbeitet.`);
    return sentiments.length;
  }

  /**
   * Holt die aktuellsten Sentiment-Scores
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
   * Verknüpft eine Aktie mit einem Basiswert
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
   * Holt alle verknüpften Basiswerte für einen Ticker (z.B. BTC für MARA)
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
