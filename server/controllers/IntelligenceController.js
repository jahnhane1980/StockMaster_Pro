// server/controllers/IntelligenceController.js
const HistoricalDataDAO = require('../models/HistoricalDataDAO');
const AnalysisService = require('../services/AnalysisService');
const Logger = require('../utils/Logger');

/**
 * Controller für komplexe Markt-Analysen und Intelligence-Abfragen.
 */
class IntelligenceController {

  /**
   * Berechnet Korrelationen eines Symbols zu Markt-Benchmarks (BTC, Gold).
   * GET /api/intelligence/correlations/:symbol
   * 
   * @param {Object} req - Das Express Request-Objekt.
   * @param {Object} res - Das Express Response-Objekt.
   * @returns {Promise<void>} - Sendet eine JSON-Antwort mit Korrelations-Scores.
   * Antwort-Schema: { symbol: string, timestamp: string, correlations: { btc: Object, gold: Object } }
   */
  async getMarketCorrelations(req, res) {
    const symbol = req.params.symbol.toUpperCase();

    try {
      Logger.info(`[IntelligenceController] Berechne Markt-Korrelationen für: ${symbol}`);

      // 1. Historische Daten abrufen: Basis für die mathematische Korrelation
      const mainHistory = await HistoricalDataDAO.getHistoryForChart(symbol);
      const btcHistory = await HistoricalDataDAO.getHistoryForChart('BTC');
      const goldHistory = await HistoricalDataDAO.getHistoryForChart('GOLD');

      if (!mainHistory || mainHistory.length < 10) {
        return res.status(400).json({ 
          error: 'Unzureichende historische Daten für das Haupt-Symbol.',
          symbol: symbol
        });
      }

      // 2. Korrelationen berechnen: Pearson-Algorithmus via AnalysisService
      const correlations = {};

      if (btcHistory && btcHistory.length >= 10) {
        correlations.btc = AnalysisService.calculateCorrelation(mainHistory, btcHistory);
      } else {
        correlations.btc = { correlation: 0, quality: 'Keine BTC-Referenzdaten' };
      }

      if (goldHistory && goldHistory.length >= 10) {
        correlations.gold = AnalysisService.calculateCorrelation(mainHistory, goldHistory);
      } else {
        correlations.gold = { correlation: 0, quality: 'Keine Gold-Referenzdaten' };
      }

      // 3. Antwort senden
      return res.status(200).json({
        symbol: symbol,
        timestamp: new Date().toISOString(),
        correlations: correlations
      });

    } catch (error) {
      Logger.error(`[IntelligenceController] Fehler bei Korrelations-Abfrage für ${symbol}: ${error.message}`);
      return res.status(500).json({ error: 'Interner Serverfehler bei der Korrelations-Berechnung.' });
    }
  }
}

module.exports = new IntelligenceController();
