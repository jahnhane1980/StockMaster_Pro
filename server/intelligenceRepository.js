const { db } = require('./database');

const IntelligenceRepository = {
    // Holt gespeicherte Intelligenz-Daten für ein Symbol
    getIntelligence: (symbol) => {
        const stmt = db.prepare('SELECT * FROM intelligence WHERE symbol = ?');
        const row = stmt.get(symbol);
        if (!row) return null;

        return {
            ...row,
            fundamentals: row.fundamentals_json ? JSON.parse(row.fundamentals_json) : {}
        };
    },

    // Speichert oder aktualisiert Intelligenz-Daten
    upsertIntelligence: (data) => {
        const stmt = db.prepare(`
            INSERT INTO intelligence (symbol, fundamentals_json, sentiment_score, dark_pool_flag, last_updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                fundamentals_json=excluded.fundamentals_json,
                sentiment_score=excluded.sentiment_score,
                dark_pool_flag=excluded.dark_pool_flag,
                last_updated=excluded.last_updated
        `);

        return stmt.run(
            data.symbol,
            JSON.stringify(data.fundamentals || {}),
            data.sentiment_score || 0,
            data.dark_pool_flag || 0,
            Date.now()
        );
    }
};

module.exports = IntelligenceRepository;