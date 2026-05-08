/**
 * Zentrales Register für App-Konstanten.
 * Intent: Vermeidung von Magic Strings und Konsistenz bei Prioritäten und Providern (Regel 6).
 */
const PRIORITY = Object.freeze({
  CRITICAL: 'P1',
  IMPORTANT: 'P2',
  BACKGROUND: 'P3'
});

const PROVIDER = Object.freeze({
  ALPHA_VANTAGE: 'AV',
  MASSIVE: 'MASSIVE'
});

const API = Object.freeze({
  // Provider-Konfigurationen (Regel 18.2)
  ALPHA_VANTAGE: {
    BASE_URL: 'https://www.alphavantage.co/query',
    NEWS_LIMIT: 50,
    NEWS_SELECTION: 10,
    OBV_PERIOD: 30,
    DECIMAL_PRECISION: 4
  },
  MASSIVE: {
    BASE_URL: 'https://api.massive.com/v3'
  },
  FINNHUB: {
    BASE_URL: 'https://finnhub.io/api/v1'
  },
  FMP: {
    BASE_URL: 'https://financialmodelingprep.com/api/v3'
  },
  
  // AlphaVantage API Funktionen (Regel 17.2)
  AV_FUNCTIONS: {
    GLOBAL_QUOTE: 'GLOBAL_QUOTE',
    DAILY_ADJUSTED: 'TIME_SERIES_DAILY_ADJUSTED',
    SENTIMENT: 'NEWS_SENTIMENT',
    OVERVIEW: 'OVERVIEW',
    OBV: 'OBV'
  },

  // AlphaVantage Parameter
  AV_PARAMS: {
    FULL: 'full',
    DAILY: 'daily'
  },

  // AlphaVantage Response Keys (Verschachtelte API-Strukturen)
  AV_RESPONSE_KEYS: {
    GLOBAL_QUOTE: 'Global Quote',
    TIME_SERIES_DAILY: 'Time Series (Daily)',
    TECHNICAL_OBV: 'Technical Analysis: OBV',
    SYMBOL: '01. symbol',
    OPEN: '02. open',
    PRICE: '05. price',
    VOLUME: '06. volume',
    LATEST_DAY: '07. latest trading day',
    CHANGE: '09. change',
    CHANGE_PERCENT: '10. change percent'
  },

  // Massive API Parameter
  MASSIVE_PARAMS: {
    INTERVAL_5M: '5m',
    INTERVAL_1D: '1d'
  }
});

const INTERNAL_ERR = Object.freeze({
  AV_DAILY_LIMIT: 'AV_DAILY_LIMIT_REACHED',
  MASSIVE_LIMIT: 'MASSIVE_LIMIT_REACHED'
});

const TECH = Object.freeze({
  TYPE_STOCK: 'stock',
  TYPE_STOCK_UPPER: 'STOCK',
  FULFILLED: 'fulfilled',
  EMPTY_STRING: '',
  MIME_JSON: 'application/json'
});

const LOG = Object.freeze({
  DEFAULT_DIR: 'server/logs',
  DEFAULT_LEVEL: 'info'
});

const CONFIG = Object.freeze({
  MIN_HISTORY_POINTS: 10,
  SCORE_THRESHOLDS: {
    NEGATIVE: -1,
    POSITIVE: 1
  },
  DB_VERSION: 2,
  CACHE_DURATION_MS: 2592000000, // 30 Tage
  REQUEST_MANAGER: {
    MAX_RETRIES: 3,
    DAILY_API_LIMIT: 25,
    MAX_QUEUE_SIZE: 100,
    MINUTE_API_LIMIT: 5,
    RESET_INTERVAL: 60000,
    LIMIT_WAIT_TIME: 1000
  }
});

const ANALYSIS = Object.freeze({
  MIN_SAMPLE_SIZE: 5,
  CORRELATION_STRONG: 0.7,
  CORRELATION_EXCELLENT: 0.9,
  CORRELATION_MODERATE: 0.4,
  CORRELATION_WEAK: 0.1
});

const VALIDATION = Object.freeze({
  SYMBOL_REGEX: /^[A-Za-z0-9]{1,10}$/
});

const DATABASE = Object.freeze({
  DEFAULT_PATH: 'server/data/stockmaster.db'
});

const SERVER = Object.freeze({
  DEFAULT_PORT: 3000,
  RATE_LIMIT_WINDOW_MS: 900000, // 15 Minuten
  RATE_LIMIT_MAX_REQUESTS: 100
});

const RESPONSE_KEYS = Object.freeze({
  SUCCESS: 'success',
  DATA: 'data',
  ERROR: 'error'
});

module.exports = {
  PRIORITY,
  PROVIDER,
  API,
  INTERNAL_ERR,
  TECH,
  LOG,
  CONFIG,
  ANALYSIS,
  VALIDATION,
  DATABASE,
  SERVER,
  RESPONSE_KEYS
};
