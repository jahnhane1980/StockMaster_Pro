/**
 * Zentraler Mapper für Marktdaten.
 * Intent: Konsistente Modellbildung für alle Provider (Regel 1).
 * Stellt sicher, dass Rundungen, Prozentrechnungen und Datumsformatierungen
 * systemweit identisch erfolgen.
 */
class MarketDataMapper {
  /**
   * Erzeugt ein harmonisiertes Quote-Objekt.
   * @param {string} symbol - Das Aktiensymbol.
   * @param {number} price - Der aktuelle Kurs (Close).
   * @param {number} open - Der Eröffnungskurs.
   * @param {number|string} volume - Das Handelsvolumen.
   * @param {number|string} timestamp - Der Zeitstempel (Unix oder ISO).
   * @returns {Object} - Das harmonisierte Quote-Modell.
   */
  static toQuote(symbol, price, open, volume, timestamp) {
    const p = parseFloat(price) || 0;
    const o = parseFloat(open) || 0;
    const change = p - o;
    const changePercent = o !== 0 ? (change / o) * 100 : 0;

    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(p.toFixed(4)),
      volume: parseInt(volume) || 0,
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(4)),
      timestamp: this._formatTimestamp(timestamp)
    };
  }

  /**
   * Erzeugt einen harmonisierten Historie-Eintrag.
   * @param {string} symbol - Das Aktiensymbol.
   * @param {string} date - Das Datum im Format YYYY-MM-DD.
   * @param {number} open - Eröffnung.
   * @param {number} high - Hoch.
   * @param {number} low - Tief.
   * @param {number} close - Schluss.
   * @param {number|string} volume - Volumen.
   * @returns {Object} - Das harmonisierte Historie-Modell.
   */
  static toHistoryEntry(symbol, date, open, high, low, close, volume) {
    const quote = this.toQuote(symbol, close, open, volume, date);
    return {
      ...quote,
      date: date,
      open: parseFloat(parseFloat(open).toFixed(4)),
      high: parseFloat(parseFloat(high).toFixed(4)),
      low: parseFloat(parseFloat(low).toFixed(4)),
      close: parseFloat(parseFloat(close).toFixed(4))
    };
  }

  /**
   * Hilfsfunktion zur Zeitstempel-Formatierung.
   * @param {number|string} ts - Eingangs-Zeitstempel.
   * @returns {string} - ISO-String.
   * @private
   */
  static _formatTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    const date = new Date(ts);
    // Validierung: Falls das Datum ungültig ist (NaN), Fallback auf "jetzt"
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
}

module.exports = MarketDataMapper;
