// server/services/AnalysisService.js

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
    if (n < 5) { // Zu wenig Überlappung für eine sinnvolle Aussage
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

    if (absR >= 0.9) desc = 'Sehr starke';
    else if (absR >= 0.7) desc = 'Starke';
    else if (absR >= 0.4) desc = 'Moderate';
    else if (absR >= 0.1) desc = 'Schwache';
    else return 'Nahezu keine Korrelation';

    const direction = r > 0 ? 'positive Korrelation' : 'negative Korrelation (Divergenz)';
    return `${desc} ${direction}`;
  }
}

module.exports = new AnalysisService();
