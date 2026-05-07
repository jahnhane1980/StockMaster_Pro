/**
 * StockMaster HTTP Status Codes
 * Zentrales Verzeichnis für standardisierte Status-Codes.
 * Warum: Vermeidung von Magic Numbers und Erhöhung der Lesbarkeit.
 */
const HttpStatus = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500
});

module.exports = HttpStatus;
