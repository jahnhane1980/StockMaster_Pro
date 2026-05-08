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
    const tech = window.StockMaster.AppConstants.TECH;
    const messages = window.StockMaster.Messages.UI;

    notifyLoading(true);
    const config = {
      method: options.method || tech.METHOD_GET,
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

      const result = await response.json();

      // Standardisierte Antwortprüfung (Regel 13)
      if (result && typeof result.success === 'boolean') {
        if (!result.success) {
          throw new Error(result.error || messages.UNKNOWN_API_ERR);
        }
        return result.data;
      }

      // Fallback für nicht standardisierte Antworten
      return result;

    } catch (error) {
      const constants = window.StockMaster.AppConstants;
      const msg = window.StockMaster.Messages;

      if (error.name === constants.ERROR_NAMES.TYPE_ERROR && error.message === msg.ERRORS.FAILED_TO_FETCH) {
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.ERROR_OCCURRED, {
          detail: { message: msg.UI.NETWORK_ERR }
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
    const HttpStatus = window.StockMaster.HttpStatus;
    let errorMessage = window.StockMaster.Messages.UI.UNKNOWN_API_ERR;
    let isLimitError = false;

    if (response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN) {
      errorMessage = 'Zugriff verweigert. Bitte überprüfe deinen API-Key.';
    } else if (response.status === HttpStatus.NOT_FOUND) {
      errorMessage = 'Die angeforderte Ressource wurde nicht gefunden.';
    } else if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
      errorMessage = 'API-Ratenlimit erreicht. Bitte warte einen Moment.';
      isLimitError = true;
    } else if (response.status >= HttpStatus.SERVER_ERROR) {
      errorMessage = 'Der externe Server meldet ein Problem (5xx).';
    }

    document.dispatchEvent(new CustomEvent(window.StockMaster.Events.ERROR_OCCURRED, {
      detail: { message: errorMessage, isLimitError: isLimitError }
    }));
  }

  return {
    /**
     * Führt einen GET-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    get: (url, headers) => request(url, { method: window.StockMaster.AppConstants.TECH.METHOD_GET, headers }),

    /**
     * Führt einen POST-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} body - Der zu sendende Daten-Body.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    post: (url, body, headers) => request(url, { method: window.StockMaster.AppConstants.TECH.METHOD_POST, body, headers }),

    /**
     * Führt einen DELETE-Request aus.
     * @param {string} url - Die Ziel-URL.
     * @param {Object} [headers] - Optionale Header.
     * @returns {Promise<any>}
     */
    delete: (url, headers) => request(url, { method: window.StockMaster.AppConstants.TECH.METHOD_DELETE, headers })
  };
})();
