/**
 * StockMaster Event-Wörterbuch
 * Zentrale Definition aller CustomEvents für das PubSub-Pattern.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Events = {
    // Globale UI Events
    GLOBAL_NOTIFICATION: 'app:notification',
    
    // Watchlist Events
    TICKER_ADDED: 'watchlist:ticker-added',
    TICKER_REMOVED: 'watchlist:ticker-removed', 
    TICKER_SELECTED: 'watchlist:ticker-selected',

    // NEU: Damit das Intelligence Board den Chart triggern kann
    CHART_DATA_READY: 'chart:data-ready',

    // NEU: Globales Loading System (Refactoring)
    DATA_LOADING_START: 'data:loading-start',
    DATA_LOADING_STOP: 'data:loading-stop'
};

// Schützt das Wörterbuch davor, zur Laufzeit verändert zu werden
Object.freeze(window.StockMaster.Events);