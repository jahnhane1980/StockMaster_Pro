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

module.exports = {
  PRIORITY,
  PROVIDER
};
