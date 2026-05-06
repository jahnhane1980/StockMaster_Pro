// public/js/modules/watchlist.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.WatchlistModule = (() => {

    const searchInput = document.getElementById('ticker-search');
    const addBtn = document.getElementById('add-ticker-btn');
    const watchlistContainer = document.getElementById('watchlist-container');
    const statusMsg = document.getElementById('status-message');

    const init = async () => {
        if (addBtn) addBtn.addEventListener('click', handleAddTicker);
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAddTicker();
            });
        }

        // Initiales Laden der Watchlist beim Start
        await loadData();
        console.log('[WatchlistModule] Initialisiert.');
    };

    const loadData = async () => {
        if (window.StockMaster.TickerRepository && watchlistContainer) {
            try {
                const tickers = await window.StockMaster.TickerRepository.getAllTickers();
                watchlistContainer.innerHTML = ''; // Container leeren
                
                if (tickers.length === 0) {
                    watchlistContainer.innerHTML = '<div class="empty-msg" style="padding: 10px; color: #666; font-size: 0.9em;">Watchlist leer.</div>';
                    return;
                }

                tickers.forEach(tickerObj => renderTicker(tickerObj));
            } catch (error) {
                console.error('[Watchlist] Fehler beim Laden:', error);
            }
        }
    };

    const handleAddTicker = async () => {
        const symbol = searchInput.value.toUpperCase().trim();
        if (!symbol) return;

        try {
            if (statusMsg) statusMsg.textContent = `Sync für ${symbol}...`;
            
            // 1. Backend-Call (Triggert Sync im RIM)
            await window.backendService.addTickerToWatchlist(symbol);

            // 2. Event feuern für UI-Komponenten
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_ADDED, { 
                    detail: { symbol: symbol } 
                }));
                
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'success', message: `${symbol} zur Watchlist hinzugefügt.` }
                }));
            }

            searchInput.value = '';
            if (statusMsg) statusMsg.textContent = '';
            
            // Liste neu laden
            await loadData();

        } catch (error) {
            console.error('[Watchlist] Fehler beim Hinzufügen:', error);
            if (statusMsg) statusMsg.textContent = 'Fehler.';
            
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'error', message: error.message || 'Fehler beim Hinzufügen.' }
                }));
            }
        }
    };

    const renderTicker = (item) => {
        const div = document.createElement('div');
        div.className = 'watchlist-item'; 
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #333';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.dataset.ticker = item.symbol;

        const symbolSpan = document.createElement('span');
        symbolSpan.textContent = item.symbol;
        symbolSpan.style.fontWeight = 'bold';
        div.appendChild(symbolSpan);

        // Klick-Event -> Ticker auswählen
        div.addEventListener('click', () => {
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
                    detail: { symbol: item.symbol } 
                }));
            }
            
            // Visuelles Feedback für Auswahl (Style-Erhalt)
            document.querySelectorAll('.watchlist-item').forEach(el => el.style.background = 'transparent');
            div.style.background = 'rgba(255,255,255,0.05)';
        });

        // Löschen-Button
        const deleteBtn = document.createElement('ion-icon');
        deleteBtn.setAttribute('name', 'trash-outline');
        deleteBtn.style.color = '#ff5252';
        deleteBtn.style.fontSize = '1.2em';

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                if (window.StockMaster.TickerRepository) {
                    await window.StockMaster.TickerRepository.deleteTicker(item.symbol);
                    
                    if (window.StockMaster.Events) {
                        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_REMOVED, { 
                            detail: { symbol: item.symbol } 
                        }));
                    }
                    await loadData();
                }
            } catch (error) {
                console.error('[Watchlist] Fehler beim Löschen:', error);
            }
        });

        div.appendChild(deleteBtn);
        watchlistContainer.appendChild(div);
    };

    return { init, loadData };
})();
