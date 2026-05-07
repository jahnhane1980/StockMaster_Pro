/**
 * StockMaster HttpClient
 * Revealing Module Pattern
 * Ein generischer Wrapper um die native Fetch-API mit integriertem globalen Error-Handling.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.HttpClient = (function() {

  /**
   * Benachrichtigt das System über den Ladezustand via CustomEvents.
   * @param {boolean} isLoading - Gibt an, ob ein Ladevorgang aktiv ist.
   * @returns {void}
   */
  function notifyLoading(isLoading) {
    const eventName = isLoading
      ? window.StockMaster.Events.DATA_LOADING_START
      : window.StockMaster.Events.DATA_LOADING_STOP;

    document.dispatchEvent(new CustomEvent(eventName));
  }

  /**
   * Führt einen HTTP-Request aus und verwaltet Ladezustände sowie Fehler.
   * @param {string} endpoint - Die Ziel-URL des Requests.
   * @param {Object} options - Konfiguration des Requests (Method, Body, Headers).
   * @returns {Promise<any>} - Das JSON-Ergebnis des Requests.
   */
  async function request(endpoint, options = {}) {
    notifyLoading(true);
    const config = {
      method: options.method || 'GET',
      headers: { ...options.headers }
    };

    if (options.body) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(endpoint, config);

      if (!response.ok) {
        handleHttpError(response);
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.ERROR_OCCURRED, {
          detail: { message: 'Netzwerkfehler. Bitte Internetverbindung prüfen.' }
        }));
      }
      throw error;
    } finally {
      notifyLoading(false);
    }
  }

  /**
   * Zentrale Auswertung der HTTP-Fehler-Codes und Triggerung von Fehler-Events.
   * @param {Response} response - Das Response-Objekt des fehlgeschlagenen Requests.
   * @returns {void}
   */
  function handleHttpError(response) {
    let errorMessage = 'Ein unbekannter API-Fehler ist aufgetreten.';

    if (response.status === 401 || response.status === 403) {
      errorMessage = 'Zugriff verweigert. Bitte überprüfe deinen API-Key.';
    } else if (response.status === 404) {
      errorMessage = 'Die angeforderte Ressource wurde nicht gefunden.';
    } else if (response.status === 429) {
      errorMessage = 'API-Ratenlimit erreicht. Bitte warte einen Moment.';
    } else if (response.status >= 500) {
      errorMessage = 'Der externe Server meldet ein Problem (5xx).';
    }

    document.dispatchEvent(new CustomEvent(window.StockMaster.Events.ERROR_OCCURRED, {
      detail: { message: errorMessage }
    }));
  }

  return {
    /**
     * Führt einen GET-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    get: (url, headers) => request(url, { method: 'GET', headers }),

    /**
     * Führt einen POST-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} body - Der zu sendende Daten-Body.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    post: (url, body, headers) => request(url, { method: 'POST', body, headers }),

    /**
     * Führt einen DELETE-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    delete: (url, headers) => request(url, { method: 'DELETE', headers })
  };
})();
