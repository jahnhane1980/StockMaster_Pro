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
    this.isProcessing = true;

    // Prioritäten strikt abarbeiten: P1 > P2 > P3
    const nextTask = this.queues.P1.shift() || this.queues.P2.shift() || this.queues.P3.shift();

    if (!nextTask) {
      this.isProcessing = false;
      return;
    }

    try {
      // Spezielle Limit-Logik für Alpha Vantage
      if (nextTask.provider === 'AV') {
        if (this.avRequestsToday >= this.avDailyLimit) {
           throw new Error('AV_DAILY_LIMIT_REACHED');
        }
        
        if (this.avRequestsThisMinute >= this.avRequestsPerMinute) {
           // Minutenlimit erreicht: Task zurück an den Anfang seiner Prio-Queue
           this.queues[nextTask.priority].unshift(nextTask); 
           console.log("[RIM] AV Minutenlimit erreicht, pausiere für 15 Sekunden...");
           
           await this._sleep(15000); 
           this.isProcessing = false;
           this.processQueue(); // Erneut versuchen
           return;
        }

        // Request zählen, da er jetzt ausgeführt wird
        this.avRequestsToday++;
        this.avRequestsThisMinute++;
      }

      // Task ausführen
      const result = await nextTask.taskFn();
      nextTask.resolve(result);

    } catch (error) {
      if (error.message === 'AV_DAILY_LIMIT_REACHED') {
         // Kontrollierter Abbruch, wenn das Tageslimit erreicht ist
         nextTask.reject({ status: 429, message: 'Provider Limit Reached for today.' });
      } else {
         nextTask.reject(error);
      }
    } finally {
      this.isProcessing = false;
      // Kurze Pause, um die Node Event-Loop atmen zu lassen
      setTimeout(() => this.processQueue(), 100);
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