const { query } = require('../database/db');
const { get, set } = require('../services/cache.service');
const logger = require('../utils/logger');

// ─── GET /api/dashboard ───────────────────────────────────────────
const resumen = async (req, res) => {
  try {
    const cacheKey = 'dashboard:resumen';
    const cached = await get(cacheKey);
    if (cached) return res.json({ ...cached, _fromCache: true });

    // Totales por estado
    const estadosRes = await query(
      `SELECT estado, COUNT(*) as total FROM activos WHERE activo = TRUE GROUP BY estado`
    );

    // Totales por categoría
    const categoriasRes = await query(
      `SELECT categoria, COUNT(*) as total FROM activos WHERE activo = TRUE GROUP BY categoria ORDER BY total DESC`
    );

    // Préstamos activos y vencidos
    const prestamosRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE estado = 'activo') AS activos,
         COUNT(*) FILTER (WHERE estado = 'devuelto') AS devueltos,
         COUNT(*) FILTER (WHERE estado = 'vencido') AS vencidos,
         COUNT(*) FILTER (WHERE estado = 'activo' AND fecha_devolucion_esperada < NOW()) AS por_vencer
       FROM prestamos`
    );

    // Activos más prestados (top 5)
    const masPrestadasRes = await query(
      `SELECT a.nombre, a.codigo, a.categoria, COUNT(p.id) AS total_prestamos
       FROM prestamos p
       JOIN activos a ON a.id = p.activo_id
       GROUP BY a.id ORDER BY total_prestamos DESC LIMIT 5`
    );

    // Mantenimientos pendientes
    const mantenimientosRes = await query(
      `SELECT COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
              COUNT(*) FILTER (WHERE estado = 'en_proceso') AS en_proceso
       FROM mantenimientos`
    );

    // Actividad reciente (auditoría)
    const actividadRes = await query(
      `SELECT a.accion, a.entidad, a.created_at,
              u.nombre || ' ' || u.apellido AS usuario
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ORDER BY a.created_at DESC LIMIT 10`
    );

    // Préstamos por mes (últimos 6 meses)
    const prestamosporMesRes = await query(
      `SELECT TO_CHAR(fecha_prestamo, 'Mon YYYY') AS mes,
              DATE_TRUNC('month', fecha_prestamo) AS fecha_orden,
              COUNT(*) AS total
       FROM prestamos
       WHERE fecha_prestamo >= NOW() - INTERVAL '6 months'
       GROUP BY mes, fecha_orden
       ORDER BY fecha_orden ASC`
    );

    const data = {
      activos: {
        total: estadosRes.rows.reduce((s, r) => s + parseInt(r.total), 0),
        por_estado: estadosRes.rows,
        por_categoria: categoriasRes.rows,
      },
      prestamos: prestamosRes.rows[0],
      mas_prestados: masPrestadasRes.rows,
      mantenimientos: mantenimientosRes.rows[0],
      actividad_reciente: actividadRes.rows,
      prestamos_por_mes: prestamosporMesRes.rows,
    };

    await set(cacheKey, data, 60); // Caché de 1 minuto para el dashboard
    res.json(data);
  } catch (err) {
    logger.error('Error al obtener resumen de dashboard', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { resumen };
