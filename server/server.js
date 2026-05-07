require('dotenv').config(); 
const express = require('express');
const path = require('path');
const { initDB } = require('./db/Database');

// Repositories
const TickerRepository = require('./repositories/tickerRepository');
const AlphaVantageRepo = require('./repositories/AlphaVantageRepo');

// Services
const RequestManager = require('./services/RequestManager');

// Controllers
const WatchlistController = require('./controllers/watchlistController');
const IntelligenceController = require('./controllers/IntelligenceController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Statische Dateien aus /public bereitstellen
app.use(express.static(path.join(__dirname, '../public')));

// Logger initialisieren
const Logger = require('./utils/Logger');

// Beispiel: Den Server-Start loggen
app.listen(PORT, () => {
    Logger.info(`🚀 StockMaster Pro läuft auf http://localhost:${PORT}`);
});

/**
 * API Endpunkte (Delegiert an Controller)
 */

// Intelligence Board laden
app.get('/api/intelligence/:ticker', (req, res) => WatchlistController.getIntelligenceBoard(req, res));

// Markt-Korrelationen (BTC, Gold) abrufen
app.get('/api/intelligence/correlations/:symbol', (req, res) => IntelligenceController.getMarketCorrelations(req, res));

// Direkter Abruf von Fundamentaldaten über den RequestManager (AV - Prio P3)
app.get('/api/fundamentals/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
        const data = await RequestManager.enqueue("P3", "AV", () => AlphaVantageRepo.getCompanyOverview(symbol));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Abruf der Fundamentaldaten." });
    }
});

// Watchlist: Ticker hinzufügen
app.post('/api/watchlist', (req, res) => WatchlistController.addTickerToWatchlist(req, res));

// Korrelationen: Verknüpfung erstellen
app.post('/api/correlations', (req, res) => WatchlistController.addCorrelation(req, res));

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
