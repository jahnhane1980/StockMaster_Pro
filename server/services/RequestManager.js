const Logger = require('../utils/Logger');
const HttpStatus = require('../utils/HttpStatus');
const Messages = require('../utils/Messages');
const { PRIORITY, PROVIDER, INTERNAL_ERR, CONFIG, LOG } = require('../utils/AppConstants');

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
    this.avDailyLimit = CONFIG.REQUEST_MANAGER.DAILY_API_LIMIT;
    this.avRequestsToday = 0; 
    this.avRequestsPerMinute = CONFIG.REQUEST_MANAGER.MINUTE_API_LIMIT;
    this.avRequestsThisMinute = 0;
    this.rateLimitWindow = CONFIG.REQUEST_MANAGER.RESET_INTERVAL;
    
    // Status
    this.isProcessing = false;
    this.requestIdCounter = 0;
    this._isRateLimited = false; // Flag für aktive Wartezeit
    
    // Reset Timer für das Minutenlimit (60 Sek)
    this.resetTimer = setInterval(() => { this.avRequestsThisMinute = 0; }, this.rateLimitWindow); 

    // Heartbeat-Log
    setInterval(() => this._heartbeat(), 5000);
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
      if (this.queues[priority].length >= CONFIG.REQUEST_MANAGER.MAX_QUEUE_SIZE) {
        Logger.error(`[RequestManager] Queue ${priority} voll (${CONFIG.REQUEST_MANAGER.MAX_QUEUE_SIZE}). Task verworfen.`);
        return reject(new Error(Messages.ERR_QUEUE_FULL));
      }

      const id = ++this.requestIdCounter;
      const queueSize = this.getQueueSize();
      Logger.info(LOG.TRACE.QUEUE_RECEIVED, priority, id, queueSize + 1);

      this.queues[priority].push({
        id,
        priority, 
        provider,
        taskFn,
        resolve,
        reject,
        retries: 0 // Initialer Retry-Zähler
      });
      
      Logger.info(LOG.DEBUG.CALLING_PROC, typeof this, this.isProcessing);
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
    Logger.info(LOG.DEBUG.ENTERED_PROC, typeof this);
    
    // Guard: Verhindert Mehrfachverarbeitung und vorzeitige Deadlocks (Bugfix-Audit 30.1)
    if (this.isProcessing) {
      Logger.info(LOG.DEBUG.GUARD_TRIGGERED);
      return;
    }
    
    this.isProcessing = true;
    Logger.info(LOG.DEBUG.GUARD_PASSED);

    try {
      // Hauptschleife zur Abarbeitung der Queue (Refactoring 31.4)
      while (true) {
        let nextTask = null;

        // Prioritäten: PRIORITY.CRITICAL > PRIORITY.IMPORTANT > PRIORITY.BACKGROUND
        for (const p of [PRIORITY.CRITICAL, PRIORITY.IMPORTANT, PRIORITY.BACKGROUND]) {
          if (this.queues[p].length > 0) {
            // Sonderlogik für PROVIDER.ALPHA_VANTAGE: Prüfen, ob wir überhaupt einen Slot frei haben
            const isAVSlotAvailable = (this.avRequestsToday < this.avDailyLimit) && (this.avRequestsThisMinute < this.avRequestsPerMinute);
            
            // Finde den ersten Task in der Queue, der kein PROVIDER.ALPHA_VANTAGE ist ODER falls Slot frei ist
            const taskIndex = this.queues[p].findIndex(t => t.provider !== PROVIDER.ALPHA_VANTAGE || isAVSlotAvailable);
            
            if (taskIndex !== -1) {
              nextTask = this.queues[p].splice(taskIndex, 1)[0];
              break;
            }
          }
        }

        if (!nextTask) {
          // Falls wir nur noch PROVIDER.ALPHA_VANTAGE Tasks haben, aber im Limit sind, warten wir kurz
          const hasPendingTasks = this.getQueueSize() > 0;
          if (hasPendingTasks && !this._isRateLimited) {
            Logger.info(`[RequestManager] Rate Limit Delay: ${CONFIG.REQUEST_MANAGER.LIMIT_WAIT_TIME}ms`);
            this._isRateLimited = true;
            setTimeout(() => {
              this._isRateLimited = false;
              this.processQueue();
            }, CONFIG.REQUEST_MANAGER.LIMIT_WAIT_TIME);
          }
          break; // Schleife verlassen, wenn kein ausführbarer Task gefunden wurde
        }

        const remaining = this.getQueueSize();
        Logger.info(LOG.TRACE.QUEUE_ATTEMPT, nextTask.id, remaining + 1);

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
          if (nextTask.retries < CONFIG.REQUEST_MANAGER.MAX_RETRIES && error.message !== INTERNAL_ERR.AV_DAILY_LIMIT) {
            nextTask.retries++;
            Logger.warn(`[RequestManager] Task fehlgeschlagen (${nextTask.provider}) ID: ${nextTask.id}. Retry ${nextTask.retries}/${CONFIG.REQUEST_MANAGER.MAX_RETRIES}. Fehler: ${error.message}`);
            
            // Zurück in die Queue (ans Ende der jeweiligen Priorität)
            this.queues[nextTask.priority].push(nextTask);
          } else {
            // Finales Scheitern
            if (error.message === INTERNAL_ERR.AV_DAILY_LIMIT) {
              nextTask.reject({ status: HttpStatus.TOO_MANY_REQUESTS, message: Messages.ERR_AV_DAILY_LIMIT });
            } else {
              Logger.error(`[RequestManager] Task ID ${nextTask.id} endgültig fehlgeschlagen nach ${nextTask.retries} Retries: ${error.message}`);
              nextTask.reject(error);
            }
          }
        }
      }

    } catch (criticalError) {
      Logger.error(LOG.DEBUG.PROC_ENTRY_ERROR, criticalError.message);
    } finally {
      this.isProcessing = false; // Systemfreigabe (Bugfix-Audit 31.6)
      if (this.getQueueSize() > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Berechnet die Gesamtgröße aller Warteschlangen.
   * @returns {number}
   */
  getQueueSize() {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  /**
   * Heartbeat-Log: Gibt alle 5 Sekunden den Status der Queue aus, falls diese nicht leer ist.
   * @private
   */
  _heartbeat() {
    const size = this.getQueueSize();
    if (size > 0 || this.isProcessing) {
      Logger.info(`[RequestManager] Heartbeat - Queue Size: ${size}, isProcessing: ${this.isProcessing}, AV Today: ${this.avRequestsToday}/${this.avDailyLimit}`);
    }
  }

  /**
   * Resettet den Status des RequestManagers (primär für Unit-Tests).
   */
  reset() {
    this.queues[PRIORITY.CRITICAL] = [];
    this.queues[PRIORITY.IMPORTANT] = [];
    this.queues[PRIORITY.BACKGROUND] = [];
    this.avRequestsToday = 0;
    this.avRequestsThisMinute = 0;
    this.isProcessing = false;
    this.requestIdCounter = 0;
    this._isRateLimited = false;
    
    // Timer neu starten mit aktuellem rateLimitWindow
    if (this.resetTimer) clearInterval(this.resetTimer);
    this.resetTimer = setInterval(() => { this.avRequestsThisMinute = 0; }, this.rateLimitWindow);
    
    Logger.info('[RequestManager] State manually reset.');
  }
}

module.exports = new RequestManager();
