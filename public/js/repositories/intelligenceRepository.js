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

        /**
         * Holt die allgemeinen Intelligence-Daten (Sentiment, Fundamentals, History)
         */
        async getForSymbol(symbol) {
            try {
                const response = await fetch(`${apiUrl}/${symbol}`);
                if (!response.ok) {
                    throw new Error(`Fehler beim Laden der Intelligence-Daten: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('❌ IntelligenceRepo (GET):', error);
                return null;
            }
        },

        /**
         * Holt Markt-Korrelationen (BTC, Gold) für ein Symbol
         * GET /api/intelligence/correlations/:symbol
         */
        async getCorrelations(symbol) {
            try {
                const response = await fetch(`${apiUrl}/correlations/${symbol}`);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn(`[IntelligenceRepo] Korrelations-Abfrage fehlgeschlagen (${response.status}):`, errorData.error || 'Unbekannter Fehler');
                    return { 
                        symbol, 
                        correlations: { 
                            btc: { correlation: 0, quality: 'Nicht verfügbar' }, 
                            gold: { correlation: 0, quality: 'Nicht verfügbar' } 
                        } 
                    };
                }

                return await response.json();
            } catch (error) {
                console.error(`❌ IntelligenceRepo (GET Correlations für ${symbol}):`, error);
                return null;
            }
        }
    };
})();
