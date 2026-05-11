const AVBaseRepo = require('./AVBaseRepo');
const { PRIORITY, PROVIDER, API } = require('../utils/AppConstants');

/**
 * Repository für AlphaVantage Intelligence Daten (News & Sentiment).
 */
class AVIntelligenceRepo extends AVBaseRepo {
  /**
   * Holt das News Sentiment.
   * @param {string} ticker - Das Aktiensymbol.
   * @returns {Promise<Object|null>} - Harmonisiertes Sentiment-Modell.
   */
  async getNewsSentiment(ticker) {
    const task = async () => {
      const rawData = await this._fetchFromAPI({
        function: API.AV_FUNCTIONS.SENTIMENT,
        tickers: ticker,
        limit: API.ALPHA_VANTAGE.NEWS_LIMIT
      });
      
      const feed = rawData.feed || [];
      const relevantNews = feed.slice(0, API.ALPHA_VANTAGE.NEWS_SELECTION);
      const avgScore = relevantNews.reduce((sum, item) => {
        const tickerData = item.ticker_sentiment?.find(s => s.ticker === ticker);
        return sum + (tickerData ? parseFloat(tickerData.ticker_sentiment_score) : 0);
      }, 0) / (relevantNews.length || 1);

      return {
        sentiment_score: parseFloat(avgScore.toFixed(API.ALPHA_VANTAGE.DECIMAL_PRECISION)),
        relevance_score: 1.0,
        news_count: feed.length,
        last_news_title: relevantNews[0]?.title || 'Keine News verfügbar',
        last_news_url: relevantNews[0]?.url || '',
        timestamp: this._formatTimestamp(relevantNews[0]?.time_published),
        provider: PROVIDER.ALPHA_VANTAGE
      };
    };

    this.logger.info(`[AVIntelligenceRepo] Queueing Harmonized Sentiment for ${ticker} (${PRIORITY.BACKGROUND})`);
    return this._enqueue(PRIORITY.BACKGROUND, ticker, task);
  }

  /**
   * Hilfsfunktion zum Formatieren von AV Zeitstempeln (YYYYMMDDTHHMMSS -> ISO).
   * @param {string} ts - AV Zeitstempel.
   * @returns {string} - ISO Datum.
   * @private
   */
  _formatTimestamp(ts) {
    if (!ts) return new Date().toISOString();
    return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  }
}

module.exports = AVIntelligenceRepo;
