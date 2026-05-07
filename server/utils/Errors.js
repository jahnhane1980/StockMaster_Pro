/**
 * Zentrales Error-Management für StockMaster Pro.
 * Intent: Bereitstellung spezialisierter Error-Klassen zur präzisen Steuerung 
 * von HTTP-Statuscodes und Logging-Verhalten (Regel 12 & 20).
 */

class StockMasterError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ProviderLimitError extends StockMasterError {
  constructor(message = 'Provider API Limit erreicht.') {
    super(message, 429);
  }
}

class ValidationError extends StockMasterError {
  constructor(message) {
    super(message, 400);
  }
}

class ResourceNotFoundError extends StockMasterError {
  constructor(message = 'Ressource nicht gefunden.') {
    super(message, 404);
  }
}

module.exports = {
  StockMasterError,
  ProviderLimitError,
  ValidationError,
  ResourceNotFoundError
};
