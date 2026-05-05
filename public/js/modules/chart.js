/**
 * StockMaster Chart Modul
 * Nutzt ausschließlich das Repository (Backend-Daten)
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Chart = (function() {
    
    async function init() {
        console.log('📈 Chart: Modul initialisiert.');
        bindEvents();
    }

    function bindEvents() {
        document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, async (e) => {
            const symbol = e.detail.symbol;
            await drawChart(symbol);
        });
    }

    async function drawChart(symbol) {
        const repo = window.StockMaster.TickerRepository;
        
        try {
            // Das Repository fragt jetzt unseren Server, der alles verwaltet
            const chartData = await repo.getChartData(symbol);

            if (chartData && chartData.length > 0) {
                console.log(`✅ Chart: Daten für ${symbol} erfolgreich vom Server geladen.`);
                // Hier folgt deine Chart-Zeichen-Logik (z.B. Lightweight Charts)
                renderChart(chartData);
            } else {
                console.warn(`⚠️ Chart: Keine Daten für ${symbol} verfügbar.`);
                document.getElementById('chart-container').innerHTML = 'Keine Daten verfügbar.';
            }
        } catch (err) {
            console.error('❌ Chart: Fehler beim Laden der Daten:', err);
        }
    }

    function renderChart(data) {
        // Deine bestehende Zeichen-Logik hier einfügen...
        console.log("📊 Zeichne Chart mit", data.length, "Datenpunkten.");
    }

    return { init };
})();