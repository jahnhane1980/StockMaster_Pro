// server/services/RequestManager.js

class RequestManager {
  constructor() {
    // Queue für die verschiedenen Prioritäten
    this.queues = {
      P1: [], // Kritisch (Real-Time, Massive)
      P2: [], // Wichtig (History, AV)
      P3: []  // Hintergrund (Sentiment, Fundamentals, AV)
    };

    // Limits & Tracking
    this.avDailyLimit = 25;
    this.avRequestsToday = 0; // Für Produktionsbetrieb später evtl. an eine DB koppeln
    this.avRequestsPerMinute = 5;
    this.avRequestsThisMinute = 0;
    
    // Status
    this.isProcessing = false;
    
    // Reset Timer für das Minutenlimit
    setInterval(() => { this.avRequestsThisMinute = 0; }, 60000); 
  }

  // Methode, um einen Request in die Warteschlange zu stellen
  // priority: 'P1', 'P2' oder 'P3'
  // provider: 'AV' oder 'MASSIVE'
  // taskFn: Die asynchrone Axios/Fetch Funktion
  enqueue(priority, provider, taskFn) {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({
        priority, // Speichern der Prio für evtl. Requeuing
        provider,
        taskFn,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    // Wir suchen den nächsten ausführbaren Task
    let nextTask = null;
    let queueUsed = null;

    // Prioritäten: P1 > P2 > P3
    for (const p of ['P1', 'P2', 'P3']) {
      if (this.queues[p].length > 0) {
        // Sonderlogik für AV: Prüfen, ob wir überhaupt einen AV-Slot frei haben
        const isAVSlotAvailable = (this.avRequestsToday < this.avDailyLimit) && (this.avRequestsThisMinute < this.avRequestsPerMinute);
        
        // Finde den ersten Task in der Queue, der kein AV ist ODER falls AV-Slot frei ist
        const taskIndex = this.queues[p].findIndex(t => t.provider !== 'AV' || isAVSlotAvailable);
        
        if (taskIndex !== -1) {
          nextTask = this.queues[p].splice(taskIndex, 1)[0];
          queueUsed = p;
          break;
        }
      }
    }

    if (!nextTask) {
      // Falls wir nur noch AV Tasks haben, aber im Limit sind, warten wir kurz
      const hasAVTasks = this.queues.P1.length > 0 || this.queues.P2.length > 0 || this.queues.P3.length > 0;
      if (hasAVTasks) {
        // console.log("[RIM] Nur noch AV Tasks in der Queue, aber Limit erreicht. Warte...");
        setTimeout(() => this.processQueue(), 1000);
      }
      return;
    }

    this.isProcessing = true;

    try {
      // Tracking für AV
      if (nextTask.provider === 'AV') {
        this.avRequestsToday++;
        this.avRequestsThisMinute++;
      }

      // Task ausführen
      const result = await nextTask.taskFn();
      nextTask.resolve(result);

    } catch (error) {
      if (error.message === 'AV_DAILY_LIMIT_REACHED') {
         nextTask.reject({ status: 429, message: 'Provider Limit Reached for today.' });
      } else {
         nextTask.reject(error);
      }
    } finally {
      this.isProcessing = false;
      // Sofort weitermachen, falls noch was in der Queue ist
      setImmediate(() => this.processQueue());
    }
  }

  // Hilfsfunktion zum asynchronen Warten
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton-Export, damit alle Server-Module dieselbe Queue nutzen
const rimInstance = new RequestManager();
module.exports = rimInstance;