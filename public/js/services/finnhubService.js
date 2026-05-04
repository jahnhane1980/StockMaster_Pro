/**
 * StockMaster Finnhub Service
 * Spezialisiert auf die Suche nach Ticker-Symbolen.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.FinnhubService = (function() {
    
    async function searchTicker(query) {
        const config = window.StockMaster.Config;
        const http = window.StockMaster.HttpClient;

        if (!config.FINNHUB_API_KEY) {
            throw new Error("Finnhub API Key fehlt.");
        }

        const url = `${config.FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${config.FINNHUB_API_KEY}`;
        
        try {
            const response = await http.get(url);
            if (!response.result) return [];

            return response.result.map(item => ({
                symbol: item.displaySymbol || item.symbol,
                description: item.description
            }));
            
        } catch (error) {
            console.error('StockMaster.FinnhubService: Suche fehlgeschlagen.', error);
            throw error; 
        }
    }

    return {
        searchTicker: searchTicker
    };
})();