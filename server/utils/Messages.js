/**
 * StockMaster Server Messages
 * Zentrales Register für alle Server-seitigen Fehlermeldungen und Texte.
 * Intent: Internationalisierungsfähigkeit und Vermeidung von Magic Strings (Regel 6).
 */
const MESSAGES = Object.freeze({
  ERR_AV_STATUS: 'Alpha Vantage API lieferte Status',
  ERR_AV_DAILY_LIMIT: 'Alpha Vantage Daily Rate Limit erreicht.',
  ERR_AV_MINUTE_LIMIT: 'Alpha Vantage Minute Rate Limit erreicht.',
  ERR_AV_NO_DATA: 'Keine Daten bei Alpha Vantage für Parameter:',
  ERR_MASSIVE_LIMIT: 'MASSIVE_LIMIT_REACHED',
  ERR_DB_OP: 'Datenbank-Operation fehlgeschlagen',
  ERR_DB_NOT_FOUND: 'Eintrag in Datenbank nicht gefunden',
  UI_NO_NEWS: 'Keine News'
});

module.exports = MESSAGES;
