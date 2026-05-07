// public/js/modules/Intelligence.js

window.StockMaster = window.StockMaster || {};
window.StockMaster.IntelligenceModule = (() => {

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
  const correlationsList = document.getElementById('correlations-list');
  const valObv = document.getElementById('val-obv');

  let currentData = null;

  /**
   * Initialisiert das Modul und registriert Event-Listener.
   * @returns {void}
   */
  const init = () => {
    if (window.StockMaster.Events) {
      // Höre auf Ticker-Auswahl aus der Watchlist
      document.addEventListener(window.StockMaster.Events.TICKER_SELECTED, handleTickerSelected);
      
      // Höre auf Daten-Eingang vom Repository
      document.addEventListener(window.StockMaster.Events.INTELLIGENCE_DATA_LOADED, handleDataLoaded);
      document.addEventListener(window.StockMaster.Events.MARKET_CORRELATIONS_LOADED, handleCorrelationsLoaded);
      
      console.log('[IntelligenceModule] Initialisiert und Listener registriert.');
    }
  };

  /**
   * Wird getriggert, wenn ein Ticker in der Watchlist ausgewählt wird.
   * @param {CustomEvent} event - Das Event-Objekt mit dem gewählten Symbol.
   * @returns {void}
   */
  const handleTickerSelected = (event) => {
    const symbol = event.detail?.symbol;
    if (!symbol) return;

    // Reset des aktuellen Zustands, um alte Daten während des Ladevorgangs auszublenden.
    currentData = null; 
    if (boardPanel) boardPanel.classList.add('u-hidden');
    if (emptyStatePanel) {
      emptyStatePanel.classList.remove('u-hidden');
      emptyStatePanel.textContent = `Lade Intelligence-Daten für ${symbol}...`;
    }

    // Repository-Anfragen triggern (SoC: Keine Await-Logik hier, Daten kommen via Event).
    if (window.StockMaster.IntelligenceRepository) {
      window.StockMaster.IntelligenceRepository.getForSymbol(symbol);
      window.StockMaster.IntelligenceRepository.getCorrelations(symbol);
    }
  };

  /**
   * Verarbeitet die Haupt-Intelligence-Daten.
   * @param {CustomEvent} event - Das Event-Objekt mit den Intelligence-Daten.
   * @returns {void}
   */
  const handleDataLoaded = (event) => {
    currentData = event.detail;
    updateUI();

    // Chart-Update triggern: Die UI-Komponente Intelligence orchestriert hier die Datenweitergabe an den Chart.
    if (window.StockMaster.Events) {
      document.dispatchEvent(new CustomEvent(window.StockMaster.Events.CHART_DATA_READY, { 
        detail: { 
          symbol: currentData.ticker,
          history: currentData.history || [],
          correlations: currentData.correlations || []
        } 
      }));
    }
  };

  /**
   * Verarbeitet die Markt-Korrelationen (BTC/Gold).
   * @param {CustomEvent} event - Das Event-Objekt mit Korrelationsdaten.
   * @returns {void}
   */
  const handleCorrelationsLoaded = (event) => {
    if (!currentData) return;
    currentData.marketCorrelations = event.detail.correlations;
    updateUI();
  };

  /**
   * Zentrale UI-Update Funktion.
   * Mappt das Datenmodell auf die DOM-Elemente.
   * @returns {void}
   */
  const updateUI = () => {
    if (!currentData) return;

    // Panels umschalten: Daten vorhanden -> Board zeigen, Empty State verstecken.
    if (emptyStatePanel) emptyStatePanel.classList.add('u-hidden');
    if (boardPanel) boardPanel.classList.remove('u-hidden');

    if (boardTickerName) boardTickerName.textContent = currentData.ticker;
    
    // Preis-Formatierung für konsistente Anzeige (immer 2 Nachkommastellen).
    if (boardPrice) {
      boardPrice.textContent = currentData.currentPrice ? `$${currentData.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
    }
    
    // Farb-Codierung der Kursänderung (Positiv=Grün, Negativ=Rot).
    if (boardChange) {
      const changeVal = currentData.change || 0;
      boardChange.textContent = `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
      boardChange.className = changeVal >= 0 ? 'u-text--positive' : 'u-text--negative'; 
    }

    if (currentData.fundamentals) {
      if (valMcap) valMcap.textContent = currentData.fundamentals.market_cap ? formatLargeNumber(currentData.fundamentals.market_cap) : 'N/A';
      if (valDebt) valDebt.textContent = currentData.fundamentals.debt_equity ? currentData.fundamentals.debt_equity.toFixed(2) : 'N/A';
      if (valRev) valRev.textContent = currentData.fundamentals.revenue_growth ? `${(currentData.fundamentals.revenue_growth * 100).toFixed(2)}%` : 'N/A';
    }

    // Sentiment-Analyse: Score auf einer Skala visualisieren.
    if (currentData.sentiment && currentData.sentiment.length > 0) {
      const latestScore = currentData.sentiment[0].sentiment_score; 
      if (sentimentText) {
        let status = 'Neutral';
        // Schwellenwerte für Sentiment-Status.
        if (latestScore > 0.15) status = 'Bullish';
        else if (latestScore < -0.15) status = 'Bearish';
        sentimentText.textContent = `${status} (${latestScore.toFixed(2)})`;
      }
      if (sentimentIndicator) {
        // Umwandlung des Scores (-1 bis +1) in Prozent (0 bis 100) für CSS-Positionierung.
        const positionPercent = ((latestScore + 1) / 2) * 100;
        sentimentIndicator.style.left = `${positionPercent}%`;
      }
    }

    renderCorrelations();

    if (valObv && currentData.indicators?.obv) {
      valObv.textContent = currentData.indicators.obv.value.toLocaleString();
    }
  };

  /**
   * Rendert die Korrelations-Liste (Benchmarks und Peer-Assets).
   * @returns {void}
   */
  const renderCorrelations = () => {
    if (!correlationsList || !currentData) return;
    let html = '';

    // Benchmarks (BTC/Gold) werden hervorgehoben dargestellt.
    if (currentData.marketCorrelations) {
      const mc = currentData.marketCorrelations;
      if (mc.btc) {
        html += `<div class="correlation correlation--benchmark"><span class="correlation__label">BTC:</span><span class="correlation__value">${mc.btc.correlation.toFixed(2)}</span></div>`;
      }
      if (mc.gold) {
        html += `<div class="correlation correlation--benchmark"><span class="correlation__label">Gold:</span><span class="correlation__value">${mc.gold.correlation.toFixed(2)}</span></div>`;
      }
    }

    // Peer-Asset Korrelationen aus der Datenbank.
    if (currentData.correlations?.length > 0) {
      html += currentData.correlations.map(corr => `
        <div class="correlation">
          <span class="correlation__label">${corr.symbol}</span>
          <span class="correlation__value ${corr.change >= 0 ? 'u-text--positive' : 'u-text--negative'}">${corr.change.toFixed(2)}%</span>
        </div>
      `).join('');
    }

    correlationsList.innerHTML = html || 'Keine Daten.';
  };

  /**
   * Formatiert große Zahlen in lesbare Suffixe (M, B, T).
   * Warum: Um UI-Platz zu sparen und die Lesbarkeit von Milliarden-Werten zu verbessern.
   * @param {number|string} num - Die zu formatierende Zahl.
   * @returns {string} - Die formatierte Zahl mit Suffix.
   */
  const formatLargeNumber = (num) => {
    const n = parseFloat(num);
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'; // Trillion (Deutsch: Billion)
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';  // Billion (Deutsch: Milliarde)
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';  // Million
    return n.toLocaleString();
  };

  return { init };
})();
