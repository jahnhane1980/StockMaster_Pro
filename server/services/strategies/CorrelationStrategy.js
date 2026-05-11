const AnalysisStrategy = require('./AnalysisStrategy');
const { ANALYSIS, API } = require('../../utils/AppConstants');

/**
 * Strategie zur Berechnung der Pearson-Korrelation.
 * Intent: Implementiert den Pearson-Algorithmus zur Identifikation linearer Abhängigkeiten (Regel 23).
 */
class CorrelationStrategy extends AnalysisStrategy {
  
  /**
   * Berechnet die Pearson-Korrelation zwischen zwei historischen Datensätzen.
   * @param {Array<Object>} history1 - Erster Datensatz.
   * @param {Array<Object>} history2 - Zweiter Datensatz.
   * @returns {Object} { correlation: number, quality: string, sampleSize: number }
   */
  execute(history1, history2) {
    if (!history1 || !history2 || history1.length === 0 || history2.length === 0) {
      this.logger.warn('[CorrelationStrategy] Korrelation abgebrochen: Unzureichende Daten.');
      return { correlation: 0, quality: 'Unzureichende Daten', sampleSize: 0 };
    }

    // 1. Alignment
    const map2 = new Map(history2.map(item => [item.date, item.close]));
    const alignedX = [];
    const alignedY = [];

    for (const item1 of history1) {
      if (map2.has(item1.date)) {
        alignedX.push(item1.close);
        alignedY.push(map2.get(item1.date));
      }
    }

    const n = alignedX.length;
    if (n < ANALYSIS.MIN_SAMPLE_SIZE) {
      this.logger.warn(`[CorrelationStrategy] Zu wenig Überlappung (n=${n}).`);
      return { correlation: 0, quality: 'Zu wenig Überlappung', sampleSize: n };
    }

    // 2. Berechnung
    const meanX = alignedX.reduce((a, b) => a + b, 0) / n;
    const meanY = alignedY.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const devX = alignedX[i] - meanX;
      const devY = alignedY[i] - meanY;
      numerator += devX * devY;
      sumSqX += devX * devX;
      sumSqY += devY * devY;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);

    if (denominator === 0) {
      this.logger.warn('[CorrelationStrategy] Keine Varianz.');
      return { correlation: 0, quality: 'Keine Varianz', sampleSize: n };
    }

    const correlation = numerator / denominator;

    return {
      correlation: parseFloat(correlation.toFixed(API.ALPHA_VANTAGE.DECIMAL_PRECISION)),
      quality: this._getQualitativeDescription(correlation),
      sampleSize: n
    };
  }

  /**
   * Qualitative Einordnung des Koeffizienten.
   * @param {number} r - Der Koeffizient.
   * @returns {string}
   * @private
   */
  _getQualitativeDescription(r) {
    const absR = Math.abs(r);
    let desc = '';

    if (absR >= ANALYSIS.CORRELATION_EXCELLENT) desc = 'Sehr starke';
    else if (absR >= ANALYSIS.CORRELATION_STRONG) desc = 'Starke';
    else if (absR >= ANALYSIS.CORRELATION_MODERATE) desc = 'Moderate';
    else if (absR >= ANALYSIS.CORRELATION_WEAK) desc = 'Schwache';
    else return 'Nahezu keine Korrelation';

    const direction = r > 0 ? 'positive Korrelation' : 'negative Korrelation (Divergenz)';
    return `${desc} ${direction}`;
  }
}

module.exports = CorrelationStrategy;
