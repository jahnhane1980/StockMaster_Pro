// server/repositories/RepoFactory.js
const AlphaVantageRepo = require('./AlphaVantageRepo');
const AlphaVantageRepoMock = require('./AlphaVantageRepoMock');
const MassiveRepo = require('./MassiveRepo');
const MassiveRepoMock = require('./MassiveRepoMock');

/**
 * Factory zur Bereitstellung von Repository-Instanzen.
 * Intent: Ermöglicht das Umschalten zwischen echten API-Zugriffen und Mock-Daten
 * basierend auf der Umgebungsvariable APP_MODE.
 * Die Factory dient als zentraler Zugriffspunkt (Rule 1) und abstrahiert die
 * konkrete Implementierung von den konsumierenden Services.
 */
class RepoFactory {
  /**
   * Gibt die passende Instanz des AlphaVantage-Repositories zurück.
   * @returns {Object} - AlphaVantageRepo oder AlphaVantageRepoMock Instanz.
   */
  static getAlphaVantageRepo() {
    return process.env.APP_MODE === 'MOCK' ? AlphaVantageRepoMock : AlphaVantageRepo;
  }

  /**
   * Gibt die passende Instanz des Massive-Repositories zurück.
   * @returns {Object} - MassiveRepo oder MassiveRepoMock Instanz.
   */
  static getMassiveRepo() {
    return process.env.APP_MODE === 'MOCK' ? MassiveRepoMock : MassiveRepo;
  }
}

module.exports = RepoFactory;
