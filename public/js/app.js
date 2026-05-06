// public/js/app.js (oder deine entsprechende Haupt-JS-Datei)

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. UI ELEMENTE REFERENZIEREN
    // WICHTIG: Bitte passe diese IDs an deine index.html an!
    // ==========================================
    
    // Watchlist & Suche
    const addBtn = document.getElementById('add-ticker-btn');
    const searchInput = document.getElementById('ticker-search');
    const watchlistContainer = document.getElementById('watchlist-ul'); // Wo die LIs reinkommen
    const statusMsg = document.getElementById('status-message'); // Für Fehlermeldungen/Feedback
    
    // Intelligence Board (Das Haupt-Panel)
    const boardPanel = document.getElementById('intelligence-board');
    const emptyStatePanel = document.getElementById('empty-state');
    
    // Board Header (Preis etc.)
    const boardTickerName = document.getElementById('board-ticker-name');
    const boardPrice = document.getElementById('board-price');
    const boardChange = document.getElementById('board-change');
    
    // Fundamentals
    const valMcap = document.getElementById('val-mcap');
    const valDebt = document.getElementById('val-debt');
    const valRev = document.getElementById('val-rev');
    
    // Sentiment
    const sentimentIndicator = document.getElementById('sentiment-indicator');
    const sentimentText = document.getElementById('sentiment-text');

    // Chart-Container
    const chartContainerId = 'tvchart';


    // ==========================================
    // 2. CHART INITIALISIEREN (Lightweight Charts)
    // ==========================================
    let chart;
    let candleSeries;

    function initChart() {
        const container = document.getElementById(chartContainerId);
        if (!container) {
            console.warn(`[Chart] Container mit ID '${chartContainerId}' nicht gefunden. Chart wird nicht geladen.`);
            return;
        }

        // Lightweight Charts Instanz erstellen
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
        });
        
        candleSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Responsive machen
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) { return; }
            const newRect = entries[0].contentRect;
            chart.applyOptions({ height: newRect.height, width: newRect.width });
        }).observe(container);
    }

    // Chart sofort initialisieren (bleibt erstmal leer)
    if (typeof LightweightCharts !== 'undefined') {
        initChart();
    } else {
        console.error('[Chart] Lightweight Charts Bibliothek nicht gefunden! Bitte in der index.html einbinden.');
    }


    // ==========================================
    // 3. WATCHLIST: TICKER HINZUFÜGEN
    // ==========================================
    if (addBtn && searchInput) {
        addBtn.addEventListener('click', async () => {
            const ticker = searchInput.value.toUpperCase().trim();
            if (!ticker) return;

            try {
                if(statusMsg) statusMsg.textContent = `Füge ${ticker} hinzu...`;
                
                // Aufruf an unseren Backend-Controller
                const response = await fetch('/api/watchlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol: ticker })
                });

                if (response.ok) {
                    if(statusMsg) statusMsg.textContent = `Hintergrund-Sync für ${ticker} gestartet.`;
                    addTickerToUI(ticker);
                    searchInput.value = '';
                } else {
                    const errText = await response.text();
                    console.error('[Watchlist] Fehler:', errText);
                    if(statusMsg) statusMsg.textContent = 'Fehler beim Hinzufügen.';
                }
            } catch (error) {
                console.error('[Watchlist] Netzwerkfehler:', error);
                if(statusMsg) statusMsg.textContent = 'Server nicht erreichbar.';
            }
        });
    }

    // Hilfsfunktion: Ticker als <li> in die Watchlist hängen
    function addTickerToUI(ticker) {
        if (!watchlistContainer) return;
        
        // Verhindern, dass Ticker doppelt in der Liste auftauchen
        if (watchlistContainer.querySelector(`li[data-ticker="${ticker}"]`)) return;

        const li = document.createElement('li');
        li.textContent = ticker;
        li.dataset.ticker = ticker;
        
        // Klick-Event binden -> Lade das Intelligence Board!
        li.addEventListener('click', () => loadIntelligenceData(ticker));
        
        watchlistContainer.appendChild(li);
    }


    // ==========================================
    // 4. INTELLIGENCE BOARD LADEN
    // ==========================================
    async function loadIntelligenceData(ticker) {
        if(boardPanel) boardPanel.classList.add('hidden');
        if(emptyStatePanel) emptyStatePanel.classList.remove('hidden');
        if(statusMsg) statusMsg.textContent = `Lade Daten für ${ticker}...`;

        try {
            // Aufruf an unseren StockService im Backend
            const response = await fetch(`/api/intelligence/${ticker}`);
            
            // WICHTIG: Unser Provider-Limit Handling
            if (response.status === 429) {
                const errData = await response.json();
                alert(`Provider-Limit erreicht: ${errData.error}`);
                if(statusMsg) statusMsg.textContent = 'Limit erreicht. Bitte später versuchen.';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('[Intelligence] Daten geladen:', data);
            
            updateBoardUI(data);
            
            if(statusMsg) statusMsg.textContent = 'Daten aktualisiert.';

        } catch (error) {
            console.error('[Intelligence] Fehler:', error);
            if(statusMsg) statusMsg.textContent = 'Fehler beim Laden der Daten.';
        }
    }


    // ==========================================
    // 5. UI MIT DATEN BEFÜLLEN
    // ==========================================
    function updateBoardUI(data) {
        if(emptyStatePanel) emptyStatePanel.classList.add('hidden');
        if(boardPanel) boardPanel.classList.remove('hidden');

        // --- Header (Preis) ---
        if(boardTickerName) boardTickerName.textContent = data.ticker;
        if(boardPrice) boardPrice.textContent = data.currentPrice ? `$${data.currentPrice.toFixed(2)}` : 'N/A';
        
        if(boardChange) {
            const changeVal = data.change || 0;
            boardChange.textContent = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
            // Optional: CSS Klassen setzen basierend auf deiner CSS Struktur
            boardChange.className = changeVal >= 0 ? 'positive' : 'negative'; 
        }

        // --- Fundamentals ---
        if (data.fundamentals) {
            if(valMcap) valMcap.textContent = data.fundamentals.market_cap ? formatLargeNumber(data.fundamentals.market_cap) : 'N/A';
            if(valDebt) valDebt.textContent = data.fundamentals.debt_equity ? data.fundamentals.debt_equity.toFixed(2) : 'N/A';
            if(valRev) valRev.textContent = data.fundamentals.revenue_growth ? `${(data.fundamentals.revenue_growth * 100).toFixed(2)}%` : 'N/A';
        }

        // --- Sentiment ---
        if (data.sentiment && data.sentiment.length > 0) {
            const latestScore = data.sentiment[0].sentiment_score; // Nimm den neuesten Score (-1 bis 1)
            
            if (sentimentText) {
                if (latestScore > 0.15) sentimentText.textContent = `Bullish (${latestScore.toFixed(2)})`;
                else if (latestScore < -0.15) sentimentText.textContent = `Bearish (${latestScore.toFixed(2)})`;
                else sentimentText.textContent = `Neutral (${latestScore.toFixed(2)})`;
            }

            // Falls du einen CSS-basierten Slider/Balken hast
            if (sentimentIndicator) {
                // Mappe -1 bis 1 auf 0% bis 100%
                const positionPercent = ((latestScore + 1) / 2) * 100;
                sentimentIndicator.style.left = `${positionPercent}%`;
            }
        } else {
            if(sentimentText) sentimentText.textContent = "Keine aktuellen News-Daten.";
        }

        // --- Chart ---
        if (data.history && data.history.length > 0 && candleSeries) {
            // Transformiere die DB-Daten in das Format von Lightweight Charts
            const chartData = data.history.map(item => ({
                time: item.date, // Format muss 'YYYY-MM-DD' sein
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close
            }));
            
            candleSeries.setData(chartData);
            chart.timeScale().fitContent();
        } else if (candleSeries) {
             // Chart leeren, falls keine Historie da ist
            candleSeries.setData([]);
        }
    }

    // Hilfsfunktion: Zahlen lesbar formatieren (z.B. 1.5B)
    function formatLargeNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        return num.toLocaleString();
    }
    
    // Initiale Lade-Vorgänge (falls du z.B. eine Watchlist aus der DB laden willst)
    // loadWatchlistFromDatabase();
});