const { Pool } = require('pg');
const logger = require('../utils/logger');

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'labtrack_db',
  user:     process.env.DB_USER     || 'labtrack_user',
  password: process.env.DB_PASS     || 'labtrack_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  logger.error('Error inesperado en cliente de base de datos', { error: err.message });
});

pool.on('connect', () => {
  logger.info('Nueva conexión establecida con PostgreSQL');
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Query lenta detectada', { text: text.substring(0, 100), duration });
    }
    return res;
  } catch (err) {
    logger.error('Error en query de base de datos', { text: text.substring(0, 100), error: err.message });
    throw err;
  }
};

module.exports = { query, pool };
