/**
 * StockMaster Notification Service
 * Kapselt UI-Logik für globale Toast-Popups.
 * Gemäß Regel 1 SoC: Agiert als Listener für globale Events.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.NotificationService = (function() {
  const CONTAINER_ID = 'sm-toast-container';

  /**
   * Initialisiert den Service und registriert Event-Listener.
   */
  function init() {
    createContainer();
    
    if (window.StockMaster.Events) {
      // Höre auf Erfolgsmeldungen
      document.addEventListener(window.StockMaster.Events.GLOBAL_NOTIFICATION, (e) => {
        const { type, message } = e.detail;
        showToast(message, type);
      });

      // Höre auf globale Fehler-Events (Automatische UI-Anzeige)
      document.addEventListener(window.StockMaster.Events.ERROR_OCCURRED, (e) => {
        const { message, isLimitError } = e.detail;
        showToast(message, isLimitError ? 'warning' : 'error');
      });
      
      console.log('StockMaster.NotificationService: Initialisiert und Listener aktiv.');
    }
  }

  function createContainer() {
    if (document.getElementById(CONTAINER_ID)) return;
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `sm-toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400); 
    }, 4000);
  }

  return { init, showToast };
})();
