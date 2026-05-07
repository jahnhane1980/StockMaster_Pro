/**
 * StockMaster Frontend HTTP Status Codes
 * Zentrales Verzeichnis für standardisierte Status-Codes im Frontend.
 * Warum: Symmetrie zum Backend-Vertrag und Vermeidung von Magic Numbers.
 */
window.StockMaster = window.StockMaster || {};
window.StockMaster.HttpStatus = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500
});
