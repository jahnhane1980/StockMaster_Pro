/**
 * StockMaster Intelligence Modul
 * Verwaltet Ticker-Details, Fundamentals und Sentiment
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Intelligence = (function() {
    const containerId = 'intelligence-container'; // Passe die ID ggf. an deine HTML an
    const REFRESH_THRESHOLD = 1000 * 60 * 60 * 24; // 24 Stunden (in Millisekunden)

    async function init() {
        console.log('🧠 Intelligence: Modul initialisiert.');
        bindEvents();
    }

    function bindEvents() {
        // Wir lauschen auf den Event, den die Watchlist beim Klick feuert[cite: 1, 2]
        document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, async (e) => {
            const symbol = e.detail.symbol;
            await loadTickerDetails(symbol);
        });
    }

    async function loadTickerDetails(symbol) {
        console.log(`🔍 Intelligence: Lade Details für ${symbol}...`);
        const repo = window.StockMaster.IntelligenceRepository;
        
        try {
            // 1. In der lokalen Datenbank nachsehen
            const cachedData = await repo.getForSymbol(symbol);
            
            // 2. Prüfen, ob die Daten "frisch" genug sind
            const now = Date.now();
            if (cachedData && cachedData.last_updated && (now - cachedData.last_updated < REFRESH_THRESHOLD)) {
                console.log('📦 Nutze Daten aus der SQLite-Datenbank (Cache-Hit)');
                render(cachedData);
            } else {
                console.log('🌐 Daten veraltet oder nicht vorhanden. Hole API-Update...');
                await fetchAndSaveFreshData(symbol);
            }
        } catch (err) {
            console.error('❌ Fehler beim Laden der Intelligence-Daten:', err);
        }
    }

    async function fetchAndSaveFreshData(symbol) {
        const finnhub = window.StockMaster.FinnhubService;
        const repo = window.StockMaster.IntelligenceRepository;

        // Hier kombinieren wir verschiedene API-Calls (Beispielhaft)
        try {
            // Wir holen Fundamentals (Metriken)
            const fundamentals = await finnhub.getFundamentals(symbol);
            
            // Daten-Objekt für die Datenbank vorbereiten
            const intelligenceData = {
                symbol: symbol,
                fundamentals: fundamentals,
                sentiment_score: Math.random() * 100, // Beispielwert, falls kein echtes Sentiment vorliegt
                dark_pool_flag: Math.random() > 0.8 ? 1 : 0 // Beispielhaft
            };

            // 3. In der Datenbank speichern für das nächste Mal
            await repo.save(intelligenceData);
            
            // 4. Anzeigen
            render(intelligenceData);
        } catch (err) {
            console.error('❌ API-Fehler:', err);
        }
    }

    function render(data) {
        const container = document.getElementById('details-container'); // Deine ID aus dem Screenshot
        if (!container) return;

        // Hier baust du deine UI zusammen (Beispiel)
        container.innerHTML = `
            <div class="card">
                <h3>Intelligence: ${data.symbol}</h3>
                <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>Sentiment:</strong> ${data.sentiment_score.toFixed(2)}%</div>
                    <div><strong>Dark Pool:</strong> ${data.dark_pool_flag ? '⚠️ Aktiv' : 'Normal'}</div>
                    <div><strong>Last Update:</strong> ${new Date(data.last_updated).toLocaleString()}</div>
                </div>
                <hr>
                <pre style="font-size: 0.7rem; background: #f4f4f4; padding: 10px; overflow: auto; max-height: 200px;">
${JSON.stringify(data.fundamentals, null, 2)}
                </pre>
            </div>
        `;
    }

    return { init };
})();