// server/models/IntelligenceDAO.js
const db = require('../database');

class IntelligenceDAO {
  
  // ==========================================
  // MARKET METADATA (Fundamentals & Caching)
  // ==========================================

  /**
   * Aktualisiert oder erstellt Fundamentaldaten
   */
  upsertMetadata(ticker, data) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO market_metadata 
        (ticker, asset_type, market_cap, debt_equity, revenue_growth, last_updated_fundamentals, last_updated_history)
        VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT last_updated_history FROM market_metadata WHERE ticker = ?)))
      `);
      
      stmt.run([
        ticker,
        data.asset_type || 'STOCK',
        data.market_cap || null,
        data.debt_equity || null,
        data.revenue_growth || null,
        data.last_updated_fundamentals || new Date().toISOString(),
        data.last_updated_history || null,
        ticker // Fallback für COALESCE
      ], function(err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
      stmt.finalize();
    });
  }

  /**
   * Holt die Metadaten (für das Intelligence Board)
   */
  getMetadata(ticker) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM market_metadata WHERE ticker = ?`, [ticker], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }


  // ==========================================
  // SENTIMENT HISTORY
  // ==========================================

  /**
   * Speichert neue Sentiment-Daten (ignoriert Duplikate durch UNIQUE Constraint)
   */
  insertSentiment(ticker, sentiments) {
    return new Promise((resolve, reject) => {
      if (!sentiments || sentiments.length === 0) return resolve(0);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // INSERT OR IGNORE: Bereits vorhandene News-Timestamps werden einfach übersprungen
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO sentiment_history 
          (ticker, timestamp, sentiment_score, relevance_score) 
          VALUES (?, ?, ?, ?)
        `);

        sentiments.forEach(item => {
          stmt.run([
            ticker, 
            item.timestamp, 
            item.sentiment_score, 
            item.relevance_score
          ]);
        });

        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) return reject(err);
          console.log(`[DAO] ${sentiments.length} Sentiment-Einträge für ${ticker} geprüft/gespeichert.`);
          resolve(sentiments.length);
        });
      });
    });
  }

  /**
   * Holt die aktuellsten Sentiment-Scores (z.B. für einen Chart-Overlay)
   */
  getLatestSentiment(ticker, limit = 20) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM sentiment_history WHERE ticker = ? ORDER BY timestamp DESC LIMIT ?`, [ticker, limit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }


  // ==========================================
  // ASSET CORRELATIONS (Basiswerte)
  // ==========================================

  /**
   * Verknüpft eine Aktie mit einem Basiswert (z.B. MARA -> BTC)
   */
  upsertCorrelation(mainTicker, linkedTicker, score = 0) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO asset_correlations 
        (main_ticker, linked_ticker, correlation_score) 
        VALUES (?, ?, ?)
      `);
      
      stmt.run([mainTicker, linkedTicker, score], function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
      stmt.finalize();
    });
  }
}

module.exports = new IntelligenceDAO();