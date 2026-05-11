/**
 * Basisklasse für Analyse-Strategien.
 * Intent: Definiert die Schnittstelle für alle mathematischen Analysen (Regel 23).
 */
class AnalysisStrategy {
  /**
   * Erstellt eine Instanz der Strategie.
   * @param {Object} logger - Die Logger-Instanz.
   */
  constructor(logger) {
    this.logger = logger;
    if (this.constructor === AnalysisStrategy) {
      throw new Error("AnalysisStrategy ist eine abstrakte Klasse und kann nicht direkt instanziiert werden.");
    }
  }

  /**
   * Führt die Analyse aus. Muss von Subklassen implementiert werden.
   * @param {...any} args - Die für die Analyse benötigten Daten.
   * @throws {Error} - Wenn die Methode nicht implementiert wurde.
   */
  execute(...args) {
    throw new Error("Methode 'execute()' muss implementiert werden.");
  }
}

module.exports = AnalysisStrategy;
