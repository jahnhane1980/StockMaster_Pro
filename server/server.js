/**
 * StockMaster Pro - Server Entry Point
 * Konfiguriert die Express-App, Middleware und API-Routen.
 */
require('dotenv').config(); 
const express = require('express');
const path = require('path');
const { initDB } = require('./db/Database');
const Logger = require('./utils/Logger');

// Repositories
const TickerRepository = require('./repositories/TickerRepository');
const AlphaVantageRepo = require('./repositories/AlphaVantageRepo');

// Services
const RequestManager = require('./services/RequestManager');

// Controllers
const WatchlistController = require('./controllers/WatchlistController');
const IntelligenceController = require('./controllers/IntelligenceController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Statische Dateien bereitstellen:
 * Warum: Trennung von Client (Frontend-Assets in /public) und Server (Logik in /server).
 * Dies ermöglicht das einfache Servieren von HTML, CSS und JS-Modulen direkt vom Root.
 */
app.use(express.static(path.join(__dirname, '../public')));

// Server-Start loggen
app.listen(PORT, () => {
    Logger.info(`🚀 StockMaster Pro läuft auf http://localhost:${PORT}`);
});

/**
 * API Endpunkte (Delegiert an Controller)
 */

/**
 * Intelligence Board Daten abrufen.
 * Delegiert an: WatchlistController.getIntelligenceBoard
 */
app.get('/api/intelligence/:ticker', (req, res) => WatchlistController.getIntelligenceBoard(req, res));

/**
 * Markt-Korrelationen (BTC, Gold) abrufen.
 * Delegiert an: IntelligenceController.getMarketCorrelations
 */
app.get('/api/intelligence/correlations/:symbol', (req, res) => IntelligenceController.getMarketCorrelations(req, res));

/**
 * Direkter Abruf von Fundamentaldaten (AV - Prio P3).
 * @param {Object} req - Request-Objekt.
 * @param {Object} res - Response-Objekt.
 * @returns {JSON} - Die Fundamentaldaten oder Fehlermeldung.
 */
app.get('/api/fundamentals/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
        const data = await RequestManager.enqueue("P3", "AV", () => AlphaVantageRepo.getCompanyOverview(symbol));
        res.json(data);
    } catch (err) {
        Logger.error(`[Server] Fehler bei Fundamentaldaten-Abruf für ${symbol}: ${err.message}`);
        res.status(500).json({ error: "Fehler beim Abruf der Fundamentaldaten." });
    }
});

/**
 * Watchlist: Ticker hinzufügen.
 * Delegiert an: WatchlistController.addTickerToWatchlist
 */
app.post('/api/watchlist', (req, res) => WatchlistController.addTickerToWatchlist(req, res));

/**
 * Korrelationen: Verknüpfung erstellen.
 * Delegiert an: WatchlistController.addCorrelation
 */
app.post('/api/correlations', (req, res) => WatchlistController.addCorrelation(req, res));

/**
 * Watchlist: Alle Ticker abrufen.
 * @param {Object} req - Request-Objekt.
 * @param {Object} res - Response-Objekt.
 * @returns {JSON} - Liste aller Ticker in der Watchlist.
 */
app.get('/api/tickers', (req, res) => {
    try {
        res.json(TickerRepository.getAllTickers());
    } catch (err) {
        Logger.error(`[Server] Fehler beim Laden der Watchlist: ${err.message}`);
        res.status(500).json({ error: "Fehler beim Laden der Watchlist." });
    }
});

/**
 * Watchlist: Ticker löschen.
 * @param {Object} req - Request-Objekt.
 * @param {Object} res - Response-Objekt.
 * @returns {JSON} - Erfolgsstatus oder Fehlermeldung.
 */
app.delete('/api/tickers/:symbol', (req, res) => {
    try {
        TickerRepository.deleteTicker(req.params.symbol.toUpperCase());
        res.json({ success: true });
    } catch (err) {
        Logger.error(`[Server] Fehler beim Löschen von ${req.params.symbol}: ${err.message}`);
        res.status(500).json({ error: "Fehler beim Löschen des Tickers." });
    }
});

/**
 * Haupteinstiegspunkt für das Frontend.
 * Warum: Unterstützung von Single Page Application (SPA) Routen.
 */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

/**
 * Globale Fehlerbehandlung (Intent):
 * Warum: Um sicherzustellen, dass keine ungefilterten Stacktraces an das Frontend gelangen
 * und jeder Fehler zentral geloggt wird. Derzeit über lokale try/catch Blöcke in Routen
 * und Controllern gelöst, die auf das zentrale Logger-Modul zurückgreifen.
 */
