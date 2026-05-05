const axios = require('axios');

/**
 * FMP API Service (Backend)
 * Fokus: Historische Chart-Daten (Free-Tier freundlich)
 */
const FMPService = {
    // Zugriff auf Config via process.env
    getConfigs: () => ({
        apikey: process.env.FMP_API_KEY,
        baseUrl: process.env.FMP_BASE_URL
    }),

    /**
     * Holt historische Kursdaten (Candles)
     */
    async getHistoricalChart(symbol) {
        const { apikey, baseUrl } = this.getConfigs();
        try {
            // FMP Endpoint für Daily Historical Prices
            const url = `${baseUrl}/historical-price-full/${symbol}`;
            const response = await axios.get(url, {
                params: { apikey: apikey }
            });

            if (response.data && response.data.historical) {
                // Wir mappen das FMP-Format auf unser Standard-Format (Time, O, H, L, C, V)
                return response.data.historical.reverse().map(item => ({
                    time: Math.floor(new Date(item.date).getTime() / 1000),
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume
                }));
            }
            return [];
        } catch (error) {
            console.error(`❌ FMPService (Historical): ${error.message}`);
            return [];
        }
    },

    async getCompanyProfile(symbol) {
        const { apikey, baseUrl } = this.getConfigs();
        try {
            const response = await axios.get(`${baseUrl}/profile/${symbol}`, {
                params: { apikey: apikey }
            });
            return response.data[0] || {};
        } catch (error) {
            return {};
        }
    }
};

module.exports = FMPService;