/**
 * StockMaster Konfiguration
 * Diese Datei wird durch .gitignore von der Versionskontrolle ausgeschlossen.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Config = {
    // API Keys & Base URLs
    FINNHUB_API_KEY: 'YOUR_FINNHUB_API_KEY_HERE',
    FINNHUB_BASE_URL: 'https://finnhub.io/api/v1',
    
    // Datenbank
    DB_NAME: 'StockMasterDB',
    DB_VERSION: 2,
    
    // Caching
    CACHE_DURATION_MS: 30 * 24 * 60 * 60 * 1000 // 30 Tage in Millisekunden
};

// Schützt die Config davor, zur Laufzeit verändert zu werden
Object.freeze(window.StockMaster.Config);