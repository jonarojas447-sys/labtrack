const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;

const getClient = () => {
  if (!client) {
    client = new Redis({
      host:     process.env.REDIS_HOST || 'localhost',
      port:     parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASS || undefined,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });

    client.on('connect', () => logger.info('Conectado a Redis'));
    client.on('error',   (err) => logger.error('Error en Redis', { error: err.message }));
  }
  return client;
};

// ─── Operaciones de caché ─────────────────────────────────────────

const set = async (key, value, ttlSeconds = 300) => {
  try {
    const redis = getClient();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Error al escribir en caché', { key, error: err.message });
  }
};

const get = async (key) => {
  try {
    const redis = getClient();
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn('Error al leer caché', { key, error: err.message });
    return null;
  }
};

const del = async (key) => {
  try {
    const redis = getClient();
    await redis.del(key);
  } catch (err) {
    logger.warn('Error al eliminar caché', { key, error: err.message });
  }
};

const delPattern = async (pattern) => {
  try {
    const redis = getClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn('Error al limpiar caché por patrón', { pattern, error: err.message });
  }
};

// ─── Middleware de caché para rutas GET ──────────────────────────

const cacheMiddleware = (ttl = 300) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  const cached = await get(key);
  if (cached) {
    return res.json({ ...cached, _fromCache: true });
  }
  res.sendCached = async (data) => {
    await set(key, data, ttl);
    res.json(data);
  };
  next();
};

module.exports = { getClient, set, get, del, delPattern, cacheMiddleware };
