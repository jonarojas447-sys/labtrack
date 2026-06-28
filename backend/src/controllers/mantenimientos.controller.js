const { query } = require('../database/db');
const { del, delPattern } = require('../services/cache.service');
const { registrar } = require('../services/audit.service');
const logger = require('../utils/logger');

const listar = async (req, res) => {
  try {
    const { estado, activo_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const condiciones = [];
    const valores = [];
    let idx = 1;

    if (estado)    { condiciones.push(`m.estado = $${idx++}`);    valores.push(estado); }
    if (activo_id) { condiciones.push(`m.activo_id = $${idx++}`); valores.push(activo_id); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*) FROM mantenimientos m ${where}`, valores);
    valores.push(parseInt(limit), offset);

    const result = await query(
      `SELECT m.*,
              a.codigo AS activo_codigo, a.nombre AS activo_nombre,
              s.nombre || ' ' || s.apellido AS solicitado_por_nombre,
              t.nombre || ' ' || t.apellido AS tecnico_nombre
       FROM mantenimientos m
       JOIN activos a ON a.id = m.activo_id
       LEFT JOIN usuarios s ON s.id = m.solicitado_por
       LEFT JOIN usuarios t ON t.id = m.tecnico_id
       ${where} ORDER BY m.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      valores
    );

    const total = parseInt(countRes.rows[0].count);
    res.json({ mantenimientos: result.rows, paginacion: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    logger.error('Error al listar mantenimientos', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const crear = async (req, res) => {
  try {
    const { activo_id, tipo, descripcion, tecnico_id } = req.body;

    const activoRes = await query('SELECT * FROM activos WHERE id = $1 AND activo = TRUE', [activo_id]);
    if (!activoRes.rows[0]) return res.status(404).json({ error: 'Activo no encontrado' });

    const result = await query(
      `INSERT INTO mantenimientos (activo_id, solicitado_por, tecnico_id, tipo, descripcion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [activo_id, req.user.id, tecnico_id, tipo, descripcion]
    );

    await query(
      `UPDATE activos SET estado = 'mantenimiento', updated_at = NOW() WHERE id = $1`, [activo_id]
    );
    await del(`activo:${activo_id}`);
    await delPattern('cache:/api/activos*');

    await registrar({
      usuarioId: req.user.id, accion: 'mantenimiento_inicio', entidad: 'mantenimientos',
      entidadId: result.rows[0].id,
      detalle: { activo_id, activo_nombre: activoRes.rows[0].nombre, tipo }, ip: req.ip
    });

    res.status(201).json({ mensaje: 'Mantenimiento registrado', mantenimiento: result.rows[0] });
  } catch (err) {
    logger.error('Error al crear mantenimiento', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas_tecnico, costo, fecha_fin } = req.body;

    const result = await query(
      `UPDATE mantenimientos
       SET estado = COALESCE($1, estado),
           notas_tecnico = COALESCE($2, notas_tecnico),
           costo = COALESCE($3, costo),
           fecha_fin = COALESCE($4, fecha_fin),
           fecha_inicio = CASE WHEN $1 = 'en_proceso' AND fecha_inicio IS NULL THEN NOW() ELSE fecha_inicio END,
           updated_at = NOW()
       WHERE id = $5 RETURNING *, activo_id`,
      [estado, notas_tecnico, costo, fecha_fin, id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Mantenimiento no encontrado' });

    // Si se completa, regresar el activo a disponible
    if (estado === 'completado') {
      await query(
        `UPDATE activos SET estado = 'disponible', updated_at = NOW() WHERE id = $1`,
        [result.rows[0].activo_id]
      );
      await del(`activo:${result.rows[0].activo_id}`);
      await delPattern('cache:/api/activos*');

      await registrar({
        usuarioId: req.user.id, accion: 'mantenimiento_fin', entidad: 'mantenimientos',
        entidadId: parseInt(id), detalle: { estado, costo }, ip: req.ip
      });
    }

    res.json({ mensaje: 'Mantenimiento actualizado', mantenimiento: result.rows[0] });
  } catch (err) {
    logger.error('Error al actualizar mantenimiento', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, actualizar };
