const { db } = require('../database');

/**
 * Repository für historische Chart-Daten (SQLite)
 */
const ChartRepository = {
    /**
     * Holt gespeicherte Chart-Daten für ein Symbol
     */
    getChartData: (symbol) => {
        try {
            const stmt = db.prepare('SELECT data_json FROM chart_data WHERE symbol = ?');
            const row = stmt.get(symbol);
            return row ? JSON.parse(row.data_json) : null;
        } catch (error) {
            console.error(`❌ ChartRepository (Get): ${error.message}`);
            return null;
        }
    },

    /**
     * Speichert oder aktualisiert Chart-Daten (Upsert)
     */
    upsertChartData: (symbol, data) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO chart_data (symbol, data_json, last_updated)
                VALUES (?, ?, ?)
                ON CONFLICT(symbol) DO UPDATE SET
                    data_json=excluded.data_json,
                    last_updated=excluded.last_updated
            `);

            return stmt.run(
                symbol,
                JSON.stringify(data),
                Date.now()
            );
        } catch (error) {
            console.error(`❌ ChartRepository (Upsert): ${error.message}`);
            throw error;
        }
    }
};

module.exports = ChartRepository;