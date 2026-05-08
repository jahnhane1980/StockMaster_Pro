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
  AV_BASE_URL: 'https://www.alphavantage.co/query',
  MASSIVE_V1: 'v1'
});

const INTERNAL_ERR = Object.freeze({
  AV_DAILY_LIMIT: 'AV_DAILY_LIMIT_REACHED',
  MASSIVE_LIMIT: 'MASSIVE_LIMIT_REACHED'
});

const TECH = Object.freeze({
  TYPE_STOCK: 'stock',
  TYPE_STOCK_UPPER: 'STOCK',
  FULFILLED: 'fulfilled',
  EMPTY_STRING: ''
});

const LOG = Object.freeze({
  DEFAULT_DIR: 'server/logs',
  DEFAULT_LEVEL: 'info'
});

module.exports = {
  PRIORITY,
  PROVIDER,
  API,
  INTERNAL_ERR,
  TECH,
  LOG
};
