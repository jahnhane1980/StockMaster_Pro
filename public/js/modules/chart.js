// public/js/modules/chart.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.ChartModule = (() => {
    
    let chart = null;
    let candleSeries = null;
    const containerId = 'chart-container';

    const init = () => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[ChartModule] Container #${containerId} nicht gefunden.`);
            return;
        }

        // 1. Chart initialisieren (Lightweight Charts)
        chart = LightweightCharts.createChart(container, {
            layout: { 
                background: { type: 'solid', color: 'transparent' }, 
                textColor: '#d1d4dc', 
            },
            grid: { 
                vertLines: { color: 'rgba(43, 43, 67, 0.5)' }, 
                horzLines: { color: 'rgba(43, 43, 67, 0.5)' }, 
            },
            timeScale: { 
                timeVisible: true, 
                secondsVisible: false, 
            },
            // Automatisch an die Breite und Höhe des Containers anpassen
            width: container.clientWidth,
            height: container.clientHeight || 500
        });

        // 2. Candlestick Serie hinzufügen
        candleSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // 3. Resize Observer: Passt den Chart an, wenn sich das Fenster ändert
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) return;
            const newRect = entries[0].contentRect;
            chart.applyOptions({ width: newRect.width, height: newRect.height });
        }).observe(container);

        // 4. EVENT LISTENER: Auf Daten aus dem IntelligenceModule warten
        if (window.StockMaster.Events && window.StockMaster.Events.CHART_DATA_READY) {
            document.addEventListener(window.StockMaster.Events.CHART_DATA_READY, handleDataReady);
            console.log('[ChartModule] Initialisiert und wartet auf Daten...');
        } else {
            console.error('[ChartModule] CHART_DATA_READY Event nicht in window.StockMaster.Events gefunden!');
        }
    };

    const handleDataReady = (event) => {
        const payload = event.detail;
        if (!payload || !payload.history) return;

        const historyData = payload.history;

        // Falls die Historie leer ist, Chart bereinigen
        if (historyData.length === 0) {
            candleSeries.setData([]);
            return;
        }

        // 5. Daten für Lightweight Charts formatieren
        // Lightweight Charts erwartet { time: 'YYYY-MM-DD', open, high, low, close }
        const chartData = historyData.map(item => ({
            time: item.date, // Unser SQLite-Backend liefert date als 'YYYY-MM-DD'
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));

        // 6. Daten in den Chart pumpen und Ansicht einpassen
        candleSeries.setData(chartData);
        chart.timeScale().fitContent();
        
        console.log(`[ChartModule] Chart für ${payload.ticker} mit ${chartData.length} Kerzen erfolgreich gerendert.`);
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    window.StockMaster.ChartModule.init();
});