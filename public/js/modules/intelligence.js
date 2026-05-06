// public/js/modules/intelligence.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.IntelligenceModule = (() => {

    // DOM Elemente (wie in deiner index.html definiert)
    const boardPanel = document.getElementById('intelligence-board');
    const emptyStatePanel = document.getElementById('empty-state');
    const boardTickerName = document.getElementById('board-ticker-name');
    const boardPrice = document.getElementById('board-price');
    const boardChange = document.getElementById('board-change');
    const valMcap = document.getElementById('val-mcap');
    const valDebt = document.getElementById('val-debt');
    const valRev = document.getElementById('val-rev');
    const sentimentIndicator = document.getElementById('sentiment-indicator');
    const sentimentText = document.getElementById('sentiment-text');

    const init = () => {
        if (window.StockMaster.Events) {
            // Lauscht auf die Auswahl eines Tickers in der Watchlist
            document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, handleTickerSelected);
            console.log('[IntelligenceModule] Initialisiert.');
        }
    };

    const handleTickerSelected = async (event) => {
        const symbol = event.detail?.symbol;
        if (!symbol) return;

        // UI in Lade-Zustand versetzen
        if (boardPanel) boardPanel.style.display = 'none';
        if (emptyStatePanel) {
            emptyStatePanel.style.display = 'block';
            emptyStatePanel.textContent = `Lade Intelligence-Daten für ${symbol}...`;
        }

        try {
            // Daten vom Backend holen
            const data = await window.backendService.getIntelligenceData(symbol);
            
            // UI aktualisieren (Board füllen)
            updateUI(data);

            // NEU: Den Chart über das Event-System informieren und die Historie übergeben
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.CHART_DATA_READY, { 
                    detail: { 
                        symbol: data.ticker,
                        history: data.history || [],
                        correlations: data.correlations || []
                    } 
                }));
            }

        } catch (error) {
            console.error('[IntelligenceModule] Fehler beim Laden der Daten:', error);
            
            if (emptyStatePanel) {
                emptyStatePanel.textContent = error.isLimitError 
                    ? 'API-Limit erreicht. Bitte später versuchen.' 
                    : 'Fehler beim Laden der Daten.';
            }

            // Notification senden
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: {
                        type: error.isLimitError ? 'warning' : 'error',
                        message: error.message
                    }
                }));
            }
        }
    };

    const updateUI = (data) => {
        if (emptyStatePanel) emptyStatePanel.style.display = 'none';
        if (boardPanel) boardPanel.style.display = 'block';

        if (boardTickerName) boardTickerName.textContent = data.ticker;
        
        // Preis-Formatierung
        if (boardPrice) {
            boardPrice.textContent = data.currentPrice ? `$${data.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
        }
        
        // Change-Anzeige mit Farbcodierung (Style-Erhalt)
        if (boardChange) {
            const changeVal = data.change || 0;
            boardChange.textContent = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
            boardChange.style.color = changeVal >= 0 ? '#00e676' : '#ff5252'; 
            boardChange.style.marginLeft = '10px';
        }

        // Fundamentals (Metadaten aus der DB)
        if (data.fundamentals) {
            if (valMcap) valMcap.textContent = data.fundamentals.market_cap ? formatLargeNumber(data.fundamentals.market_cap) : 'N/A';
            if (valDebt) valDebt.textContent = data.fundamentals.debt_equity ? data.fundamentals.debt_equity.toFixed(2) : 'N/A';
            if (valRev) valRev.textContent = data.fundamentals.revenue_growth ? `${(data.fundamentals.revenue_growth * 100).toFixed(2)}%` : 'N/A';
        } else {
            [valMcap, valDebt, valRev].forEach(el => { if(el) el.textContent = 'N/A'; });
        }

        // Sentiment-Anzeige (News Scores)
        if (data.sentiment && data.sentiment.length > 0) {
            const latestScore = data.sentiment[0].sentiment_score; 
            if (sentimentText) {
                let status = 'Neutral';
                if (latestScore > 0.15) status = 'Bullish';
                else if (latestScore < -0.15) status = 'Bearish';
                sentimentText.textContent = `${status} (${latestScore.toFixed(2)})`;
            }
            if (sentimentIndicator) {
                const positionPercent = ((latestScore + 1) / 2) * 100;
                sentimentIndicator.style.left = `${positionPercent}%`;
            }
        } else {
            if (sentimentText) sentimentText.textContent = "Keine News-Daten verfügbar.";
            if (sentimentIndicator) sentimentIndicator.style.left = "50%";
        }
    };

    const formatLargeNumber = (num) => {
        if (!num) return 'N/A';
        const n = parseFloat(num);
        if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        return n.toLocaleString();
    };

    return { init };
})();
