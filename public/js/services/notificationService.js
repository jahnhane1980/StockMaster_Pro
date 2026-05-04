/**
 * StockMaster Notification Service
 * Revealing Module Pattern
 * Kapselt UI-Logik für globale Toast-Popups (Errors, Success, Warnings).
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.NotificationService = (function() {
    // Private Konstante für das Modul
    const CONTAINER_ID = 'sm-toast-container';

    function init() {
        createContainer();
        bindEvents();
        console.log('StockMaster.NotificationService: Initialisiert.');
    }

    function createContainer() {
        if (document.getElementById(CONTAINER_ID)) return;
        
        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        document.body.appendChild(container);
    }

    function bindEvents() {
        document.addEventListener(window.StockMaster.Events.GLOBAL_NOTIFICATION, (e) => {
            const { type, message } = e.detail;
            showToast(message, type);
        });
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `sm-toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Nächsten Render-Frame abwarten, damit die CSS Transition greift
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Nach 4 Sekunden wieder ausblenden und aus dem DOM entfernen
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); 
        }, 4000);
    }

    // Public API
    return {
        init: init,
        showToast: showToast 
    };
})();