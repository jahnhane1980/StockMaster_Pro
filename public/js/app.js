/**
 * StockMaster - Main Application Entry Point
 * Hier werden alle Module orchestriert und initialisiert.
 */
window.StockMaster = window.StockMaster || {};

document.addEventListener('DOMContentLoaded', () => {
    console.log('StockMaster: DOM vollständig geladen.');
    initApp();
});

async function initApp() {
    try {
        console.log('StockMaster: App wird initialisiert...');
        
        if (window.StockMaster.NotificationService) {
            window.StockMaster.NotificationService.init();
        }

        if (window.StockMaster.TickerRepository) {
            await window.StockMaster.TickerRepository.init();
        }

        if (window.StockMaster.Watchlist) {
            await window.StockMaster.Watchlist.init();
        }

        if (window.StockMaster.Chart) {
            window.StockMaster.Chart.init();
        }

        if (window.StockMaster.Intelligence) {
            await window.StockMaster.Intelligence.init();
        }

        setupEventBus();

        console.log('StockMaster: Initialisierung erfolgreich.');
    } catch (error) {
        console.error('StockMaster: Fehler bei der Initialisierung:', error);
    }
}

function setupEventBus() {
    console.log('[App] EventBus eingerichtet. Lausche auf Events...');
    
    document.addEventListener(window.StockMaster.Events.TICKER_ADDED, async (e) => {
        const newSymbol = e.detail.symbol;
        console.log(`[App] EventBus empfängt Hinzufügen-Befehl für: ${newSymbol}`);
        
        if (window.StockMaster.TickerRepository) {
            try {
                await window.StockMaster.TickerRepository.addTicker(newSymbol);
                
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'success', message: `${newSymbol} wurde zur Watchlist hinzugefügt.` }
                }));

                if (window.StockMaster.Watchlist) {
                    window.StockMaster.Watchlist.refresh();
                }
            } catch (err) {
                console.error(`[App] Fehler beim Speichern von ${newSymbol}:`, err);
            }
        }
    });

    document.addEventListener(window.StockMaster.Events.TICKER_REMOVED, async (e) => {
        const symbolToRemove = e.detail.symbol;
        console.log(`[App] EventBus empfängt Lösch-Befehl für: ${symbolToRemove}`);
        
        if (window.StockMaster.TickerRepository) {
            try {
                await window.StockMaster.TickerRepository.removeTicker(symbolToRemove);
                
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'info', message: `${symbolToRemove} wurde aus der Watchlist entfernt.` }
                }));

                if (window.StockMaster.Watchlist) {
                    window.StockMaster.Watchlist.refresh();
                }
            } catch (err) {
                console.error(`[App] Fehler beim Löschen von ${symbolToRemove}:`, err);
            }
        }
    });
}