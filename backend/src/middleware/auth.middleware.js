const jwt = require('jsonwebtoken');
const { get: cacheGet, set: cacheSet } = require('../services/cache.service');

const JWT_SECRET = process.env.JWT_SECRET || 'labtrack_secret';

// ─── Verificar token JWT ─────────────────────────────────────────

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  // Verificar si el token está en lista negra (logout)
  const blacklisted = await cacheGet(`blacklist:${token}`);
  if (blacklisted) {
    return res.status(401).json({ error: 'Sesión inválida. Inicia sesión nuevamente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ─── Verificar rol ───────────────────────────────────────────────

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return res.status(403).json({
      error: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`,
    });
  }
  next();
};

// ─── Generar token ───────────────────────────────────────────────

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

// ─── Agregar a lista negra (logout) ─────────────────────────────

const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await cacheSet(`blacklist:${token}`, true, ttl);
  } catch (_) {}
};

module.exports = { authenticate, authorize, generateToken, blacklistToken };
