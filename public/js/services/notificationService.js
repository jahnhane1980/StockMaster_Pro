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
   * @returns {void}
   */
  function init() {
    createContainer();
    
    if (window.StockMaster.Events) {
      /**
       * Warum SoC (Separation of Concerns): 
       * Der Dienst hört passiv auf globale Events (ERROR_OCCURRED, GLOBAL_NOTIFICATION), 
       * anstatt dass Repositories oder Services den UI-Dienst direkt aufrufen müssen.
       * Dies entkoppelt die Geschäftslogik vollständig von der Benachrichtigungs-UI.
       */

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

  /**
   * Erstellt das Container-Element für Toasts im DOM, falls nicht vorhanden.
   * @returns {void}
   */
  function createContainer() {
    if (document.getElementById(CONTAINER_ID)) return;
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
  }

  /**
   * Zeigt ein Toast-Popup an.
   * @param {string} message - Der anzuzeigende Text.
   * @param {string} [type='info'] - Der Typ des Toasts ('info', 'success', 'warning', 'error').
   * @returns {void}
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
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
