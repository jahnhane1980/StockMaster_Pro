const TickerRepository = {
    apiUrl: '/api/tickers',

    async getAllTickers() {
        console.log("🔍 Repository: Lade alle Ticker..."); // LOG
        try {
            const response = await fetch(this.apiUrl);
            console.log("📡 Server-Antwort Status:", response.status); // LOG
            if (!response.ok) throw new Error('Fehler beim Laden');
            return await response.json();
        } catch (error) {
            console.error('❌ Repository Error (GET):', error);
            return [];
        }
    },

    async addTicker(tickerData) {
        console.log("📤 Repository: Sende neuen Ticker...", tickerData); // LOG
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tickerData)
            });
            const result = await response.json();
            console.log("✅ Server-Antwort:", result); // LOG
            return result;
        } catch (error) {
            console.error('❌ Repository Error (POST):', error);
            throw error;
        }
    }
    // ... restliche Methoden
};