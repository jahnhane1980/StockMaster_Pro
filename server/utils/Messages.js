/**
 * StockMaster Server Messages
 * Zentrales Register für alle Server-seitigen Fehlermeldungen und Texte.
 * Intent: Internationalisierungsfähigkeit und Vermeidung von Magic Strings (Regel 6).
 */
const MESSAGES = Object.freeze({
  // Provider Errors
  ERR_AV_STATUS: 'Alpha Vantage API lieferte Status',
  ERR_AV_DAILY_LIMIT: 'Alpha Vantage Daily Rate Limit erreicht.',
  ERR_AV_MINUTE_LIMIT: 'Alpha Vantage Minute Rate Limit erreicht.',
  ERR_AV_NO_DATA: 'Keine Daten bei Alpha Vantage für Parameter:',
  ERR_MASSIVE_LIMIT: 'MASSIVE_LIMIT_REACHED',
  
  // Database Errors
  ERR_DB_OP: 'Datenbank-Operation fehlgeschlagen',
  ERR_DB_NOT_FOUND: 'Eintrag in Datenbank nicht gefunden',
  
  // Controller / Validation Errors
  ERR_INVALID_SYMBOL: 'Ungültiges Symbol. Nur alphanumerische Zeichen (max. 10) erlaubt.',
  ERR_INSUFFICIENT_DATA: 'Unzureichende historische Daten für das Haupt-Symbol.',
  ERR_MISSING_TICKERS: 'Haupt-Ticker oder verknüpfter Ticker fehlt.',
  ERR_INVALID_SCORE: 'Score muss eine Zahl zwischen -1 und 1 sein.',
  ERR_QUEUE_FULL: 'Warteschlange ist voll. Bitte später versuchen.',
  
  // Generic Server Errors
  ERR_INTERNAL_SERVER: 'Interner Serverfehler.',
  ERR_CORRELATION_FAILED: 'Interner Serverfehler bei der Korrelations-Berechnung.',
  ERR_SAVE_TICKER_FAILED: 'Interner Serverfehler beim Speichern des Tickers.',
  ERR_BOARD_LOAD_FAILED: 'Interner Serverfehler beim Laden der Board-Daten.',
  
  // Success & Info Messages
  MSG_SYNC_STARTED: 'Daten werden im Hintergrund synchronisiert.',
  MSG_TICKER_ADDED: 'zur Watchlist hinzugefügt.',
  MSG_QUALITY_NO_BTC: 'Keine BTC-Referenzdaten',
  MSG_QUALITY_NO_GOLD: 'Keine Gold-Referenzdaten',
  UI_NO_NEWS: 'Keine News'
});

module.exports = MESSAGES;
