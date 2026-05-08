/**
 * StockMaster AppConstants (Frontend)
 * Zentrales Register für UI-spezifische Konstanten und Konfigurationen.
 * Intent: Vermeidung von Magic Values und Sicherstellung eines konsistenten Designs (Regel 6).
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.AppConstants = (function() {
  
  const CHART_THEME = Object.freeze({
    FONT_SIZE: 12,
    FONT_FAMILY: 'JetBrains Mono, monospace',
    GRID_COLOR: 'rgba(43, 43, 67, 0.3)',
    BORDER_COLOR: 'rgba(197, 203, 206, 0.2)',
    COLOR_UP: '#00e676',
    COLOR_DOWN: '#ff5252',
    TEXT_COLOR: '#d1d4dc'
  });

  const UI_DISPLAY_CONFIG = Object.freeze({
    PRICE_DECIMALS: 2,
    PERCENT_DECIMALS: 2,
    RATIO_DECIMALS: 2,
    SENTIMENT_DECIMALS: 2,
    SENTIMENT_THRESHOLD_UP: 0.15,
    SENTIMENT_THRESHOLD_DOWN: -0.15,
    LARGE_NUM_TRILLION: 1e12,
    LARGE_NUM_BILLION: 1e9,
    LARGE_NUM_MILLION: 1e6
  });

  const ERROR_NAMES = Object.freeze({
    TYPE_ERROR: 'TypeError'
  });

  const TECH = Object.freeze({
    KEY_ENTER: 'Enter',
    METHOD_GET: 'GET',
    METHOD_POST: 'POST',
    METHOD_DELETE: 'DELETE',
    TYPE_STOCK: 'stock'
  });

  return {
    CHART_THEME,
    UI_DISPLAY_CONFIG,
    ERROR_NAMES,
    TECH
  };
})();
