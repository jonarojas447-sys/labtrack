const winston = require('winston');
const path = require('path');

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'labtrack-api' },
  transports: [
    // ─── Consola (desarrollo) ──────────────────────────────────
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    // ─── Logs de información ───────────────────────────────────
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880,  // 5MB
      maxFiles: 10,
    }),
    // ─── Logs de errores ───────────────────────────────────────
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 10,
    }),
    // ─── Logs de auditoría ─────────────────────────────────────
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 30,
    }),
  ],
});

module.exports = logger;
