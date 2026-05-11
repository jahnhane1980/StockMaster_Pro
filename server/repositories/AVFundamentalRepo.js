const AVBaseRepo = require('./AVBaseRepo');
const { PRIORITY, API } = require('../utils/AppConstants');

/**
 * Repository für AlphaVantage Fundamentaldaten & Indikatoren.
 */
class AVFundamentalRepo extends AVBaseRepo {
  /**
   * Holt Fundamentaldaten: Company Overview.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Harmonisiertes Metadaten-Modell.
   */
  async getFundamentalsOverview(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.OVERVIEW,
        symbol: ticker
      });

      return {
        ticker: ticker,
        market_cap: parseInt(rawData.MarketCapitalization) || 0,
        debt_equity: parseFloat(rawData.DebtToEquityRatio) || 0,
        revenue_growth: parseFloat(rawData.RevenueGrowthYOY) || 0,
        pe_ratio: parseFloat(rawData.PERatio) || 0,
        eps: parseFloat(rawData.EPS) || 0,
        dividend_yield: parseFloat(rawData.DividendYield) || 0,
        beta: parseFloat(rawData.Beta) || 0,
        last_updated_fundamentals: new Date().toISOString()
      };
    };

    this.logger.info(`[AVFundamentalRepo] Queueing Harmonized Fundamentals for ${ticker} (${PRIORITY.BACKGROUND})`);
    return this._enqueue(PRIORITY.BACKGROUND, ticker, task);
  }

  /**
   * Alias für getFundamentalsOverview.
   */
  async getCompanyOverview(ticker) {
    return this.getFundamentalsOverview(ticker);
  }

  /**
   * Holt technische Indikatoren: On-Balance Volume.
   * @param {string} ticker - Das Aktiensymbol.
   * @param {string} [interval=API.AV_PARAMS.DAILY] - Zeitintervall.
   * @returns {Promise<Object|null>} - Harmonisierte OBV-Zeitreihe.
   */
  async getOBV(ticker, interval = API.AV_PARAMS.DAILY) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.OBV,
        symbol: ticker,
        interval: interval
      });

      const data = rawData[API.AV_RESPONSE_KEYS.TECHNICAL_OBV] || {};
      const obvList = Object.keys(data).slice(0, API.ALPHA_VANTAGE.OBV_PERIOD).map(date => ({
        date,
        value: parseFloat(data[date]['OBV'])
      })).reverse();

      return {
        ticker: ticker,
        indicator: 'OBV',
        data: obvList
      };
    };

    this.logger.info(`[AVFundamentalRepo] Queueing Harmonized OBV for ${ticker} (${PRIORITY.BACKGROUND})`);
    return this._enqueue(PRIORITY.BACKGROUND, ticker, task);
  }
}

module.exports = AVFundamentalRepo;
