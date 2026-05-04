/**
 * StockMaster IntelligenceRepository (Frontend)
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.IntelligenceRepository = (function() {
    const apiUrl = '/api/intelligence';

    return {
        async init() {
            console.log('📡 IntelligenceRepository: Initialisiert.');
            return Promise.resolve();
        },

        async getForSymbol(symbol) {
            try {
                const response = await fetch(`${apiUrl}/${symbol}`);
                return await response.json();
            } catch (error) {
                console.error('❌ IntelligenceRepo (GET):', error);
                return null;
            }
        },

        async save(data) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                return await response.json();
            } catch (error) {
                console.error('❌ IntelligenceRepo (POST):', error);
                throw error;
            }
        }
    };
})();