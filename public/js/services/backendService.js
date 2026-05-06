// public/js/services/backendService.js

class BackendService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Sendet einen neuen Ticker an den Server.
     * Der Server speichert den Ticker und startet den Daten-Download (History, Fundamentals, Sentiment)
     * im Hintergrund über den RequestManager.
     * 
     * @param {string} ticker - Das Aktiensymbol (z.B. 'MARA')
     */
    async addTickerToWatchlist(ticker) {
        try {
            // HINWEIS: Wenn du lieber deine eigene httpClient.js nutzt, kannst du fetch hier austauschen.
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
     * @param {string} ticker - Das Aktiensymbol
     */
    async getIntelligenceData(ticker) {
        try {
            const response = await fetch(`${this.baseUrl}/intelligence/${ticker}`);
            
            // ==========================================
            // WICHTIG: Das Provider-Limit (429) abfangen!
            // ==========================================
            if (response.status === 429) {
                const errData = await response.json().catch(() => ({}));
                
                // Wir werfen einen speziellen Error, den du in intelligence.js fangen 
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
}

// Global als Instanz verfügbar machen, damit deine Module darauf zugreifen können
const backendService = new BackendService();