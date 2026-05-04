/**
 * StockMaster Watchlist Modul
 * Revealing Module Pattern
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Watchlist = (function() {
    const containerId = 'watchlist-container';
    
    let watchedTickers = [];
    let currentMatches = []; 
    let searchTimeout = null;

    async function init() {
        console.log('StockMaster.Watchlist: Modul wird initialisiert...');
        renderBase();
        
        try {
            await loadData();
            bindEvents();
        } catch (error) {
            console.error('Watchlist Initialisierungsfehler:', error);
        }
    }

    async function loadData() {
        const repo = window.StockMaster.TickerRepository;
        if (repo) {
            watchedTickers = await repo.getAllTickers() || [];
            renderList();
        }
    }

    async function refresh() {
        if (window.StockMaster.TickerRepository) {
            watchedTickers = await window.StockMaster.TickerRepository.getAllTickers();
            renderList();
        }
    }

    function renderBase() {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <h2>Watchlist</h2>
            <div class="watchlist-actions" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: flex-start;">
                <div style="position: relative; flex-grow: 1;">
                    <input type="text" id="new-ticker-input" class="font-mono" autocomplete="off" placeholder="Symbol (z.B. AAPL)" style="width: 100%;">
                    <div id="ticker-error" style="color: var(--error); font-size: 0.8rem; margin-top: 0.25rem; display: none;"></div>
                    <div id="autocomplete-list" class="autocomplete-dropdown"></div>
                </div>
                <button id="add-ticker-btn" style="padding: 0.5rem 1rem; background: var(--primary); color: var(--surface); border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; height: 38px;">
                    <ion-icon name="add-outline"></ion-icon>
                </button>
            </div>
            <ul id="watchlist-items">
                <li><i style="color: var(--placeholder);">Lade Daten...</i></li>
            </ul>
        `;
    }

    function renderList() {
        const listEl = document.getElementById('watchlist-items');
        if (!listEl) return;

        listEl.innerHTML = ''; 

        if (watchedTickers.length === 0) {
            listEl.innerHTML = `<li><i style="color: var(--placeholder);">Watchlist ist leer.</i></li>`;
            return;
        }

        const sorted = [...watchedTickers].sort((a, b) => b.addedAt - a.addedAt);

        sorted.forEach(item => {
            const li = document.createElement('li');
            li.className = 'watchlist-item-row';
            li.innerHTML = `
                <span class="font-mono" style="font-weight: 600;">${item.symbol}</span>
                <div class="watchlist-item-right">
                    <span class="delete-action" title="Ticker entfernen">
                        <ion-icon name="trash-outline"></ion-icon>
                    </span>
                </div>
            `;
            
            li.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
                    detail: { symbol: item.symbol } 
                }));
            });

            const deleteBtn = li.querySelector('.delete-action');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_REMOVED, { 
                    detail: { symbol: item.symbol } 
                }));
            });

            listEl.appendChild(li);
        });
    }

    function bindEvents() {
        const input = document.getElementById('new-ticker-input');
        const addBtn = document.getElementById('add-ticker-btn');
        const autocompleteList = document.getElementById('autocomplete-list');

        input.addEventListener('input', function() {
            const val = this.value.trim().toUpperCase();
            autocompleteList.innerHTML = '';
            hideError();
            
            clearTimeout(searchTimeout);

            if (!val) {
                autocompleteList.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                let localResults = [];
                let remoteResults = [];
                const repo = window.StockMaster.TickerRepository;
                const finnhub = window.StockMaster.FinnhubService;

                if (repo) localResults = await repo.searchDictionary(val);

                if (finnhub) {
                    try {
                        remoteResults = await finnhub.searchTicker(val);
                    } catch (e) {
                        console.warn('Finnhub Suche übersprungen (Netzwerk/Limit)');
                    }
                }

                const combinedMap = new Map();
                localResults.forEach(t => combinedMap.set(t.symbol, t));
                remoteResults.forEach(t => combinedMap.set(t.symbol, t));
                
                currentMatches = Array.from(combinedMap.values()).slice(0, 15);

                if (currentMatches.length > 0) {
                    autocompleteList.style.display = 'block';
                    currentMatches.forEach(match => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'autocomplete-item';
                        itemDiv.innerHTML = `
                            <span class="autocomplete-symbol font-mono">${match.symbol}</span>
                            <span class="autocomplete-desc">${match.description}</span>
                        `;
                        
                        itemDiv.addEventListener('mousedown', () => {
                            input.value = match.symbol;
                            autocompleteList.style.display = 'none';
                            hideError();
                        });
                        
                        autocompleteList.appendChild(itemDiv);
                    });
                } else {
                    autocompleteList.style.display = 'none';
                }
            }, 400); 
        });

        input.addEventListener('blur', () => {
            setTimeout(() => { autocompleteList.style.display = 'none'; }, 100);
        });

        addBtn.addEventListener('click', async () => {
            const symbol = input.value.trim().toUpperCase();
            console.log(`[Watchlist] Hinzufügen-Button geklickt für: ${symbol}`);
            
            if (!symbol) return;

            if (watchedTickers.some(t => t.symbol === symbol)) {
                showError(`'${symbol}' ist bereits in deiner Watchlist.`);
                return;
            }

            let matchObj = currentMatches.find(t => t.symbol === symbol);

            if (!matchObj) {
                try {
                    const remote = await window.StockMaster.FinnhubService.searchTicker(symbol);
                    matchObj = remote.find(t => t.symbol === symbol);
                } catch(e) {}
            }

            if (!matchObj) {
                showError(`Ticker '${symbol}' wurde nicht gefunden.`);
                return;
            }

            if (window.StockMaster.TickerRepository) {
                await window.StockMaster.TickerRepository.addToDictionary(matchObj);
            }

            document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_ADDED, { 
                detail: { symbol: symbol } 
            }));
            
            input.value = '';
            hideError();
            autocompleteList.style.display = 'none';
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });
    }

    function showError(msg) {
        const errEl = document.getElementById('ticker-error');
        const input = document.getElementById('new-ticker-input');
        errEl.textContent = msg;
        errEl.style.display = 'block';
        input.style.borderColor = 'var(--error)';
        input.style.boxShadow = 'none';
    }

    function hideError() {
        const errEl = document.getElementById('ticker-error');
        const input = document.getElementById('new-ticker-input');
        errEl.style.display = 'none';
        input.style.borderColor = 'var(--border)';
    }

    return {
        init: init,
        refresh: refresh
    };
})();