// public/js/modules/watchlist.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.WatchlistModule = (() => {

    const searchInput = document.getElementById('ticker-search');
    const addBtn = document.getElementById('add-ticker-btn');
    const watchlistContainer = document.getElementById('watchlist-container');

    const init = async () => {
        if (addBtn) addBtn.addEventListener('click', handleAddTicker);
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAddTicker();
            });
        }

        // Initiales Laden der Watchlist aus deiner lokalen Datenbank/Repository
        await loadData();
    };

    const loadData = async () => {
        if (window.StockMaster.TickerRepository && watchlistContainer) {
            const tickers = await window.StockMaster.TickerRepository.getAllTickers();
            watchlistContainer.innerHTML = ''; // Container leeren
            
            // Jeden Ticker einzeln rendern
            tickers.forEach(tickerObj => renderTicker(tickerObj));
        }
    };

    const handleAddTicker = async () => {
        const symbol = searchInput.value.toUpperCase().trim();
        if (!symbol) return;

        try {
            // ==========================================
            // NEU: Hier rufen wir unser neues Backend auf!
            // ==========================================
            await window.backendService.addTickerToWatchlist(symbol);

            // ==========================================
            // DEINE BESTEHENDE LOGIK: Speichern & Event feuern
            // ==========================================
            if (window.StockMaster.TickerRepository) {
                await window.StockMaster.TickerRepository.addTicker({ symbol: symbol });
            }

            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_ADDED, { 
                    detail: { symbol: symbol } 
                }));
                
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'success', message: `${symbol} zur Watchlist hinzugefügt.` }
                }));
            }

            searchInput.value = '';
            await loadData(); // Liste neu aufbauen

        } catch (error) {
            console.error('[Watchlist] Fehler beim Hinzufügen:', error);
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
        div.textContent = item.symbol;

        // -----------------------------------------------------
        // DEIN SNIPPET 1: Ticker auswählen -> Intelligence Board
        // -----------------------------------------------------
        div.addEventListener('click', () => {
            if (window.StockMaster.Events) {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
                    detail: { symbol: item.symbol } 
                }));
            }
        });

        // -----------------------------------------------------
        // DEIN SNIPPET 2: Ticker löschen
        // -----------------------------------------------------
        const deleteBtn = document.createElement('span');
        deleteBtn.innerHTML = ' &times;'; // Simples X Icon
        deleteBtn.className = 'delete-btn';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.float = 'right';

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (window.StockMaster.TickerRepository) {
                await window.StockMaster.TickerRepository.deleteTicker(item.symbol);
                
                if (window.StockMaster.Events) {
                    document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_REMOVED, { 
                        detail: { symbol: item.symbol } 
                    }));
                }
                await loadData();
            }
        });

        div.appendChild(deleteBtn);
        watchlistContainer.appendChild(div);
    };

    return { init, loadData };
})();

document.addEventListener('DOMContentLoaded', () => {
    window.StockMaster.WatchlistModule.init();
});