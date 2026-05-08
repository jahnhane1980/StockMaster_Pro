/**
 * StockMaster Frontend Messages
 * Zentrales Register für alle UI-Meldungen und Client-seitigen Fehlertexte.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Messages = (function() {
  
  const UI = Object.freeze({
    NO_DATA: 'Keine Daten.',
    NO_NEWS: 'Keine News',
    UNKNOWN_API_ERR: 'Unbekannter API-Fehler',
    NETWORK_ERR: 'Netzwerkfehler. Bitte Internetverbindung prüfen.'
  });

  const ERRORS = Object.freeze({
    FAILED_TO_FETCH: 'Failed to fetch'
  });

  return {
    UI,
    ERRORS
  };
})();
