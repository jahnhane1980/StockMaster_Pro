/**
 * StockMaster TickerRepository (Frontend)
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.TickerRepository = (function() {
    const apiUrl = '/api/tickers';

    return {
        async init() {
            console.log('📡 TickerRepository: API-Modus initialisiert');
            return Promise.resolve();
        },

        async getAllTickers() {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error('API-Ladefehler');
                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (GET):', error);
                return [];
            }
        },

        async addTicker(tickerData) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tickerData)
                });

                // FIX: Wenn der Server 500 schickt, hier abbrechen!
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server-Fehler beim Speichern');
                }

                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (POST):', error);
                throw error; // Den Fehler weiterreichen an die UI
            }
        },

        async deleteTicker(symbol) {
            try {
                const response = await fetch(`${apiUrl}/${symbol}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Loesch-Fehler');
                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (DELETE):', error);
                throw error;
            }
        }
    };
})();