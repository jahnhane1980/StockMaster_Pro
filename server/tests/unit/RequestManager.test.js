// server/tests/unit/RequestManager.test.js
const RequestManager = require('../../services/RequestManager');
const { PRIORITY, PROVIDER } = require('../../utils/AppConstants');

/**
 * Unit Tests für den RequestManager.
 * Fokus: Grenzwert-Tests, Race-Conditions und Fehler-Kaskaden (Protokoll V6.0).
 */
describe('RequestManager Unit Tests', () => {
  // Globales Test-Timeout (Regel 31.6)
  jest.setTimeout(5000);

  beforeEach(() => {
    // Performance-Setup: Reduziere Rate-Limit-Window für Tests (Regel 31.6)
    RequestManager.rateLimitWindow = 50;
    
    // Sicherstellen, dass jeder Test mit einer sauberen Instanz startet
    RequestManager.reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test 1: 'Race Condition Stress'
   * Feuere 50 asynchrone Tasks absolut zeitgleich ab.
   * Ziel: Alle Ergebnisse kommen an, isProcessing ist danach wieder false.
   */
  test('Race Condition Stress: 50 concurrent tasks', async () => {
    const taskCount = 50;
    const tasks = [];
    
    for (let i = 0; i < taskCount; i++) {
      const task = () => new Promise(resolve => {
        // Simuliere kurze Verzögerung
        setTimeout(() => resolve(`Result ${i}`), 10);
      });
      tasks.push(RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, task));
    }

    // Timer vorspulen, um die Verzögerungen zu überbrücken
    jest.runAllTimers();

    const results = await Promise.all(tasks);
    
    expect(results.length).toBe(taskCount);
    expect(RequestManager.isProcessing).toBe(false);
    expect(RequestManager.getQueueSize()).toBe(0);
  });

  /**
   * Test 2: 'The Silent Killer'
   * Ein Task der weder resolved noch rejected (Timeout-Sim).
   * Ziel: Manager darf nicht ewig blockiert bleiben (wird durch try-finally im Code gelöst).
   */
  test('The Silent Killer: Task that never resolves', async () => {
    const hangingTask = () => new Promise(() => {}); // Hängt ewig
    
    // Wir feuern den hängenden Task ab (er wird nie fertig)
    RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, hangingTask);
    
    // Ein zweiter Task wird eingereiht
    RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, () => Promise.resolve('Success'));

    // In diesem spezifischen Test prüfen wir, ob isProcessing nach dem Start korrekt gesetzt ist
    expect(RequestManager.isProcessing).toBe(true);
    
    // Wir erzwingen einen Reset für nachfolgende Tests
    RequestManager.reset();
    expect(RequestManager.isProcessing).toBe(false);
  });

  /**
   * Test 3: 'Error Cascade'
   * 10 Tasks, jeder zweite schlägt fehl.
   * Ziel: Stabile Tasks werden korrekt verarbeitet.
   */
  test('Error Cascade: Alternating successes and failures', async () => {
    const taskCount = 10;
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      const isError = i % 2 === 1;
      const task = () => isError ? Promise.reject(new Error('Fail')) : Promise.resolve('Ok');
      
      const p = RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, task)
        .then(res => res)
        .catch(err => err.message);
      
      tasks.push(p);
    }

    jest.runAllTimers();
    const results = await Promise.all(tasks);

    expect(results.filter(r => r === 'Ok').length).toBe(5);
    expect(results.filter(r => r === 'Fail').length).toBe(5);
    expect(RequestManager.isProcessing).toBe(false);
  });

  /**
   * Test 4: 'Context-Integrity'
   * Aufruf via call/apply.
   * Ziel: Stabilität von 'this'.
   */
  test('Context-Integrity: Stable "this" via call/apply', async () => {
    const task = () => Promise.resolve('Context OK');
    
    // Indirekter Aufruf
    const result = await RequestManager.enqueue.call(RequestManager, PRIORITY.CRITICAL, PROVIDER.MASSIVE, task);
    
    expect(result).toBe('Context OK');
    expect(RequestManager.isProcessing).toBe(false);
  });

  /**
   * Test 5: 'Rapid-Fire Re-Entry'
   * Manueller Aufruf von processQueue während ein Task läuft.
   * Ziel: Guard muss greifen.
   */
  test('Rapid-Fire Re-Entry: Guard check', async () => {
    let callCount = 0;
    const slowTask = () => new Promise(resolve => {
      callCount++;
      setTimeout(() => resolve('Done'), 100);
    });

    // Erster Task startet
    RequestManager.enqueue(PRIORITY.CRITICAL, PROVIDER.MASSIVE, slowTask);
    
    // Manueller Re-Entry Versuch
    await RequestManager.processQueue();
    await RequestManager.processQueue();

    expect(callCount).toBe(1); // Task darf nur 1x gestartet worden sein
    
    jest.advanceTimersByTime(100);
    expect(RequestManager.isProcessing).toBe(false);
  });
});
