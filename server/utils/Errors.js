const HttpStatus = require('./HttpStatus');

/**
 * Zentrales Error-Management für StockMaster Pro.
 * Intent: Bereitstellung spezialisierter Error-Klassen zur präzisen Steuerung 
 * von HTTP-Statuscodes und Logging-Verhalten (Regel 12 & 20).
 */

class StockMasterError extends Error {
  constructor(message, statusCode = HttpStatus.SERVER_ERROR) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ProviderLimitError extends StockMasterError {
  constructor(message = 'Provider API Limit erreicht.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

class ValidationError extends StockMasterError {
  constructor(message) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

class ResourceNotFoundError extends StockMasterError {
  constructor(message = 'Ressource nicht gefunden.') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

module.exports = {
  StockMasterError,
  ProviderLimitError,
  ValidationError,
  ResourceNotFoundError
};
