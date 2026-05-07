/**
 * Zentrales Logging-Modul für StockMaster Pro.
 * Basierend auf Winston für persistentes, rotiertes Logging.
 */
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Konfiguration aus Umgebungsvariablen beziehen
const logDir = process.env.LOG_DIR || 'server/logs';
const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Erstellt ein Format für die Log-Ausgabe.
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Konfiguration der Transports (Datei-Rotation).
 */
const transportError = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '14d' // Behält Logs für 14 Tage
});

const transportCombined = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d'
});

/**
 * Der Logger-Service.
 */
const Logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'stockmaster-backend' },
  transports: [
    transportError,
    transportCombined
  ]
});

// Falls wir uns nicht in der Produktionsumgebung befinden, auch in die Konsole loggen
if (process.env.NODE_ENV !== 'production') {
  Logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = Logger;