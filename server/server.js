const express = require('express');
const path = require('path');
const { initDB } = require('./database');
const TickerRepository = require('./tickerRepository');
const IntelligenceRepository = require('./intelligenceRepository'); // NEU

const app = express();
const PORT = 3000;

app.use(express.json());
initDB();

app.use(express.static(path.join(__dirname, '../public')));

// --- Ticker API (bestehend) ---
app.get('/api/tickers', (req, res) => res.json(TickerRepository.getAllTickers()));
app.post('/api/tickers', (req, res) => res.json(TickerRepository.upsertTicker(req.body)));
app.delete('/api/tickers/:symbol', (req, res) => res.json(TickerRepository.deleteTicker(req.params.symbol)));

// --- Intelligence API (NEU) ---
app.get('/api/intelligence/:symbol', (req, res) => {
    try {
        const data = IntelligenceRepository.getIntelligence(req.params.symbol);
        res.json(data || { message: "Keine Daten vorhanden" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/intelligence', (req, res) => {
    try {
        IntelligenceRepository.upsertIntelligence(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => {
    console.log(`🚀 StockMaster Server läuft auf Port ${PORT}`);
});