require('dotenv').config(); 
const express = require('express');
const path = require('path');
const { initDB } = require('./database');

// Repositories
const TickerRepository = require('./repositories/tickerRepository');

// Controllers
const WatchlistController = require('./controllers/watchlistController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Statische Dateien aus /public bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

/**
 * API Endpunkte (Delegiert an Controller)
 */

// Intelligence Board laden
app.get('/api/intelligence/:ticker', (req, res) => WatchlistController.getIntelligenceBoard(req, res));

// Watchlist: Ticker hinzufügen
app.post('/api/watchlist', (req, res) => WatchlistController.addTickerToWatchlist(req, res));

// Watchlist: Alle Ticker abrufen
app.get('/api/tickers', (req, res) => {
    try {
        res.json(TickerRepository.getAllTickers());
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Watchlist." });
    }
});

// Watchlist: Ticker löschen
app.delete('/api/tickers/:symbol', (req, res) => {
    try {
        TickerRepository.deleteTicker(req.params.symbol.toUpperCase());
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Tickers." });
    }
});

// Haupteinstiegspunkt
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => {
    console.log(`🚀 StockMaster Pro läuft auf http://localhost:${PORT}`);
});
