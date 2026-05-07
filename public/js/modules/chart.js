// public/js/modules/Chart.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.ChartModule = (() => {

    const chartContainerId = 'chart-container';
    let chart;
    let candleSeries;

    /**
     * Initialisiert den TradingView Lightweight Chart.
     * @returns {void}
     */
    const init = () => {
        const container = document.getElementById(chartContainerId);
        if (!container) {
            console.warn(`[ChartModule] Container #${chartContainerId} nicht gefunden.`);
            return;
        }

        // Chart-Konfiguration: Transparenter Hintergrund zur nahtlosen Integration in das CSS-Layout.
        chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#d1d4dc',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
            },
            grid: {
                vertLines: { color: 'rgba(43, 43, 67, 0.3)' },
                horzLines: { color: 'rgba(43, 43, 67, 0.3)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.2)',
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.2)',
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
        });

        // Kerzen-Serie: Definierte Farben für Bullish/Bearish Trends passend zur Farbpalette.
        candleSeries = chart.addCandlestickSeries({
            upColor: '#00e676',
            downColor: '#ff5252',
            borderVisible: false,
            wickUpColor: '#00e676',
            wickDownColor: '#ff5252',
        });

        // Event-Listener für neue Daten registrieren (Orchestriert durch IntelligenceModule).
        if (window.StockMaster.Events) {
            document.addEventListener(window.StockMaster.Events.CHART_DATA_READY, handleDataReady);
            console.log('[ChartModule] Initialisiert und bereit für Daten.');
        }

        // Responsive Resizing: Sorgt dafür, dass der Chart bei Panel-Größenänderungen mitwächst.
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) return;
            const newRect = entries[0].contentRect;
            chart.applyOptions({ height: newRect.height, width: newRect.width });
        }).observe(container);
    };

    /**
     * Verarbeitet das CHART_DATA_READY Event.
     * Mappt die Repository-Daten auf das Format der Lightweight Charts Library.
     * @param {CustomEvent} event - Das Event-Objekt mit Symbol und Historie.
     * @returns {void}
     */
    const handleDataReady = (event) => {
        const { symbol, history, correlations } = event.detail;
        
        if (!history || history.length === 0) {
            console.warn(`[ChartModule] Keine historischen Daten für ${symbol} empfangen.`);
            candleSeries.setData([]);
            return;
        }

        // Daten-Mapping: Umwandlung in library-spezifisches Format {time, open, high, low, close}.
        const formattedData = history.map(item => ({
            time: item.date, // Format: YYYY-MM-DD (ISO 8601 wird von der Library bevorzugt).
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close)
        }));

        // Warum Sortierung: Lightweight Charts benötigt zwingend chronologisch aufsteigende Zeitstempel.
        formattedData.sort((a, b) => (a.time > b.time ? 1 : -1));

        candleSeries.setData(formattedData);
        
        // Automatischer Zoom auf den verfügbaren Datenzeitraum.
        chart.timeScale().fitContent();

        console.log(`[ChartModule] Chart für ${symbol} aktualisiert (${formattedData.length} Datenpunkte).`);
        
        // Optional: Korrelations-Daten verarbeiten (z.B. als Overlay oder Label).
        if (correlations && correlations.length > 0) {
            console.log(`[ChartModule] Korrelierte Assets erkannt:`, correlations.map(c => c.symbol));
            // Placeholder für zukünftige Overlay-Implementierungen (z.B. BTC-Preis-Overlay).
        }
    };

    return { init };
})();
