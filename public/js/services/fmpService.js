/**
 * StockMaster FMP Service
 * Nutzt den neuen Stable-Endpunkt für historische Daten.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.FMPService = (function() {
    
    async function getHistoricalData(symbol) {
        const config = window.StockMaster.Config;
        const http = window.StockMaster.HttpClient;

        if (!config.FMP_API_KEY) {
            throw new Error("FMP API Key fehlt.");
        }

        // Wir behalten die 2 Jahre Begrenzung für den Test bei
        const now = new Date();
        const fromDate = new Date(now.setFullYear(now.getFullYear() - 2)).toISOString().split('T')[0];

        // URL Zusammenbau gemäß deinem funktionierenden Beispiel
        const url = `${config.FMP_BASE_URL}/historical-price-eod/full?symbol=${symbol}&from=${fromDate}&apikey=${config.FMP_API_KEY}`;
        
        console.log(`[FMPService] Stable-Abfrage: ${url}`);

        try {
            const response = await http.get(url);
            
            // Die Stable-API liefert oft direkt ein Array oder ein Objekt mit 'historical'
            const data = Array.isArray(response) ? response : (response.historical || []);

            if (data.length === 0) {
                console.warn(`[FMPService] Keine Daten für ${symbol} gefunden.`);
                return [];
            }

            return data.map(item => ({
                time: Math.floor(new Date(item.date).getTime() / 1000),
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume
            })).sort((a, b) => a.time - b.time); 

        } catch (error) {
            console.error(`[FMPService] Fehler bei Stable-Abfrage für ${symbol}:`, error);
            throw error;
        }
    }

    return { getHistoricalData };
})();