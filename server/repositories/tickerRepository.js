const { db } = require('../database');
const RequestManager = require('../services/RequestManager');
const MassiveRepo = require('./MassiveRepo');

const TickerRepository = {
    getAllTickers: () => {
        const stmt = db.prepare('SELECT * FROM tickers ORDER BY symbol ASC');
        const rows = stmt.all();
        return rows.map(row => ({
            ...row,
            linked_assets: row.linked_assets ? JSON.parse(row.linked_assets) : []
        }));
    },

    /**
     * Holt den Echtzeit-Preis über den RequestManager (Massive P1)
     */
    async getRealtimePrice(symbol) {
        return RequestManager.enqueue('P1', 'MASSIVE', () => MassiveRepo.getRealtimeQuote(symbol));
    },

    upsertTicker: (ticker) => {
        // Wir definieren das Statement einmal
        const stmt = db.prepare(`
            INSERT INTO tickers (symbol, name, type, sector, industry, linked_assets, last_updated)
            VALUES (@symbol, @name, @type, @sector, @industry, @linked_assets, @last_updated)
            ON CONFLICT(symbol) DO UPDATE SET
                name=excluded.name,
                type=excluded.type,
                sector=excluded.sector,
                industry=excluded.industry,
                linked_assets=excluded.linked_assets,
                last_updated=excluded.last_updated
        `);

        // Wir füllen JEDES Feld mit einem Fallback, damit SQLite nicht meckert
        return stmt.run({
            symbol: ticker.symbol,
            name: ticker.name || '',
            type: ticker.type || 'stock',
            sector: ticker.sector || '',   // WICHTIG: Fallback auf leerer String
            industry: ticker.industry || '', // WICHTIG: Fallback auf leerer String
            last_updated: ticker.last_updated || Date.now(),
            linked_assets: JSON.stringify(ticker.linked_assets || [])
        });
    },

    deleteTicker: (symbol) => {
        const stmt = db.prepare('DELETE FROM tickers WHERE symbol = ?');
        return stmt.run(symbol);
    }
};

module.exports = TickerRepository;