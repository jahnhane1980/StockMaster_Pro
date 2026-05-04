const { db } = require('./database');

const TickerRepository = {
    getAllTickers: () => {
        const stmt = db.prepare('SELECT * FROM tickers ORDER BY symbol ASC');
        const rows = stmt.all();
        return rows.map(row => ({
            ...row,
            linked_assets: row.linked_assets ? JSON.parse(row.linked_assets) : []
        }));
    },

    upsertTicker: (ticker) => {
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

        // Wir stellen sicher, dass JEDER Parameter existiert (Defaults setzen)
        return stmt.run({
            symbol: ticker.symbol,
            name: ticker.name || '',
            type: ticker.type || 'stock',
            sector: ticker.sector || '',
            industry: ticker.industry || '',
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