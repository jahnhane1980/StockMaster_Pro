// public/js/modules/Watchlist.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.WatchlistModule = (() => {

  const searchInput = document.getElementById('ticker-search');
  const addBtn = document.getElementById('add-ticker-btn');
  const watchlistContainer = document.getElementById('watchlist-items');
  const statusMsg = document.getElementById('status-message');

  /**
   * Initialisiert das Modul und registriert Event-Listener.
   * @returns {Promise<void>}
   */
  const init = async () => {
    // UI-Interaktionen
    if (addBtn) addBtn.addEventListener('click', handleAddTicker);
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddTicker();
      });
    }

    // Pub/Sub Event-Registrierung
    if (window.StockMaster.Events) {
      document.addEventListener(window.StockMaster.Events.TICKERS_LOADED, handleTickersLoaded);
      document.addEventListener(window.StockMaster.Events.TICKER_DELETED, handleTickerDeleted);
      document.addEventListener(window.StockMaster.Events.ERROR_OCCURRED, handleGlobalError);
      
      // Auch auf neu hinzugefügte Ticker reagieren, um die Liste zu aktualisieren
      document.addEventListener(window.StockMaster.Events.TICKER_ADDED, () => loadData());
    }

    // Initiales Laden anstoßen
    await loadData();
    console.log('[WatchlistModule] Initialisiert und Event-Listener registriert.');
  };

  /**
   * Triggert den Ladevorgang im Repository an.
   * Gemäß SoC: Keine direkte Verarbeitung der Rückgabewerte.
   * @returns {Promise<void>}
   */
  const loadData = async () => {
    if (window.StockMaster.TickerRepository) {
      await window.StockMaster.TickerRepository.getAllTickers();
    }
  };

  /**
   * Callback für das TICKERS_LOADED Event.
   * Übernimmt das asynchrone Rendering der Liste.
   * @param {CustomEvent} event - Das Event-Objekt mit der Ticker-Liste im Detail-Feld.
   * @returns {void}
   */
  const handleTickersLoaded = (event) => {
    const { tickers } = event.detail;
    if (!watchlistContainer) return;

    // UI-Hygiene: Container leeren, bevor neu gerendert wird, um Duplikate zu vermeiden.
    watchlistContainer.innerHTML = ''; 
    
    if (!tickers || tickers.length === 0) {
      watchlistContainer.innerHTML = '<div class="empty-msg">Watchlist leer.</div>';
      return;
    }

    tickers.forEach(tickerObj => renderTicker(tickerObj));
  };

  /**
   * Callback für das TICKER_DELETED Event.
   * @param {CustomEvent} event - Das Event-Objekt mit dem gelöschten Symbol.
   * @returns {void}
   */
  const handleTickerDeleted = (event) => {
    const { symbol } = event.detail;
    console.log(`[Watchlist] Ticker ${symbol} wurde erfolgreich gelöscht.`);
    loadData(); // Liste neu laden
  };

  /**
   * Zentrales Error-Handling für Repository-Fehler.
   * @param {CustomEvent} event - Das Event-Objekt mit Fehlermeldung und Quelle.
   * @returns {void}
   */
  const handleGlobalError = (event) => {
    const { message, source } = event.detail;
    console.error(`[Watchlist] Fehler von ${source}: ${message}`);
    
    // Fehler an den globalen NotificationService delegieren, um ein konsistentes UI-Feedback zu geben.
    if (window.StockMaster.Events) {
      document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
        detail: { type: 'error', message: message }
      }));
    }
  };

  /**
   * Behandelt das Hinzufügen eines neuen Tickers.
   * Validiert die Eingabe und kommuniziert mit dem BackendService.
   * @returns {Promise<void>}
   */
  const handleAddTicker = async () => {
    const symbol = searchInput.value.toUpperCase().trim();
    if (!symbol) return;

    try {
      if (statusMsg) statusMsg.textContent = `Sync für ${symbol}...`;
      
      await window.backendService.addTickerToWatchlist(symbol);

      if (window.StockMaster.Events) {
        // TICKER_ADDED triggert das automatische Refresh der Liste.
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_ADDED, { 
          detail: { symbol: symbol } 
        }));
        
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
          detail: { type: 'success', message: `${symbol} zur Watchlist hinzugefügt.` }
        }));
      }

      searchInput.value = '';
      if (statusMsg) statusMsg.textContent = '';

    } catch (error) {
      if (statusMsg) statusMsg.textContent = 'Fehler.';
      handleGlobalError({ detail: { message: error.message, source: 'BackendService' } });
    }
  };

  /**
   * Rendert ein einzelnes Ticker-Element.
   * @param {Object} item - Das Ticker-Datenobjekt (symbol, etc.).
   * @returns {void}
   */
  const renderTicker = (item) => {
    const div = document.createElement('div');
    div.className = 'watchlist-item'; 
    div.dataset.ticker = item.symbol;

    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'ticker-symbol';
    symbolSpan.textContent = item.symbol;
    div.appendChild(symbolSpan);

    // Klick-Listener zum Auswählen einer Aktie (Intelligence-Board Update).
    div.addEventListener('click', () => {
      if (window.StockMaster.Events) {
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.TICKER_SELECTED, { 
          detail: { symbol: item.symbol } 
        }));
      }
      
      // Visuelle Markierung des ausgewählten Elements.
      document.querySelectorAll('.watchlist-item').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
    });

    const deleteBtn = document.createElement('ion-icon');
    deleteBtn.setAttribute('name', 'trash-outline');
    deleteBtn.className = 'delete-btn-icon';

    // Separater Listener für den Lösch-Button (StopPropagation verhindert Selektion beim Löschen).
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.StockMaster.TickerRepository) {
        await window.StockMaster.TickerRepository.deleteTicker(item.symbol);
        
        // Benachrichtigung wird asynchron via handleTickerDeleted getriggert
        if (window.StockMaster.Events) {
          document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
            detail: { type: 'info', message: `${item.symbol} wird entfernt...` }
          }));
        }
      }
    });

    div.appendChild(deleteBtn);
    watchlistContainer.appendChild(div);
  };

  return { init, loadData };
})();
