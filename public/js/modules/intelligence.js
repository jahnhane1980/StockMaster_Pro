/**
 * StockMaster Intelligence Modul
 * Zuständig für Fundamentals, Sentiment und Daten-Caching
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Intelligence = (function() {
    // Schwellenwert für Cache-Aktualisierung (24 Stunden)
    const REFRESH_THRESHOLD = 1000 * 60 * 60 * 24; 

    /**
     * Initialisiert das Modul
     */
    async function init() {
        console.log('🧠 Intelligence: Modul initialisiert.');
        bindEvents();
    }

    /**
     * Bindet globale Events
     */
    function bindEvents() {
        // Lauscht auf die Auswahl eines Tickers in der Watchlist
        document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, async (e) => {
            const symbol = e.detail.symbol;
            await loadTickerDetails(symbol);
        });
    }

    /**
     * Lädt Details (lokal oder von API)
     */
    async function loadTickerDetails(symbol) {
        console.log(`🔍 Intelligence: Lade Details für ${symbol}...`);
        const repo = window.StockMaster.IntelligenceRepository;
        
        try {
            // 1. Versuche Daten aus der lokalen SQLite zu laden
            const cachedData = await repo.getForSymbol(symbol);
            
            const now = Date.now();
            if (cachedData && cachedData.last_updated && (now - cachedData.last_updated < REFRESH_THRESHOLD)) {
                console.log('📦 Intelligence: Nutze Daten aus der Datenbank (Cache-Hit).');
                render(cachedData);
            } else {
                console.log('🌐 Intelligence: Daten veraltet oder nicht vorhanden. Hole API-Update...');
                await fetchAndSaveFreshData(symbol);
            }
        } catch (err) {
            console.error('❌ Intelligence: Fehler beim Laden der Details:', err);
        }
    }

    /**
     * Holt frische Daten vom Finnhub Service und speichert sie
     */
    async function fetchAndSaveFreshData(symbol) {
        const finnhub = window.StockMaster.FinnhubService;
        const repo = window.StockMaster.IntelligenceRepository;

        try {
            // Abwärtskompatible Prüfung der Finnhub-Methoden
            let fundamentals = {};
            if (finnhub) {
                if (typeof finnhub.getBasicFinancials === 'function') {
                    fundamentals = await finnhub.getBasicFinancials(symbol);
                } else if (typeof finnhub.getFundamentals === 'function') {
                    fundamentals = await finnhub.getFundamentals(symbol);
                }
            }

            const intelligenceData = {
                symbol: symbol,
                fundamentals: fundamentals,
                sentiment_score: 50, // Standardwert oder Sentiment-Logik hier
                dark_pool_flag: 0,
                last_updated: Date.now()
            };

            // In der Datenbank speichern
            await repo.save(intelligenceData);
            
            // UI aktualisieren
            render(intelligenceData);
        } catch (err) {
            console.error('❌ Intelligence: API-Fehler beim Abrufen frischer Daten:', err);
        }
    }

    /**
     * Rendert die Intelligence-Ansicht
     */
    function render(data) {
        const container = document.getElementById('details-container');
        if (!container) return;

        container.innerHTML = `
            <div class="card intelligence-card">
                <h3>Intelligence: ${data.symbol}</h3>
                <div class="intelligence-meta" style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <span><strong>Sentiment:</strong> ${data.sentiment_score}%</span>
                    <span><strong>Aktualisiert:</strong> ${new Date(data.last_updated).toLocaleTimeString()}</span>
                </div>
                <div class="fundamentals-preview" style="background: #1e1e1e; color: #00ff00; padding: 10px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; font-size: 0.85rem; max-height: 300px; overflow-y: auto;">
                    <pre>${JSON.stringify(data.fundamentals, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    return {
        init: init
    };
})();