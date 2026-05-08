/**
 * StockMaster Pro - Server Entry Point
 * Konfiguriert die Express-App, Middleware und API-Routen.
 */
require('dotenv').config(); 
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db/Database');
const Logger = require('./utils/Logger');
const { PRIORITY, PROVIDER } = require('./utils/AppConstants');

// Repositories
const TickerRepository = require('./repositories/TickerRepository');
const RepoFactory = require('./repositories/RepoFactory');

// Services
const RequestManager = require('./services/RequestManager');

// Controllers
const WatchlistController = require('./controllers/WatchlistController');
const IntelligenceController = require('./controllers/IntelligenceController');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: [`http://localhost:${PORT}`, 'http://127.0.0.1:' + PORT],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting für API-Routen (Regel 12)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Limit auf 100 Requests pro Fenster
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Zu viele Anfragen von dieser IP. Bitte versuchen Sie es in 15 Minuten erneut.'
  },
  handler: (req, res, next, options) => {
    Logger.warn(`[RateLimit] Blockierter Request von IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

app.use('/api/', apiLimiter);
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
 * Direkter Abruf von Fundamentaldaten (AV - Prio PRIORITY.BACKGROUND).
 * @param {Object} req - Request-Objekt.
 * @param {Object} res - Response-Objekt.
 * @returns {JSON} - Die Fundamentaldaten oder Fehlermeldung.
 */
app.get('/api/fundamentals/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
        const data = await RequestManager.enqueue(PRIORITY.BACKGROUND, PROVIDER.ALPHA_VANTAGE, () => RepoFactory.getAlphaVantageRepo().getCompanyOverview(symbol));
        res.json({ success: true, data, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler bei Fundamentaldaten-Abruf für ${symbol}: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Abruf der Fundamentaldaten." });
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
        const data = TickerRepository.getAllTickers();
        res.json({ success: true, data, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler beim Laden der Watchlist: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Laden der Watchlist." });
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
        res.json({ success: true, data: null, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler beim Löschen von ${req.params.symbol}: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Löschen des Tickers." });
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
