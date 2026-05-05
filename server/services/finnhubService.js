const axios = require('axios');

/**
 * Finnhub API Service (Backend)
 * Fokus: Realtime Quotes & Kennzahlen
 */
const FinnhubService = {
    getConfigs: () => ({
        token: process.env.FINNHUB_API_KEY,
        baseUrl: process.env.FINNHUB_BASE_URL
    }),

    /**
     * Holt fundamentale Kennzahlen (Metrics)
     */
    async getBasicFinancials(symbol) {
        const { token, baseUrl } = this.getConfigs();
        try {
            const response = await axios.get(`${baseUrl}/stock/metric`, {
                params: {
                    symbol: symbol,
                    metric: 'all',
                    token: token
                }
            });
            return response.data;
        } catch (error) {
            console.error(`❌ FinnhubService (Financials): ${error.message}`);
            return {};
        }
    },

    /**
     * Holt den aktuellen Realtime-Kurs (Quote)
     */
    async getQuote(symbol) {
        const { token, baseUrl } = this.getConfigs();
        try {
            const response = await axios.get(`${baseUrl}/quote`, {
                params: {
                    symbol: symbol,
                    token: token
                }
            });
            return response.data;
        } catch (error) {
            console.error(`❌ FinnhubService (Quote): ${error.message}`);
            return null;
        }
    }
};

module.exports = FinnhubService;