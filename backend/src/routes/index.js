const express = require('express');
const router  = express.Router();

const { authenticate, authorize } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../services/cache.service');

const authCtrl          = require('../controllers/auth.controller');
const activosCtrl       = require('../controllers/activos.controller');
const prestamosCtrl     = require('../controllers/prestamos.controller');
const mantenimientosCtrl = require('../controllers/mantenimientos.controller');
const dashboardCtrl     = require('../controllers/dashboard.controller');
const auditService      = require('../services/audit.service');
const { query }         = require('../database/db');

// ─── Auth ─────────────────────────────────────────────────────────
router.post('/auth/login',    authCtrl.login);
router.post('/auth/logout',   authenticate, authCtrl.logout);
router.get( '/auth/me',       authenticate, authCtrl.me);
router.get( '/auth/usuarios',     authenticate, authorize('admin', 'encargado'), authCtrl.listarUsuarios);
router.post('/auth/usuarios',     authenticate, authorize('admin'), authCtrl.crearUsuario);
router.put( '/auth/usuarios/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { activo } = req.body;
    const result = await require('../database/db').query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, apellido, email, rol, activo`,
      [activo, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    await require('../services/audit.service').registrar({
      usuarioId: req.user.id, accion: 'editar', entidad: 'usuarios',
      entidadId: parseInt(req.params.id), detalle: { activo }, ip: req.ip
    });
    res.json({ mensaje: 'Usuario actualizado', usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ─── Dashboard ────────────────────────────────────────────────────
router.get('/dashboard', authenticate, dashboardCtrl.resumen);

// ─── Activos ──────────────────────────────────────────────────────
router.get( '/activos/exportar/excel', authenticate, activosCtrl.exportarExcel);
router.get( '/activos/exportar/pdf',   authenticate, activosCtrl.exportarPDF);
router.get( '/activos',     authenticate, cacheMiddleware(120), activosCtrl.listar);
router.get( '/activos/:id', authenticate, activosCtrl.obtener);
router.post('/activos',     authenticate, authorize('admin', 'encargado'), activosCtrl.crear);
router.put( '/activos/:id', authenticate, authorize('admin', 'encargado'), activosCtrl.actualizar);
router.delete('/activos/:id', authenticate, authorize('admin'), activosCtrl.eliminar);

// ─── Préstamos ────────────────────────────────────────────────────
router.get( '/prestamos',             authenticate, prestamosCtrl.listar);
router.get( '/prestamos/vencidos',    authenticate, authorize('admin', 'encargado'), prestamosCtrl.vencidos);
router.post('/prestamos',             authenticate, authorize('admin', 'encargado'), prestamosCtrl.crear);
router.put( '/prestamos/:id/devolver', authenticate, authorize('admin', 'encargado'), prestamosCtrl.devolver);

// ─── Exportación préstamos ────────────────────────────────────────
router.get('/prestamos/exportar/excel', authenticate, authorize('admin','encargado'), async (req, res) => {
  try {
    const { query } = require('../database/db');
    const { generarExcel } = require('../services/export.service');
    const result = await query(
      `SELECT p.id, a.codigo AS activo_codigo, a.nombre AS activo, 
              u.nombre || ' ' || u.apellido AS usuario,
              p.fecha_prestamo, p.fecha_devolucion_esperada, p.fecha_devolucion_real,
              p.estado, p.proposito
       FROM prestamos p
       JOIN activos a ON a.id = p.activo_id
       JOIN usuarios u ON u.id = p.usuario_id
       ORDER BY p.fecha_prestamo DESC`
    );
    const buffer = generarExcel(result.rows, 'Préstamos');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=prestamos.xlsx');
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: 'Error al exportar' }); }
});

// ─── Exportación mantenimientos ───────────────────────────────────
router.get('/mantenimientos/exportar/excel', authenticate, authorize('admin','encargado'), async (req, res) => {
  try {
    const { query } = require('../database/db');
    const { generarExcel } = require('../services/export.service');
    const result = await query(
      `SELECT m.id, a.codigo AS activo_codigo, a.nombre AS activo,
              m.tipo, m.descripcion, m.estado,
              s.nombre || ' ' || s.apellido AS solicitado_por,
              t.nombre || ' ' || t.apellido AS tecnico,
              m.costo, m.fecha_inicio, m.fecha_fin, m.created_at
       FROM mantenimientos m
       JOIN activos a ON a.id = m.activo_id
       LEFT JOIN usuarios s ON s.id = m.solicitado_por
       LEFT JOIN usuarios t ON t.id = m.tecnico_id
       ORDER BY m.created_at DESC`
    );
    const buffer = generarExcel(result.rows, 'Mantenimientos');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mantenimientos.xlsx');
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: 'Error al exportar' }); }
});
router.get( '/mantenimientos',     authenticate, mantenimientosCtrl.listar);
router.post('/mantenimientos',     authenticate, authorize('admin', 'encargado'), mantenimientosCtrl.crear);
router.put( '/mantenimientos/:id', authenticate, authorize('admin', 'encargado'), mantenimientosCtrl.actualizar);

// ─── Auditoría ────────────────────────────────────────────────────
router.get('/auditoria', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { usuarioId, entidad, accion, desde, hasta, limit, offset } = req.query;
    const data = await auditService.obtenerHistorial({ usuarioId, entidad, accion, desde, hasta, limit, offset });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

// ─── Logs centralizados ───────────────────────────────────────────
router.get('/logs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../../logs/app.log');
    const lines = fs.existsSync(logFile)
      ? fs.readFileSync(logFile, 'utf-8').trim().split('\n').slice(-100).reverse()
      : [];
    const parsed = lines.map(l => { try { return JSON.parse(l); } catch { return { message: l }; } });
    res.json({ logs: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Error al leer logs' });
  }
});

// ─── Ubicaciones ──────────────────────────────────────────────────
router.get('/ubicaciones', authenticate, async (_req, res) => {
  const result = await query('SELECT * FROM ubicaciones WHERE activo = TRUE ORDER BY nombre');
  res.json(result.rows);
});

// ─── Notificaciones ───────────────────────────────────────────────
router.get('/notificaciones', authenticate, async (req, res) => {
  const result = await query(
    `SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.put('/notificaciones/:id/leer', authenticate, async (req, res) => {
  await query('UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]);
  res.json({ mensaje: 'Notificación marcada como leída' });
});

// ─── Health check ─────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'labtrack-api' });
});

module.exports = router;
