/**
 * StockMaster HeaderModule
 * Verwaltet die Header-UI, das globale Loading-System und zukünftige Menü-Steuerungen.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.HeaderModule = (function() {
    
    let activeRequests = 0;
    let loaderElement = null;

    /**
     * Initialisiert das Modul und registriert Event-Listener.
     */
    function init() {
        loaderElement = document.getElementById('top-loader');
        if (!loaderElement) {
            console.warn('HeaderModule: #top-loader nicht gefunden.');
            return;
        }

        const events = window.StockMaster.Events;

        // Listener für das globale Loading-System
        document.addEventListener(events.DATA_LOADING_START, handleLoadingStart);
        document.addEventListener(events.DATA_LOADING_STOP, handleLoadingStop);

        // TODO: Hier später die Menü-Steuerung (Menu-Button) implementieren
        // initMenuControl();

        console.log('HeaderModule: Initialisiert.');
    }

    function handleLoadingStart() {
        activeRequests++;
        if (loaderElement) {
            loaderElement.classList.add('active');
        }
    }

    function handleLoadingStop() {
        activeRequests--;
        if (activeRequests <= 0) {
            activeRequests = 0;
            if (loaderElement) {
                loaderElement.classList.remove('active');
            }
        }
    }

    // Public API
    return {
        init: init
    };
})();
