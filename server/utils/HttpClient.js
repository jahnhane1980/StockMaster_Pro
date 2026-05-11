const axios = require('axios');
const HttpStatus = require('./HttpStatus');

/**
 * StockMaster Server HttpClient
 * Ein Wrapper um Axios für standardisierte HTTP-Anfragen im Backend.
 */
class HttpClient {
  /**
   * Führt einen GET-Request aus.
   * @param {string} url - Die Ziel-URL.
   * @param {Object} [config] - Axios-Konfiguration.
   * @returns {Promise<Object>} - Das vollständige Axios-Response-Objekt.
   */
  async get(url, config = {}) {
    const response = await axios.get(url, config);
    this._validateStatus(response);
    return response;
  }

  /**
   * Validiert den HTTP-Status der Antwort.
   * @param {Object} response - Das Axios Response-Objekt.
   * @private
   */
  _validateStatus(response) {
    if (response.status !== HttpStatus.OK && response.status !== HttpStatus.CREATED) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
  }
}

module.exports = new HttpClient();
