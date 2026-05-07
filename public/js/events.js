/**
 * StockMaster Event-Wörterbuch
 * Zentrale Definition aller CustomEvents für das PubSub-Pattern.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Events = {
  // Globale UI Events
  GLOBAL_NOTIFICATION: 'app:notification',
  ERROR_OCCURRED: 'app:error-occurred',

  // Watchlist Events
  TICKER_ADDED: 'watchlist:ticker-added',
  TICKER_REMOVED: 'watchlist:ticker-removed', // Veraltet, durch TICKER_DELETED ersetzt
  TICKER_SELECTED: 'watchlist:ticker-selected',
  TICKERS_LOADED: 'watchlist:tickers-loaded',
  TICKER_DELETED: 'watchlist:ticker-deleted',
  INTELLIGENCE_DATA_LOADED: 'intelligence:data-loaded',
  MARKET_CORRELATIONS_LOADED: 'intelligence:market-correlations-loaded',

  // NEU: Damit das Intelligence Board den Chart triggern kann
  CHART_DATA_READY: 'chart:data-ready',

  // NEU: Globales Loading System (Refactoring)
  DATA_LOADING_START: 'data:loading-start',
  DATA_LOADING_STOP: 'data:loading-stop'
};

// Schützt das Wörterbuch davor, zur Laufzeit verändert zu werden
Object.freeze(window.StockMaster.Events);
