/**
 * StockMaster App Orchestrator
 * Initialisiert alle Module und koordiniert den Startvorgang.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 StockMaster Pro: Initialisierung gestartet...');

    // 1. Repositories & Services initialisieren (falls nötig)
    if (window.StockMaster.TickerRepository && window.StockMaster.TickerRepository.init) {
        window.StockMaster.TickerRepository.init();
    }
    
    if (window.StockMaster.NotificationService && window.StockMaster.NotificationService.init) {
        window.StockMaster.NotificationService.init();
    }

    // 2. Module initialisieren
    // Die Module hängen sich selbst an ihre jeweiligen DOM-Elemente
    // und registrieren ihre Event-Listener.

    if (window.StockMaster.HeaderModule && window.StockMaster.HeaderModule.init) {
        window.StockMaster.HeaderModule.init();
    }
    
    if (window.StockMaster.WatchlistModule && window.StockMaster.WatchlistModule.init) {
        window.StockMaster.WatchlistModule.init();
    }

    if (window.StockMaster.IntelligenceModule && window.StockMaster.IntelligenceModule.init) {
        window.StockMaster.IntelligenceModule.init();
    }

    if (window.StockMaster.ChartModule && window.StockMaster.ChartModule.init) {
        window.StockMaster.ChartModule.init();
    }

    console.log('✅ StockMaster Pro: Alle Module bereit.');
});
