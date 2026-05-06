require('dotenv').config(); 
const express = require('express');
const path = require('path');
const { db, initDB } = require('./database');

// Repositories
const TickerRepository = require('./repositories/tickerRepository');
// Alte Repositories für Chart und Intelligence wurden durch DAOs im StockService abgelöst

// Services (Neues Hybrid Setup: Alpha Vantage + Massive)
const StockService = require('./services/StockService');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = parseInt(process.env.CACHE_DURATION_MS);

app.use(express.json());
initDB();

app.use(express.static(path.join(__dirname, '../public')));

/**
 * NEU: API Endpunkt für Watchlist (Triggert Hintergrund-Sync)
 */
app.post('/api/watchlist', (req, res) => {
    const symbol = req.body.symbol;
    if (!symbol) return res.status(400).json({ error: "Symbol fehlt" });
    
    // Wir triggern den StockService, warten aber nicht auf die Antwort (Fire & Forget),
    // damit das Frontend direkt das "OK" bekommt und nicht blockiert wird.
    console.log(`🌐 Server: Starte Hintergrund-Sync für ${symbol}...`);
    StockService.getIntelligenceData(symbol).catch(err => {
        console.error(`❌ Server: Hintergrund-Sync Fehler für ${symbol}:`, err.message);
    });

    res.json({ success: true, message: `Sync für ${symbol} gestartet.` });
});

/**
 * NEU: API Endpunkt für Intelligence & Charts (Kombiniert, via StockService)
 */
app.get('/api/intelligence/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        console.log(`🌐 Server: Lade aggregierte Daten für ${symbol}...`);
        
        // Der StockService kümmert sich intern um Cache-Checks, Provider-Wahl und Limits
        const data = await StockService.getIntelligenceData(symbol);
        
        res.json(data);
    } catch (err) {
        console.error(`❌ Server-Fehler bei Intelligence-Abruf für ${symbol}:`, err.message);
        
        // Limit-Error (429) an das Frontend durchreichen
        if (err.message && err.message.includes('429')) {
            return res.status(429).json({ 
                error: "API-Limit erreicht. Bitte kurz warten.", 
                details: err.message 
            });
        }
        res.status(500).json({ error: "Daten-Management Fehler" });
    }
});

// Standard Ticker Endpunkte (Unverändert gelassen für dein lokales UI Repository)
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