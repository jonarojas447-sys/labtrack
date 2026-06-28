require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const routes = require('./routes');
const logger = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 4000;

// Confiar en el proxy de Nginx
app.set('trust proxy', 1);

// ─── Seguridad y middlewares globales ─────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  message: { error: 'Demasiadas solicitudes. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Logging de requests ──────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });
  next();
});

// ─── Archivos estáticos (uploads) ────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Rutas de la API ─────────────────────────────────────────────
app.use('/api', routes);

// ─── Manejo de rutas no encontradas ──────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Manejo global de errores ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Error no manejado', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

// ─── Iniciar servidor ─────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 LabTrack API corriendo en puerto ${PORT}`);
  logger.info(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
