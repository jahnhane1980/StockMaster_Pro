// server/repositories/AlphaVantageRepoMock.js
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/Logger');
const { PROVIDER, API } = require('../utils/AppConstants');

/**
 * Mock-Repository für den Zugriff auf die AlphaVantage API.
 * Intent: Simuliert die API-Antworten durch das Lesen von lokalen JSON-Dateien aus dem Fixtures-Ordner.
 * Dies ermöglicht Tests ohne API-Limits und ohne echte Netzwerkzugriffe.
 */
class AlphaVantageRepoMock {
  constructor() {
    this.providerName = PROVIDER.ALPHA_VANTAGE;
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
      Logger.info(`[AlphaVantageRepoMock] Reading fixture: ${fileName}`);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.error(`[AlphaVantageRepoMock] Error reading fixture ${fileName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Holt simulierte historische Tagesdaten.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Die Zeitreihendaten aus der Fixture.
   */
  async getDailyHistory(ticker) {
    return this._readFixture(`alpha_vantage_daily_history_${ticker.toLowerCase()}.json`);
  }

  /**
   * Holt simuliertes News Sentiment.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Sentiment-Daten aus der Fixture.
   */
  async getNewsSentiment(ticker) {
    return this._readFixture(`alpha_vantage_news_sentiment_${ticker.toLowerCase()}.json`);
  }

  /**
   * Holt simulierte Fundamentaldaten (Overview).
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Unternehmensprofil aus der Fixture.
   */
  async getFundamentalsOverview(ticker) {
    return this.getCompanyOverview(ticker);
  }

  /**
   * Holt simuliertes Company Overview.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Unternehmensprofil aus der Fixture.
   */
  async getCompanyOverview(ticker) {
    return this._readFixture(`alpha_vantage_overview_${ticker.toLowerCase()}.json`);
  }

  /**
   * Holt simulierten On-Balance Volume Indikator.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} [interval=API.AV_PARAMS.DAILY] - Zeitintervall.
   * @returns {Promise<Object|null>} - OBV-Zeitreihe aus der Fixture.
   */
  async getOBV(ticker, interval = API.AV_PARAMS.DAILY) {
    return this._readFixture(`alpha_vantage_obv_${ticker.toLowerCase()}_${interval}.json`);
  }
}

module.exports = new AlphaVantageRepoMock();
