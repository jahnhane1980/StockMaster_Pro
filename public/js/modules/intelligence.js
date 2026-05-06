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
            // Lauscht auf dein bestehendes Event aus der Watchlist
            document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, handleTickerSelected);
            console.log('[IntelligenceModule] Initialisiert.');
        } else {
            console.error('[IntelligenceModule] window.StockMaster.Events nicht gefunden!');
        }
    };

    const handleTickerSelected = async (event) => {
        // Nutzt exakt dein bestehendes Payload-Format
        const symbol = event.detail?.symbol;
        if (!symbol) return;

        if (boardPanel) boardPanel.style.display = 'none';
        if (emptyStatePanel) {
            emptyStatePanel.style.display = 'block';
            emptyStatePanel.textContent = `Lade Intelligence-Daten für ${symbol}...`;
        }

        try {
            // Hier kommt der einzige echte Austausch: Wir nutzen das neue Backend!
            // (Vorher war hier der Call zu FMP/Finnhub)
            const data = await window.backendService.getIntelligenceData(symbol);
            
            updateUI(data);

            // ANMERKUNG: Hier müssen wir klären, wie dein chart.js die Daten bekommt.
            // Siehe meine Frage unten!

        } catch (error) {
            console.error('[IntelligenceModule] Fehler:', error);
            
            if (emptyStatePanel) {
                emptyStatePanel.textContent = 'Fehler beim Laden der Daten.';
            }

            // Nutzt dein sauberes Notification-System
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
        if (boardPrice) boardPrice.textContent = data.currentPrice ? `$${data.currentPrice.toFixed(2)}` : 'N/A';
        
        if (boardChange) {
            const changeVal = data.change || 0;
            boardChange.textContent = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
            boardChange.style.color = changeVal >= 0 ? '#00e676' : '#ff5252'; 
        }

        if (data.fundamentals) {
            if (valMcap) valMcap.textContent = data.fundamentals.market_cap ? formatLargeNumber(data.fundamentals.market_cap) : 'N/A';
            if (valDebt) valDebt.textContent = data.fundamentals.debt_equity ? data.fundamentals.debt_equity.toFixed(2) : 'N/A';
            if (valRev) valRev.textContent = data.fundamentals.revenue_growth ? `${(data.fundamentals.revenue_growth * 100).toFixed(2)}%` : 'N/A';
        }

        if (data.sentiment && data.sentiment.length > 0) {
            const latestScore = data.sentiment[0].sentiment_score; 
            if (sentimentText) {
                if (latestScore > 0.15) sentimentText.textContent = `Bullish (${latestScore.toFixed(2)})`;
                else if (latestScore < -0.15) sentimentText.textContent = `Bearish (${latestScore.toFixed(2)})`;
                else sentimentText.textContent = `Neutral (${latestScore.toFixed(2)})`;
            }
            if (sentimentIndicator) {
                const positionPercent = ((latestScore + 1) / 2) * 100;
                sentimentIndicator.style.left = `${positionPercent}%`;
            }
        } else {
            if (sentimentText) sentimentText.textContent = "Keine News-Daten.";
        }
    };

    const formatLargeNumber = (num) => {
        if (!num) return 'N/A';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        return num.toLocaleString();
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    window.StockMaster.IntelligenceModule.init();
});