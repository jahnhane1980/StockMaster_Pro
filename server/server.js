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
const Logger = require('./utils/Logger');
const { PRIORITY, PROVIDER, SERVER } = require('./utils/AppConstants');

// 1. DAOs & Repositories (Data Layer)
const TickerRepository = require('./repositories/TickerRepository');
const HistoricalDataDAO = require('./models/HistoricalDataDAO');
const IntelligenceDAO = require('./models/IntelligenceDAO');
const RepoFactory = require('./repositories/RepoFactory');

// 2. Services (Business Layer)
const RequestManager = require('./services/RequestManager');
const StockService = require('./services/StockService');
const AnalysisService = require('./services/AnalysisService');
const CorrelationStrategy = require('./services/strategies/CorrelationStrategy');

// 3. Controllers (Presentation Layer)
const WatchlistController = require('./controllers/WatchlistController');
const IntelligenceController = require('./controllers/IntelligenceController');

// --- Composition Root (Regel 4 & 23) ---
const avMarketDataRepo = RepoFactory.getAVMarketDataRepo();
const avIntelligenceRepo = RepoFactory.getAVIntelligenceRepo();
const avFundamentalRepo = RepoFactory.getAVFundamentalRepo();
const massiveRepo = RepoFactory.getMassiveRepo();

const correlationStrategy = new CorrelationStrategy(Logger);
const analysisService = new AnalysisService(Logger, correlationStrategy);
const stockService = new StockService(
  avMarketDataRepo,
  avIntelligenceRepo,
  avFundamentalRepo,
  massiveRepo, 
  TickerRepository, 
  HistoricalDataDAO, 
  IntelligenceDAO, 
  Logger, 
  RequestManager
);

// Instanziierung der Controller mit den fertigen Services
const watchlistController = new WatchlistController(stockService, TickerRepository, IntelligenceDAO);
const intelligenceController = new IntelligenceController(analysisService, HistoricalDataDAO, stockService);

const app = express();
const PORT = process.env.PORT || SERVER.DEFAULT_PORT;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: [`http://localhost:${PORT}`, 'http://127.0.0.1:' + PORT],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting für API-Routen
const apiLimiter = rateLimit({
  windowMs: SERVER.RATE_LIMIT_WINDOW_MS,
  max: SERVER.RATE_LIMIT_MAX_REQUESTS,
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
 * Statische Dateien bereitstellen
 */
app.use(express.static(path.join(__dirname, '../public')));

/**
 * API Endpunkte (Delegiert an Controller-Instanzen)
 * Regel: Definition am Ende vor app.listen
 */

// Intelligence Board
app.get('/api/intelligence', (req, res) => intelligenceController.getIntelligence(req, res));
app.get('/api/intelligence/:ticker', (req, res) => intelligenceController.getIntelligence(req, res));
app.get('/api/intelligence/correlations/:symbol', (req, res) => intelligenceController.getMarketCorrelations(req, res));

// Fundamentaldaten
app.get('/api/fundamentals/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    try {
        const data = await avFundamentalRepo.getCompanyOverview(symbol);
        res.json({ success: true, data, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler bei Fundamentaldaten-Abruf für ${symbol}: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Abruf der Fundamentaldaten." });
    }
});

// Watchlist & Ticker
app.post('/api/watchlist', (req, res) => watchlistController.addTickerToWatchlist(req, res));
app.post('/api/correlations', (req, res) => watchlistController.addCorrelation(req, res));

app.get('/api/tickers', (req, res) => {
    try {
        const data = TickerRepository.getAllTickers();
        res.json({ success: true, data, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler beim Laden der Watchlist: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Laden der Watchlist." });
    }
});

app.delete('/api/tickers/:symbol', (req, res) => {
    try {
        TickerRepository.deleteTicker(req.params.symbol.toUpperCase());
        res.json({ success: true, data: null, error: null });
    } catch (err) {
        Logger.error(`[Server] Fehler beim Löschen von ${req.params.symbol}: ${err.message}`);
        res.status(500).json({ success: false, data: null, error: "Fehler beim Löschen des Tickers." });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

// Server-Start
app.listen(PORT, () => {
    Logger.info(`🚀 StockMaster Pro läuft auf http://localhost:${PORT}`);
});
