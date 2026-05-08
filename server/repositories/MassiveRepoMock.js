// server/repositories/MassiveRepoMock.js
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/Logger');
const { PROVIDER } = require('../utils/AppConstants');

/**
 * Mock-Repository für den Zugriff auf die Massive API.
 * Intent: Simuliert hochverfügbare Marktdaten durch das Lesen von lokalen JSON-Dateien.
 * Strukturell identisch zum MassiveRepo, um Austauschbarkeit zu gewährleisten.
 */
class MassiveRepoMock {
  constructor() {
    this.providerName = PROVIDER.MASSIVE;
    this.fixturesPath = path.join(__dirname, '..', 'tests', 'fixtures');
  }

  /**
   * Hilfsfunktion zum Lesen einer Fixture-Datei.
   * @param {string} fileName - Name der Datei im Fixtures-Ordner.
   * @returns {Promise<Object|null>} - Die Daten aus der JSON-Datei.
   * @private
   */
  async _readFixture(fileName) {
    const filePath = path.join(this.fixturesPath, fileName);
    try {
      Logger.info(`[MassiveRepoMock] Reading fixture: ${fileName}`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error(`[MassiveRepoMock] Error reading fixture ${fileName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Holt einen simulierten Echtzeit-Kurs.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das aktuelle Kurs-Objekt aus der Fixture.
   */
  async getRealtimeQuote(ticker) {
    return this._readFixture(`massive_quote_${ticker.toLowerCase()}.json`);
  }

  /**
   * Holt simulierte Intraday-Daten.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Die Intraday-Zeitreihe aus der Fixture.
   */
  async getIntradayData(ticker) {
    return this._readFixture(`massive_intraday_${ticker.toLowerCase()}.json`);
  }

  /**
   * Holt simulierte historische Tagesdaten für einen Zeitraum.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} fromDate - Startdatum (YYYY-MM-DD).
   * @param {string} toDate - Enddatum (YYYY-MM-DD).
   * @returns {Promise<Object|null>} - Die historischen Kursdaten aus der Fixture.
   */
  async getHistoricalData(ticker, fromDate, toDate) {
    // In der Mock-Version ignorieren wir ggf. den Datumsbereich und liefern eine Standard-Historie
    return this._readFixture(`massive_history_${ticker.toLowerCase()}.json`);
  }
}

module.exports = new MassiveRepoMock();
