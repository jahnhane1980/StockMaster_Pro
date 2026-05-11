// server/repositories/RepoFactory.js
const AVMarketDataRepo = require('./AVMarketDataRepo');
const AVIntelligenceRepo = require('./AVIntelligenceRepo');
const AVFundamentalRepo = require('./AVFundamentalRepo');
const AlphaVantageRepoMock = require('./AlphaVantageRepoMock'); // TODO: Später ggf. auch aufteilen
const MassiveRepo = require('./MassiveRepo');
const MassiveRepoMock = require('./MassiveRepoMock');
const Logger = require('../utils/Logger');
const RequestManager = require('../services/RequestManager');

/**
 * Factory zur Bereitstellung von Repository-Instanzen.
 */
class RepoFactory {
  /**
   * Gibt das passende AlphaVantage Market Data Repository zurück.
   */
  static getAVMarketDataRepo() {
    return process.env.APP_MODE === 'MOCK' ? AlphaVantageRepoMock : new AVMarketDataRepo(Logger, RequestManager);
  }

  /**
   * Gibt das passende AlphaVantage Intelligence Repository zurück.
   */
  static getAVIntelligenceRepo() {
    return process.env.APP_MODE === 'MOCK' ? AlphaVantageRepoMock : new AVIntelligenceRepo(Logger, RequestManager);
  }

  /**
   * Gibt das passende AlphaVantage Fundamental Repository zurück.
   */
  static getAVFundamentalRepo() {
    return process.env.APP_MODE === 'MOCK' ? AlphaVantageRepoMock : new AVFundamentalRepo(Logger, RequestManager);
  }

  /**
   * Kompatibilitäts-Methode (für den Übergang).
   * @deprecated
   */
  static getAlphaVantageRepo() {
    return this.getAVMarketDataRepo();
  }

  /**
   * Gibt die passende Instanz des Massive-Repositories zurück.
   */
  static getMassiveRepo() {
    return process.env.APP_MODE === 'MOCK' ? MassiveRepoMock : MassiveRepo;
  }
}

module.exports = RepoFactory;
