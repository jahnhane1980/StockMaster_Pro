// server/models/HistoricalDataDAO.js
const { db } = require('../db/Database');
const Logger = require('../utils/Logger');

/**
 * Datenzugriffsobjekt für historische Kursdaten.
 * Verwaltet das Abrufen und Speichern von Zeitreihendaten in der SQLite-Datenbank.
 */
class HistoricalDataDAO {
  
  /**
   * Holt den letzten gespeicherten Tag für einen Ticker aus der Datenbank.
   * @param {string} ticker - Das Aktiensymbol (z. B. 'AAPL').
   * @returns {string|null} - Das Datum im Format 'YYYY-MM-DD' oder null, falls keine Daten vorliegen.
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
   * Speichert ein Array von harmonisierten Datenpunkten in einer effizienten Transaktion.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {Array<Object>} data - Die Kursdaten (open, high, low, close, volume etc.).
   * @param {string} [provider='AV'] - Die Quelle der Daten (Default: AlphaVantage).
   * @returns {number} - Die Anzahl der erfolgreich verarbeiteten Datensätze.
   */
  insertMany(ticker, data, provider = 'AV') {
    if (!data || data.length === 0) { 
      Logger.warn('DAO: insertMany aborted - data array is empty'); 
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
    Logger.info(`[DAO] ${data.length} Einträge für ${ticker} synchron gespeichert (Provider: ${provider}).`);
    return data.length;
  }

  /**
   * Holt die komplette Historie für ein Symbol für die Anzeige im Chart-Modul.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Array<Object>>|Array<Object>} - Ein Array mit Kursdaten-Objekten (aufsteigend sortiert).
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
