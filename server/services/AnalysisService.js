/**
 * Service für die statistische Analyse von Marktdaten.
 * Intent: Dieser Service delegiert komplexe Berechnungen an spezialisierte Strategien (Strategy Pattern).
 * Gemäß Regel 23 dient dies der Entkopplung von Algorithmen und Geschäftslogik.
 */
class AnalysisService {
  /**
   * Erstellt eine Instanz des AnalysisService.
   * @param {Object} logger - Die Logger-Instanz (Regel 4).
   * @param {Object} correlationStrategy - Die Strategie zur Korrelationsberechnung.
   */
  constructor(logger, correlationStrategy) {
    this.logger = logger;
    this.correlationStrategy = correlationStrategy;
  }
  
  /**
   * Berechnet die Pearson-Korrelation zwischen zwei historischen Datensätzen.
   * Delegiert an die CorrelationStrategy.
   * 
   * @param {Array<Object>} history1 - Erster Datensatz.
   * @param {Array<Object>} history2 - Zweiter Datensatz.
   * @returns {Object} { correlation: number, quality: string, sampleSize: number }
   */
  calculateCorrelation(history1, history2) {
    return this.correlationStrategy.execute(history1, history2);
  }
}

module.exports = AnalysisService;
