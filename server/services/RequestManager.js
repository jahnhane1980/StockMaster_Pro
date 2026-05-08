// server/services/RequestManager.js
const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const { PRIORITY, PROVIDER, INTERNAL_ERR } = require('../utils/AppConstants');

/**
 * Konfiguration für den RequestManager.
 * Intent: Zentralisierung von Magic Numbers zur besseren Wartbarkeit (Regel 6).
 */
const CONFIG = Object.freeze({
  MAX_QUEUE_SIZE: 100,
  MAX_RETRIES: 3,
  DAILY_API_LIMIT: 25,
  MINUTE_API_LIMIT: 5,
  RESET_INTERVAL: 60000,
  LIMIT_WAIT_TIME: 1000
});

/**
 * Zentraler Manager für alle ausgehenden API-Anfragen an externe Provider.
 * Intent: Um Provider-Limits (z. B. AlphaVantage 5 Req/Min) strikt einzuhalten, 
 * implementiert dieser Service ein prioritätsbasiertes Queue-System (PRIORITY.CRITICAL bis PRIORITY.BACKGROUND). 
 * Durch das asynchrone Queue-Modell und Zeitabstände (setImmediate/setTimeout) wird sichergestellt, 
 * dass kritische Real-Time-Daten (PRIORITY.CRITICAL) bevorzugt behandelt werden, während Hintergrund-Tasks 
 * (Sentiment/History) gedrosselt abgearbeitet werden.
 */
class RequestManager {
  constructor() {
    /** @type {Object<string, Array<Object>>} Warteschlangen nach Priorität */
    this.queues = {
      [PRIORITY.CRITICAL]: [],   // Kritisch (Real-Time, PROVIDER.MASSIVE)
      [PRIORITY.IMPORTANT]: [],  // Wichtig (History, PROVIDER.ALPHA_VANTAGE)
      [PRIORITY.BACKGROUND]: []  // Hintergrund (Sentiment, Fundamentals, PROVIDER.ALPHA_VANTAGE)
    };

    // Limits & Tracking
    this.avDailyLimit = CONFIG.DAILY_API_LIMIT;
    this.avRequestsToday = 0; 
    this.avRequestsPerMinute = CONFIG.MINUTE_API_LIMIT;
    this.avRequestsThisMinute = 0;
    
    // Status
    this.isProcessing = false;
    
    // Reset Timer für das Minutenlimit (60 Sek)
    setInterval(() => { this.avRequestsThisMinute = 0; }, CONFIG.RESET_INTERVAL); 
  }

  /**
   * Fügt einen asynchronen Task der entsprechenden Warteschlange hinzu.
   * Intent: Schutz vor Memory-Leaks durch Deckelung der Queue-Größe (Regel 12).
   * @param {string} priority - Priorität aus AppConstants.PRIORITY.
   * @param {string} provider - Provider aus AppConstants.PROVIDER.
   * @param {Function} taskFn - Die asynchrone Funktion (Promise), die den API-Call ausführt.
   * @returns {Promise<any>} - Versprechen, das mit dem API-Ergebnis aufgelöst wird.
   */
  enqueue(priority, provider, taskFn) {
    return new Promise((resolve, reject) => {
      // Memory-Schutz: Queue-Größe prüfen
      if (this.queues[priority].length >= CONFIG.MAX_QUEUE_SIZE) {
        Logger.error(`[RequestManager] Queue ${priority} voll (${CONFIG.MAX_QUEUE_SIZE}). Task verworfen.`);
        return reject(new Error(`Queue ${priority} ist voll. Bitte später versuchen.`));
      }

      this.queues[priority].push({
        priority, 
        provider,
        taskFn,
        resolve,
        reject,
        retries: 0 // Initialer Retry-Zähler
      });
      
      this.processQueue();
    });
  }

  /**
   * Arbeitet die Warteschlangen unter Berücksichtigung der Priorität und Rate-Limits ab.
   * Intent: PRIORITY.CRITICAL Tasks werden immer bevorzugt. Fehlerhafte Tasks werden bis zu 3x wiederholt (Regel 12).
   * @returns {Promise<void>}
   * @private
   */
  async processQueue() {
    if (this.isProcessing) return;
    
    // Wir suchen den nächsten ausführbaren Task
    let nextTask = null;
    let queueUsed = null;

    // Prioritäten: PRIORITY.CRITICAL > PRIORITY.IMPORTANT > PRIORITY.BACKGROUND
    for (const p of [PRIORITY.CRITICAL, PRIORITY.IMPORTANT, PRIORITY.BACKGROUND]) {
      if (this.queues[p].length > 0) {
        // Sonderlogik für PROVIDER.ALPHA_VANTAGE: Prüfen, ob wir überhaupt einen Slot frei haben
        const isAVSlotAvailable = (this.avRequestsToday < this.avDailyLimit) && (this.avRequestsThisMinute < this.avRequestsPerMinute);
        
        // Finde den ersten Task in der Queue, der kein PROVIDER.ALPHA_VANTAGE ist ODER falls Slot frei ist
        const taskIndex = this.queues[p].findIndex(t => t.provider !== PROVIDER.ALPHA_VANTAGE || isAVSlotAvailable);
        
        if (taskIndex !== -1) {
          nextTask = this.queues[p].splice(taskIndex, 1)[0];
          queueUsed = p;
          break;
        }
      }
    }

    if (!nextTask) {
      // Falls wir nur noch PROVIDER.ALPHA_VANTAGE Tasks haben, aber im Limit sind, warten wir kurz (1 Sek)
      const hasAVTasks = this.queues[PRIORITY.CRITICAL].length > 0 || 
                         this.queues[PRIORITY.IMPORTANT].length > 0 || 
                         this.queues[PRIORITY.BACKGROUND].length > 0;
      if (hasAVTasks) {
        setTimeout(() => this.processQueue(), CONFIG.LIMIT_WAIT_TIME);
      }
      return;
    }

    this.isProcessing = true;

    try {
      // Tracking für PROVIDER.ALPHA_VANTAGE
      if (nextTask.provider === PROVIDER.ALPHA_VANTAGE) {
        this.avRequestsToday++;
        this.avRequestsThisMinute++;
      }

      // Task ausführen
      const result = await nextTask.taskFn();
      nextTask.resolve(result);

    } catch (error) {
      // Retry-Logik (Regel 12)
      if (nextTask.retries < CONFIG.MAX_RETRIES && error.message !== INTERNAL_ERR.AV_DAILY_LIMIT) {
        nextTask.retries++;
        Logger.warn(`[RequestManager] Task fehlgeschlagen (${nextTask.provider}). Retry ${nextTask.retries}/${CONFIG.MAX_RETRIES}. Fehler: ${error.message}`);
        
        // Zurück in die Queue (ans Ende der jeweiligen Priorität)
        this.queues[nextTask.priority].push(nextTask);
      } else {
        // Finales Scheitern
        if (error.message === INTERNAL_ERR.AV_DAILY_LIMIT) {
          nextTask.reject({ status: HttpStatus.TOO_MANY_REQUESTS, message: 'Provider Limit Reached for today.' });
        } else {
          Logger.error(`[RequestManager] Task endgültig fehlgeschlagen nach ${nextTask.retries} Retries: ${error.message}`);
          nextTask.reject(error);
        }
      }
    } finally {
      this.isProcessing = false;
      // Sofort weitermachen (setImmediate), um die Performance der Queue hochzuhalten
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Hilfsfunktion zum asynchronen Warten.
   * @param {number} ms - Millisekunden.
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new RequestManager();
