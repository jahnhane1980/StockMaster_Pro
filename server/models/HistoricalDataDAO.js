// server/models/HistoricalDataDAO.js
const db = require('../database');

class HistoricalDataDAO {
  
  /**
   * Holt den letzten gespeicherten Tag für einen Ticker, 
   * um zu wissen, ab wann wir Diffs holen müssen.
   */
  getLastRecordDate(ticker) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT date_str FROM historical_data 
        WHERE ticker = ? 
        ORDER BY date_str DESC 
        LIMIT 1
      `;
      db.get(query, [ticker], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.date_str : null); // Gibt z.B. '2023-10-25' zurück oder null
      });
    });
  }

  /**
   * Speichert ein Array von harmonisierten Datenpunkten.
   * Funktioniert für Initiale AV-Ladungen UND für tägliche Massive-Updates.
   */
  insertMany(ticker, dataPoints, provider = 'AV') {
    return new Promise((resolve, reject) => {
      if (!dataPoints || dataPoints.length === 0) {
        return resolve(0);
      }

      // SQLite Transaktion starten für Performance und Sicherheit
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Wir nutzen INSERT OR REPLACE, falls sich Daten überschneiden
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO historical_data 
          (ticker, date_str, open, high, low, close, adjusted_close, volume, vwap, provider) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        dataPoints.forEach(point => {
          stmt.run([
            ticker,
            point.date,
            point.open || null,
            point.high || null,
            point.low || null,
            point.close,
            point.adjustedClose || point.close, // Fallback, falls Massive kein Adj. Close liefert
            point.volume,
            point.vwap || null, // Massive Special
            provider
          ]);
        });

        stmt.finalize();

        db.run('COMMIT', (err) => {
          if (err) return reject(err);
          console.log(`[DAO] ${dataPoints.length} Einträge für ${ticker} gespeichert (Provider: ${provider}).`);
          resolve(dataPoints.length);
        });
      });
    });
  }

  /**
   * Holt die komplette Historie aus der DB für das Frontend (Chart)
   */
  getHistoryForChart(ticker) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT date_str as date, open, high, low, close, volume 
        FROM historical_data 
        WHERE ticker = ? 
        ORDER BY date_str ASC
      `;
      db.all(query, [ticker], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

module.exports = new HistoricalDataDAO();