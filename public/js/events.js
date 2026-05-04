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
    TICKER_REMOVED: 'watchlist:ticker-removed', // NEU: Event fürs Löschen
    TICKER_SELECTED: 'watchlist:ticker-selected'
};

// Schützt das Wörterbuch davor, zur Laufzeit verändert zu werden
Object.freeze(window.StockMaster.Events);