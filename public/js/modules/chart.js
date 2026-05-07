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

        const theme = window.StockMaster.AppConstants.CHART_THEME;

        // Chart-Konfiguration: Transparenter Hintergrund zur nahtlosen Integration in das CSS-Layout.
        chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: theme.TEXT_COLOR,
                fontSize: theme.FONT_SIZE,
                fontFamily: theme.FONT_FAMILY,
            },
            grid: {
                vertLines: { color: theme.GRID_COLOR },
                horzLines: { color: theme.GRID_COLOR },
            },
            rightPriceScale: {
                borderColor: theme.BORDER_COLOR,
            },
            timeScale: {
                borderColor: theme.BORDER_COLOR,
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
        });

        // Kerzen-Serie: Definierte Farben für Bullish/Bearish Trends passend zur Farbpalette.
        candleSeries = chart.addCandlestickSeries({
            upColor: theme.COLOR_UP,
            downColor: theme.COLOR_DOWN,
            borderVisible: false,
            wickUpColor: theme.COLOR_UP,
            wickDownColor: theme.COLOR_DOWN,
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
        const container = document.getElementById(chartContainerId);
        
        // Vorhandenes Overlay entfernen
        const existingOverlay = container.querySelector('.chart-empty-state');
        if (existingOverlay) existingOverlay.remove();

        if (!history || history.length === 0) {
            console.warn(`[ChartModule] Keine historischen Daten für ${symbol} empfangen.`);
            candleSeries.setData([]);
            
            // Empty State UI Overlay (Regel 19)
            const overlay = document.createElement('div');
            overlay.className = 'chart-empty-state';
            overlay.innerHTML = `
                <div class="chart-empty-state__content">
                    <ion-icon name="analytics-outline" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
                    <p>Keine historischen Daten für ${symbol} verfügbar.</p>
                </div>
            `;
            container.appendChild(overlay);
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
