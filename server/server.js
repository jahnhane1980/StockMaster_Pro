const express = require('express');
const path = require('path');
const { initDB } = require('./database');
const TickerRepository = require('./tickerRepository'); // NEU: Import Repository

const app = express();
const PORT = 3000;

// WICHTIG: Damit der Server JSON-Daten in POST-Anfragen versteht
app.use(express.json());

initDB();

app.use(express.static(path.join(__dirname, '../public')));

// --- API ENDPUNKTE ---

// 1. Alle Ticker holen
app.get('/api/tickers', (req, res) => {
    try {
        const tickers = TickerRepository.getAllTickers();
        res.json(tickers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Ticker hinzufügen/aktualisieren
app.post('/api/tickers', (req, res) => {
    try {
        const result = TickerRepository.upsertTicker(req.body);
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Ticker löschen
app.delete('/api/tickers/:symbol', (req, res) => {
    try {
        TickerRepository.deleteTicker(req.params.symbol);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 StockMaster Pro Server gestartet!`);
    console.log(`🌐 API bereit unter http://localhost:${PORT}/api/tickers`);
    console.log(`-----------------------------------------`);
});