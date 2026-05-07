/**
 * StockMaster App Orchestrator
 * Initialisiert alle Module und koordiniert den Startvorgang.
 * 
 * Warum diese Reihenfolge:
 * 1. Repositories/Services: Bereitstellung der Daten-Infrastruktur.
 * 2. UI-Module: Aufbau der Benutzeroberfläche und Registrierung der Event-Listener.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 StockMaster Pro: Initialisierung gestartet...');

    /**
     * Phase 1: Daten-Infrastruktur & Globale Services.
     * Muss zuerst initialisiert werden, damit UI-Module beim Start auf funktionale Repositories zugreifen können.
     */
    if (window.StockMaster.TickerRepository && window.StockMaster.TickerRepository.init) {
        window.StockMaster.TickerRepository.init();
    }
    
    if (window.StockMaster.NotificationService && window.StockMaster.NotificationService.init) {
        window.StockMaster.NotificationService.init();
    }

    /**
     * Phase 2: UI-Module (Unabhängige Komponenten).
     * Diese Module registrieren ihre Event-Listener und hängen sich an DOM-Elemente.
     */
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
