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

        await loadData();
        console.log('[WatchlistModule] Initialisiert.');
    };

    const loadData = async () => {
        if (window.StockMaster.TickerRepository && watchlistContainer) {
            try {
                const tickers = await window.StockMaster.TickerRepository.getAllTickers();
                watchlistContainer.innerHTML = ''; 
                
                if (tickers.length === 0) {
                    watchlistContainer.innerHTML = '<div class="empty-msg">Watchlist leer.</div>';
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
            
            await window.backendService.addTickerToWatchlist(symbol);

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
        div.dataset.ticker = item.symbol;

        const symbolSpan = document.createElement('span');
        symbolSpan.className = 'ticker-symbol';
        symbolSpan.textContent = item.symbol;
        div.appendChild(symbolSpan);

        div.addEventListener('click', () => {
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
                    detail: { symbol: item.symbol } 
                }));
            }
            
            document.querySelectorAll('.watchlist-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
        });

        const deleteBtn = document.createElement('ion-icon');
        deleteBtn.setAttribute('name', 'trash-outline');
        deleteBtn.className = 'delete-btn-icon';

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                if (window.StockMaster.TickerRepository) {
                    await window.StockMaster.TickerRepository.deleteTicker(item.symbol);
                    
                    if (window.StockMaster.Events) {
                        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_REMOVED, { 
                            detail: { symbol: item.symbol } 
                        }));

                        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                            detail: { type: 'info', message: `${item.symbol} entfernt.` }
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
