/**
 * StockMaster TickerRepository (Frontend)
 * Kommuniziert mit der Node.js API
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.TickerRepository = (function() {
    const apiUrl = '/api/tickers';

    return {
        async init() {
            console.log('📡 TickerRepository: API-Modus initialisiert');
            return Promise.resolve();
        },

        // KRITISCH: Diese Funktion wurde vom chart.js vermisst
        async getChartData(symbol) {
            try {
                const response = await fetch(`/api/charts/${symbol}`);
                if (!response.ok) throw new Error('Chart-Ladefehler');
                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (GET Chart):', error);
                return [];
            }
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
                if (!response.ok) throw new Error('Speichern fehlgeschlagen');
                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (POST):', error);
                throw error;
            }
        },

        async deleteTicker(symbol) {
            try {
                const response = await fetch(`${apiUrl}/${symbol}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Löschen fehlgeschlagen');
                return await response.json();
            } catch (error) {
                console.error('❌ TickerRepository (DELETE):', error);
                throw error;
            }
        }
    };
})();