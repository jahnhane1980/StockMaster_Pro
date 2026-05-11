const AVBaseRepo = require('./AVBaseRepo');
const MarketDataMapper = require('../utils/MarketDataMapper');
const { PRIORITY, API } = require('../utils/AppConstants');

/**
 * Repository für AlphaVantage Kursdaten (Quotes & History).
 */
class AVMarketDataRepo extends AVBaseRepo {
  /**
   * Holt den aktuellen Kurs via GLOBAL_QUOTE.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Das harmonisierte Kurs-Objekt.
   */
  async getRealtimeQuote(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.GLOBAL_QUOTE,
        symbol: ticker
      });
      const quote = rawData[API.AV_RESPONSE_KEYS.GLOBAL_QUOTE];
      if (!quote || Object.keys(quote).length === 0) return null;

      return MarketDataMapper.toQuote(
        quote[API.AV_RESPONSE_KEYS.SYMBOL],
        quote[API.AV_RESPONSE_KEYS.PRICE],
        quote[API.AV_RESPONSE_KEYS.OPEN],
        quote[API.AV_RESPONSE_KEYS.VOLUME],
        quote[API.AV_RESPONSE_KEYS.LATEST_DAY]
      );
    };

    this.logger.info(`[AVMarketDataRepo] Queueing Global Quote for ${ticker} (${PRIORITY.IMPORTANT})`);
    return this._enqueue(PRIORITY.IMPORTANT, ticker, task);
  }

  /**
   * Holt historische Tagesdaten.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Array<Object>>} - Die harmonisierten Zeitreihendaten.
   */
  async getDailyHistory(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.DAILY_ADJUSTED,
        symbol: ticker,
        outputsize: API.AV_PARAMS.FULL
      });

      const timeSeries = rawData[API.AV_RESPONSE_KEYS.TIME_SERIES_DAILY];
      if (!timeSeries) return [];

      return Object.keys(timeSeries).map(date => {
        const entry = timeSeries[date];
        return MarketDataMapper.toHistoryEntry(
          ticker,
          date,
          entry['1. open'],
          entry['2. high'],
          entry['3. low'],
          entry['4. close'],
          entry['6. volume']
        );
      }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    this.logger.info(`[AVMarketDataRepo] Queueing Harmonized History for ${ticker} (${PRIORITY.IMPORTANT})`);
    return this._enqueue(PRIORITY.IMPORTANT, ticker, task);
  }
}

module.exports = AVMarketDataRepo;
