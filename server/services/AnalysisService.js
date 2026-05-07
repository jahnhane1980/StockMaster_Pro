// server/services/AnalysisService.js
const Logger = require('../utils/Logger');

/**
 * Konfiguration für die Analyse-Logik.
 * Intent: Zentralisierung statistischer Schwellenwerte (Regel 6).
 */
const ANALYSIS_CONFIG = Object.freeze({
  MIN_SAMPLE_SIZE: 5,
  CORRELATION_EXCELLENT: 0.9,
  CORRELATION_STRONG: 0.7,
  CORRELATION_MODERATE: 0.4,
  CORRELATION_WEAK: 0.1
});

/**
 * Service für die statistische Analyse von Marktdaten.
 * Intent: Dieser Service bietet mathematische Hilfsfunktionen zur Identifikation von 
 * Zusammenhängen zwischen Assets. Wir nutzen die Pearson-Korrelation, um Signale zu 
 * gewichten. Ein Koeffizient von > 0.7 gilt als 'starkes' Signal, da hier eine 
 * hohe lineare Abhängigkeit vorliegt, die für Handelsentscheidungen relevant ist.
 */
class AnalysisService {
  
  /**
   * Berechnet die Pearson-Korrelation zwischen zwei historischen Datensätzen.
   * Stellt sicher, dass nur Datenpunkte am exakt selben Tag verglichen werden (Alignment).
   * Intent: Wir fordern eine Mindest-Stichprobengröße (n=5), um statistisches Rauschen 
   * bei zu geringer Überlappung zu vermeiden.
   * 
   * @param {Array<Object>} history1 - Erster Datensatz [{date: 'YYYY-MM-DD', close: 100}, ...]
   * @param {Array<Object>} history2 - Zweiter Datensatz (z.B. Benchmark)
   * @returns {Object} { correlation: number, quality: string, sampleSize: number }
   */
  calculateCorrelation(history1, history2) {
    if (!history1 || !history2 || history1.length === 0 || history2.length === 0) {
      Logger.warn('[AnalysisService] Korrelation abgebrochen: Unzureichende Daten (einer der Datensätze ist leer).');
      return { correlation: 0, quality: 'Unzureichende Daten', sampleSize: 0 };
    }

    // 1. Alignment: Nur Tage nehmen, die in beiden Datensätzen vorhanden sind
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
    if (n < ANALYSIS_CONFIG.MIN_SAMPLE_SIZE) { // Zu wenig Überlappung für eine sinnvolle Aussage
      Logger.warn(`[AnalysisService] Korrelation unpräzise: Zu wenig Überlappung (n=${n}). Erwarte min. ${ANALYSIS_CONFIG.MIN_SAMPLE_SIZE}.`);
      return { correlation: 0, quality: 'Zu wenig Überlappung', sampleSize: n };
    }

    // 2. Pearson Korrelation berechnen
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
      Logger.warn('[AnalysisService] Korrelation nicht berechenbar: Keine Varianz in den Daten (Denominator=0).');
      return { correlation: 0, quality: 'Keine Varianz', sampleSize: n };
    }


    const correlation = numerator / denominator;

    return {
      correlation: parseFloat(correlation.toFixed(4)),
      quality: this._getQualitativeDescription(correlation),
      sampleSize: n
    };
  }

  /**
   * Qualitative Einordnung des Pearson-Koeffizienten basierend auf statistischen Standards.
   * @param {number} r - Der berechnete Korrelationskoeffizient (-1 bis 1).
   * @returns {string} - Eine textuelle Beschreibung der Signalstärke.
   * @private
   */
  _getQualitativeDescription(r) {
    const absR = Math.abs(r);
    let desc = '';

    if (absR >= ANALYSIS_CONFIG.CORRELATION_EXCELLENT) desc = 'Sehr starke';
    else if (absR >= ANALYSIS_CONFIG.CORRELATION_STRONG) desc = 'Starke';
    else if (absR >= ANALYSIS_CONFIG.CORRELATION_MODERATE) desc = 'Moderate';
    else if (absR >= ANALYSIS_CONFIG.CORRELATION_WEAK) desc = 'Schwache';
    else return 'Nahezu keine Korrelation';

    const direction = r > 0 ? 'positive Korrelation' : 'negative Korrelation (Divergenz)';
    return `${desc} ${direction}`;
  }
}

module.exports = new AnalysisService();
