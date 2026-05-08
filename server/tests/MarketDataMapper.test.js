const assert = require('node:assert');
const MarketDataMapper = require('../utils/MarketDataMapper');

/**
 * Unit-Tests für MarketDataMapper.js
 * Nutzt das integrierte node:assert Modul für minimale Abhängigkeiten.
 */

async function runTests() {
  console.log('🧪 Starte MarketDataMapper Unit-Tests...');

  try {
    // 1. Test: toQuote - Standardfall
    console.log('  > Test: toQuote - Standardfall');
    const quote = MarketDataMapper.toQuote('AAPL', 150.123456, 149.0000, 100000, 1710514800000);
    
    assert.strictEqual(quote.symbol, 'AAPL');
    assert.strictEqual(quote.price, 150.1235); // Rundung auf 4 Stellen
    assert.strictEqual(quote.change, 1.1235);
    assert.strictEqual(quote.changePercent, 0.754);
    assert.strictEqual(quote.volume, 100000);
    assert.strictEqual(quote.timestamp, new Date(1710514800000).toISOString());

    // 2. Test: toQuote - Preis 0
    console.log('  > Test: toQuote - Preis 0');
    const zeroPrice = MarketDataMapper.toQuote('FREE', 0, 0, 0, null);
    assert.strictEqual(zeroPrice.price, 0);
    assert.strictEqual(zeroPrice.change, 0);
    assert.strictEqual(zeroPrice.changePercent, 0);

    // 3. Test: toQuote - Ungültige Eingaben
    console.log('  > Test: toQuote - Ungültige Eingaben');
    const invalid = MarketDataMapper.toQuote('INV', 'abc', 'def', 'ghi', 'invalid-date');
    assert.strictEqual(invalid.price, 0);
    assert.strictEqual(invalid.volume, 0);
    assert.ok(isNaN(new Date(invalid.timestamp).getTime()) === false, 'Timestamp sollte auf Fallback (heute) fallen');

    // 4. Test: toHistoryEntry - Korrekte Vererbung und Formate
    console.log('  > Test: toHistoryEntry - Formate');
    const history = MarketDataMapper.toHistoryEntry('BTC', '2024-03-15', 60000, 65000, 59000, 62000, 500);
    
    assert.strictEqual(history.date, '2024-03-15');
    assert.strictEqual(history.open, 60000.0000);
    assert.strictEqual(history.close, 62000.0000);
    assert.strictEqual(history.price, 62000.0000);
    assert.strictEqual(history.change, 2000.0000);
    assert.strictEqual(history.changePercent, 3.3333);

    // 5. Test: Stabilität der 4 Nachkommastellen
    console.log('  > Test: 4-Stellen Stabilität');
    const precision = MarketDataMapper.toQuote('PREC', 1.00001, 1.0000, 0, Date.now());
    assert.strictEqual(precision.price, 1.0000);
    assert.strictEqual(precision.change, 0.0000);

    const precision2 = MarketDataMapper.toQuote('PREC2', 1.00005, 1.0000, 0, Date.now());
    assert.strictEqual(precision2.price, 1.0001); // Kaufmännisches Runden

    console.log('✅ Alle Tests erfolgreich bestanden!');
  } catch (error) {
    console.error('❌ Test fehlgeschlagen:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
