/**
 * StockMaster Watchlist Modul
 * Fokus: Intelligente Ticker-Typ Erkennung
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.Watchlist = (function() {
    const containerId = 'watchlist-container';
    let watchedTickers = [];
    let currentMatches = []; 
    let searchTimeout = null;

    async function init() {
        renderBase();
        bindEvents();
        try { await loadData(); } catch (e) { console.error(e); }
    }

    async function loadData() {
        const repo = window.StockMaster.TickerRepository;
        if (repo && typeof repo.getAllTickers === 'function') {
            watchedTickers = await repo.getAllTickers() || [];
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
            <ul id="watchlist-items"></ul>
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
        const sorted = [...watchedTickers].sort((a, b) => (b.last_updated || 0) - (a.last_updated || 0));
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
                if (window.StockMaster.Events) {
                    document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
                        detail: { symbol: item.symbol } 
                    }));
                }
            });
            const deleteBtn = li.querySelector('.delete-action');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (window.StockMaster.TickerRepository) {
                    await window.StockMaster.TickerRepository.deleteTicker(item.symbol);
                    await loadData();
                }
            });
            listEl.appendChild(li);
        });
    }

    function bindEvents() {
        const input = document.getElementById('new-ticker-input');
        const addBtn = document.getElementById('add-ticker-btn');
        const autocompleteList = document.getElementById('autocomplete-list');

        addBtn.onclick = async function() {
            const symbol = input.value.trim().toUpperCase();
            if (!symbol) return;

            try {
                const match = currentMatches.find(m => m.symbol === symbol);
                const name = match ? match.description : symbol;
                
                // --- VERBESSERTE TYP-ERKENNUNG ---
                let type = 'stock';
                const lowerName = name.toLowerCase();
                const apiType = match ? (match.type || '').toUpperCase() : '';

                if (apiType === 'ETP' || apiType === 'ETF' || 
                    lowerName.includes('ucits') || 
                    lowerName.includes('etf') || 
                    lowerName.includes('fund')) {
                    type = 'etf';
                }

                await window.StockMaster.TickerRepository.addTicker({
                    symbol: symbol,
                    name: name,
                    type: type,
                    last_updated: Date.now()
                });

                input.value = '';
                autocompleteList.style.display = 'none';
                await loadData(); 

            } catch (err) {
                console.error("❌ Fehler:", err);
            }
        };

        input.addEventListener('input', function() {
            const val = this.value.trim().toUpperCase();
            clearTimeout(searchTimeout);
            if (!val) { autocompleteList.style.display = 'none'; return; }
            searchTimeout = setTimeout(async () => {
                const finnhub = window.StockMaster.FinnhubService;
                if (finnhub) {
                    currentMatches = await finnhub.searchTicker(val) || [];
                    if (currentMatches.length > 0) {
                        autocompleteList.innerHTML = '';
                        autocompleteList.style.display = 'block';
                        currentMatches.slice(0, 8).forEach(match => {
                            const d = document.createElement('div');
                            d.className = 'autocomplete-item';
                            d.innerHTML = `<span class="font-mono">${match.symbol}</span> <small>${match.description}</small>`;
                            d.onmousedown = () => { 
                                input.value = match.symbol;
                                autocompleteList.style.display = 'none';
                            };
                            autocompleteList.appendChild(d);
                        });
                    }
                }
            }, 400);
        });

        input.onblur = () => { setTimeout(() => { autocompleteList.style.display = 'none'; }, 200); };
        input.onkeypress = (e) => { if (e.key === 'Enter') addBtn.click(); };
    }

    return { init, refresh: loadData };
})();