// public/js/services/BackendService.js

/**
 * StockMaster BackendService
 * Kapselt die Kommunikation mit der REST-API.
 */
class BackendService {
    /**
     * Initialisiert den Service.
     */
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Sendet einen neuen Ticker an den Server.
     * Der Server speichert den Ticker und startet den Daten-Download (History, Fundamentals, Sentiment)
     * im Hintergrund über den RequestManager.
     * 
     * @param {string} ticker - Das Aktiensymbol (z.B. 'MARA').
     * @returns {Promise<Object>} - Die Server-Antwort (success, message).
     */
    async addTickerToWatchlist(ticker) {
        try {
            // HINWEIS: Wenn du lieber deine eigene HttpClient.js nutzt, kannst du fetch hier austauschen.
            const response = await fetch(`${this.baseUrl}/watchlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: ticker })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Serverfehler beim Hinzufügen von ${ticker}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[BackendService] Fehler bei addTickerToWatchlist:', error);
            throw error;
        }
    }

    /**
     * Holt die aggregierten Intelligence-Daten vom Server.
     * Nutzt Prio 1 (Live-Daten via Massive) und mischt sie mit den gecachten DB-Daten (Alpha Vantage).
     * 
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Das vollständige Intelligence-Datenpaket für die UI.
     */
    async getIntelligenceData(ticker) {
        try {
            const response = await fetch(`${this.baseUrl}/intelligence/${ticker}`);
            
            // ==========================================
            // WICHTIG: Das Provider-Limit (429) abfangen!
            // ==========================================
            if (response.status === 429) {
                const errData = await response.json().catch(() => ({}));
                
                // Wir werfen einen speziellen Error, den du in Intelligence.js fangen 
                // und über deinen notificationService.js als Warnung anzeigen kannst.
                const limitError = new Error(errData.error || 'Provider API-Limit erreicht');
                limitError.isLimitError = true;
                limitError.details = errData.details;
                throw limitError;
            }

            if (!response.ok) {
                throw new Error(`HTTP Fehler: ${response.status} beim Laden der Daten`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[BackendService] Fehler bei getIntelligenceData für ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Holt gezielt Markt-Korrelationen (BTC, Gold) für einen Ticker.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object|null>} - Korrelationsdaten oder null bei Fehler.
     */
    async getMarketCorrelations(ticker) {
        try {
            const response = await fetch(`${this.baseUrl}/intelligence/correlations/${ticker}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.warn(`[BackendService] Korrelations-Fehler für ${ticker}:`, errData.error || 'Unbekannt');
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`[BackendService] Fehler bei getMarketCorrelations für ${ticker}:`, error);
            return null;
        }
    }

    /**
     * Holt gezielt Fundamentaldaten für einen Ticker.
     * @param {string} ticker - Das Aktiensymbol.
     * @returns {Promise<Object>} - Die Fundamentaldaten.
     */
    async getFundamentals(ticker) {
        try {
            const response = await fetch(`${this.baseUrl}/fundamentals/${ticker}`);
            if (!response.ok) throw new Error('Fehler beim Laden der Fundamentals');
            return await response.json();
        } catch (error) {
            console.error('[BackendService] getFundamentals Error:', error);
            throw error;
        }
    }

    /**
     * Erstellt eine Korrelation zwischen zwei Assets.
     * @param {string} mainTicker - Haupt-Ticker.
     * @param {string} linkedTicker - Verknüpfter Ticker (z.B. BTC).
     * @param {number} [score=0] - Initialer Korrelations-Score.
     * @returns {Promise<Object>} - Die Server-Bestätigung.
     */
    async addCorrelation(mainTicker, linkedTicker, score = 0) {
        try {
            const response = await fetch(`${this.baseUrl}/correlations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mainTicker, linkedTicker, score })
            });
            if (!response.ok) throw new Error('Fehler beim Erstellen der Korrelation');
            return await response.json();
        } catch (error) {
            console.error('[BackendService] addCorrelation Error:', error);
            throw error;
        }
    }
}

// Global als Instanz verfügbar machen, damit deine Module darauf zugreifen können
window.backendService = new BackendService();
