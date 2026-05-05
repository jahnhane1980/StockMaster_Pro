require('dotenv').config(); 
const express = require('express');
const path = require('path');
const { db, initDB } = require('./database');

// Repositories
const TickerRepository = require('./tickerRepository');
const IntelligenceRepository = require('./intelligenceRepository');
const ChartRepository = require('./chartRepository');

// Services (Hybrid Setup)
const FinnhubService = require('./services/finnhubService');
const FMPService = require('./services/fmpService');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = parseInt(process.env.CACHE_DURATION_MS);

app.use(express.json());
initDB();

app.use(express.static(path.join(__dirname, '../public')));

/**
 * API Endpunkt für Chart-Daten (HYBRID-LOGIK)
 */
app.get('/api/charts/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        // 1. Lokale Datenbank prüfen
        let data = ChartRepository.getChartData(symbol);
        const now = Date.now();

        // 2. Falls keine Daten oder veraltet -> FMP als Primärquelle für Charts nutzen
        if (!data || data.length === 0) {
            console.log(`🌐 Server: Hole Chart-Daten für ${symbol} via FMP Service...`);
            
            // Wir nutzen hier FMP, da deren historische Daten im Free-Tier besser sind
            const candles = await FMPService.getHistoricalChart(symbol);

            if (candles && candles.length > 0) {
                ChartRepository.upsertChartData(symbol, candles);
                return res.json(candles);
            }
        }
        res.json(data || []);
    } catch (err) {
        console.error('❌ Server-Fehler bei Chart-Abruf:', err.message);
        res.status(500).json({ error: "Daten-Management Fehler" });
    }
});

/**
 * API Endpunkt für Intelligence (Finnhub für Metriken)
 */
app.get('/api/intelligence/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        let data = IntelligenceRepository.getIntelligence(symbol);
        const now = Date.now();

        if (!data || !data.last_updated || (now - data.last_updated > CACHE_MS)) {
            console.log(`🌐 Server: Aktualisiere Metriken für ${symbol} via Finnhub...`);
            const financials = await FinnhubService.getBasicFinancials(symbol);
            
            data = {
                symbol: symbol,
                fundamentals: financials,
                sentiment_score: 50,
                dark_pool_flag: 0,
                last_updated: now
            };
            IntelligenceRepository.upsertIntelligence(data);
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Standard Ticker Endpunkte
app.get('/api/tickers', (req, res) => res.json(TickerRepository.getAllTickers()));
app.post('/api/tickers', (req, res) => res.json(TickerRepository.upsertTicker(req.body)));
app.delete('/api/tickers/:symbol', (req, res) => {
    TickerRepository.deleteTicker(req.params.symbol);
    res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => {
    console.log(`🚀 StockMaster Pro läuft auf http://localhost:${PORT}`);
});