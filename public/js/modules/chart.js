/**
 * StockMaster Chart Modul
 * Nutzt TradingView Lightweight Charts gemäß Tutorial-Vorgabe.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Chart = (function() {
    let currentChart = null;
    let currentSeries = null;
    let currentSymbol = null;

    function init() {
        console.log('StockMaster.Chart: Modul wird initialisiert...');
        document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, handleTickerSelected);
        document.addEventListener(window.StockMaster.Events.TICKER_REMOVED, handleTickerRemoved);
    }

    async function handleTickerSelected(e) {
        const symbol = e.detail.symbol;
        currentSymbol = symbol;
        await drawChart(symbol, 30); 
    }

    function handleTickerRemoved(e) {
        if (e.detail.symbol === currentSymbol) {
            clearChart();
        }
    }

    async function drawChart(symbol, daysBack) {
        const container = document.getElementById('chart-container');
        if (!container) return;

        container.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--text-secondary);"><p>Lade Daten für ${symbol}...</p></div>`;

        try {
            // Daten aus dem Repository laden
            const data = await window.StockMaster.TickerRepository.getChartData(symbol, daysBack);
            
            if (!data || data.length === 0) {
                container.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--placeholder);">Keine Daten für ${symbol} verfügbar.</div>`;
                return;
            }

            const uniqueData = Array.from(new Map(data.map(item => [item.time, item])).values());
            uniqueData.sort((a, b) => a.time - b.time);

            if (currentChart) {
                currentChart.remove();
                currentChart = null;
            }

            container.innerHTML = '';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '1rem';
            
            header.innerHTML = `
                <h2 style="margin: 0; font-family: var(--font-ui);">${symbol}</h2>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="time-btn" data-days="30" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border); background: ${daysBack === 30 ? 'var(--tertiary)' : 'var(--surface)'}; cursor: pointer; border-radius: 4px;">1 M</button>
                    <button class="time-btn" data-days="90" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border); background: ${daysBack === 90 ? 'var(--tertiary)' : 'var(--surface)'}; cursor: pointer; border-radius: 4px;">3 M</button>
                    <button class="time-btn" data-days="180" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border); background: ${daysBack === 180 ? 'var(--tertiary)' : 'var(--surface)'}; cursor: pointer; border-radius: 4px;">6 M</button>
                </div>
            `;
            container.appendChild(header);

            const btns = header.querySelectorAll('.time-btn');
            btns.forEach(btn => {
                btn.addEventListener('click', () => drawChart(symbol, parseInt(btn.dataset.days)));
            });

            const chartDiv = document.createElement('div');
            chartDiv.style.width = '100%';
            chartDiv.style.height = '400px'; 
            container.appendChild(chartDiv);

            // Chart-Instanz erstellen
            currentChart = LightweightCharts.createChart(chartDiv, {
                width: chartDiv.clientWidth,
                height: 400,
                layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#333' },
                grid: { vertLines: { color: '#e5e5e5' }, horzLines: { color: '#e5e5e5' } },
                timeScale: { borderColor: '#cccccc' },
            });

            // KORREKTER AUFRUF GEMÄSS TUTORIAL
            currentSeries = currentChart.addSeries(LightweightCharts.CandlestickSeries, {
                upColor: '#46C06D',
                downColor: '#D6463D',
                borderDownColor: '#D6463D',
                borderUpColor: '#46C06D',
                wickDownColor: '#D6463D',
                wickUpColor: '#46C06D',
            });

            currentSeries.setData(uniqueData);
            currentChart.timeScale().fitContent();

        } catch (error) {
            console.error('StockMaster.Chart: Fehler beim Zeichnen.', error);
            container.innerHTML = `<div style="color: var(--error); padding: 2rem;">Fehler beim Laden.</div>`;
        }
    }

    function clearChart() {
        const container = document.getElementById('chart-container');
        if (container) container.innerHTML = `<div style="display: flex; height: 100%; align-items: center; justify-content: center; color: var(--placeholder); font-style: italic;">Bitte wähle einen Ticker.</div>`;
        if (currentChart) {
            currentChart.remove();
            currentChart = null;
        }
        currentSymbol = null;
    }

    return { init: init };
})();