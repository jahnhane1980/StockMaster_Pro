// server/models/HistoricalDataDAO.js
const { db } = require('../database');

class HistoricalDataDAO {
  
  /**
   * Holt den letzten gespeicherten Tag für einen Ticker
   */
  getLastRecordDate(ticker) {
    const query = `
      SELECT date_str FROM historical_data 
      WHERE ticker = ? 
      ORDER BY date_str DESC 
      LIMIT 1
    `;
    const row = db.prepare(query).get(ticker);
    return row ? row.date_str : null;
  }

  /**
   * Speichert ein Array von harmonisierten Datenpunkten.
   */
  insertMany(ticker, data, provider = 'AV') {
    if (!data || data.length === 0) { 
      console.warn('DAO: insertMany aborted - data array is empty'); 
      return 0; 
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO historical_data 
      (ticker, date_str, open, high, low, close, adjusted_close, volume, vwap, provider) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Transaktion für massive Performance-Steigerung bei vielen Inserts
    const insertTransaction = db.transaction((points) => {
      for (const point of points) {
        stmt.run(
          ticker,
          point.date,
          point.open || null,
          point.high || null,
          point.low || null,
          point.close,
          point.adjustedClose || point.close,
          point.volume,
          point.vwap || null,
          provider
        );
      }
    });

    insertTransaction(data);
    console.log(`[DAO] ${data.length} Einträge für ${ticker} synchron gespeichert (Provider: ${provider}).`);
    return data.length;
  }

  /**
   * Holt die komplette Historie aus der DB für das Frontend (Chart)
   */
  getHistoryForChart(ticker) {
    const query = `
      SELECT date_str as date, open, high, low, close, volume 
      FROM historical_data 
      WHERE ticker = ? 
      ORDER BY date_str ASC
    `;
    return db.prepare(query).all(ticker);
  }
}

module.exports = new HistoricalDataDAO();
