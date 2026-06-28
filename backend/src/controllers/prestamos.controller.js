const { query } = require('../database/db');
const { del, delPattern } = require('../services/cache.service');
const { registrar } = require('../services/audit.service');
const logger = require('../utils/logger');

// ─── GET /api/prestamos ───────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const { estado, usuario_id, activo_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const condiciones = [];
    const valores = [];
    let idx = 1;

    if (estado)     { condiciones.push(`p.estado = $${idx++}`);      valores.push(estado); }
    if (usuario_id) { condiciones.push(`p.usuario_id = $${idx++}`);  valores.push(usuario_id); }
    if (activo_id)  { condiciones.push(`p.activo_id = $${idx++}`);   valores.push(activo_id); }

    // Los usuarios sólo ven sus propios préstamos
    if (req.user.rol === 'usuario') {
      condiciones.push(`p.usuario_id = $${idx++}`);
      valores.push(req.user.id);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM prestamos p ${where}`, valores);
    valores.push(parseInt(limit), offset);

    const result = await query(
      `SELECT p.*,
              a.codigo AS activo_codigo, a.nombre AS activo_nombre, a.categoria AS activo_categoria,
              u.nombre || ' ' || u.apellido AS usuario_nombre,
              au.nombre || ' ' || au.apellido AS autorizado_por_nombre
       FROM prestamos p
       JOIN activos a   ON a.id = p.activo_id
       JOIN usuarios u  ON u.id = p.usuario_id
       LEFT JOIN usuarios au ON au.id = p.autorizado_por
       ${where}
       ORDER BY p.fecha_prestamo DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      valores
    );

    const total = parseInt(countRes.rows[0].count);
    res.json({
      prestamos: result.rows,
      paginacion: { total, page: parseInt(page), limit: parseInt(limit), paginas: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error('Error al listar préstamos', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── POST /api/prestamos ──────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { activo_id, usuario_id, fecha_devolucion_esperada, proposito, notas } = req.body;

    // Verificar que el activo esté disponible
    const activoRes = await query(
      `SELECT * FROM activos WHERE id = $1 AND activo = TRUE`, [activo_id]
    );
    if (!activoRes.rows[0]) {
      return res.status(404).json({ error: 'Activo no encontrado' });
    }
    if (activoRes.rows[0].estado !== 'disponible') {
      return res.status(409).json({
        error: `El activo no está disponible. Estado actual: ${activoRes.rows[0].estado}`
      });
    }

    // Crear préstamo
    const prestamoRes = await query(
      `INSERT INTO prestamos
         (activo_id, usuario_id, autorizado_por, fecha_devolucion_esperada, proposito, notas)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [activo_id, usuario_id || req.user.id, req.user.id, fecha_devolucion_esperada, proposito, notas]
    );

    // Actualizar estado del activo
    await query(
      `UPDATE activos SET estado = 'prestado', updated_at = NOW() WHERE id = $1`, [activo_id]
    );

    await del(`activo:${activo_id}`);
    await delPattern('cache:/api/activos*');

    await registrar({
      usuarioId: req.user.id, accion: 'prestar', entidad: 'prestamos',
      entidadId: prestamoRes.rows[0].id,
      detalle: {
        activo_id, activo_nombre: activoRes.rows[0].nombre,
        usuario_id: usuario_id || req.user.id, fecha_devolucion_esperada
      },
      ip: req.ip
    });

    // Crear notificación para el usuario
    await query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES ($1, $2, $3, $4)`,
      [
        usuario_id || req.user.id,
        'Préstamo registrado',
        `Se ha registrado el préstamo de "${activoRes.rows[0].nombre}". Devolución esperada: ${new Date(fecha_devolucion_esperada).toLocaleDateString('es-MX')}`,
        'prestamo'
      ]
    );

    res.status(201).json({ mensaje: 'Préstamo creado exitosamente', prestamo: prestamoRes.rows[0] });
  } catch (err) {
    logger.error('Error al crear préstamo', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── PUT /api/prestamos/:id/devolver ─────────────────────────────
const devolver = async (req, res) => {
  try {
    const { id } = req.params;
    const { notas } = req.body;

    const prestamoRes = await query(
      `SELECT p.*, a.nombre AS activo_nombre FROM prestamos p
       JOIN activos a ON a.id = p.activo_id WHERE p.id = $1`, [id]
    );

    if (!prestamoRes.rows[0]) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }
    if (prestamoRes.rows[0].estado !== 'activo') {
      return res.status(409).json({ error: 'Este préstamo ya fue procesado' });
    }

    const prestamo = prestamoRes.rows[0];

    await query(
      `UPDATE prestamos SET estado = 'devuelto', fecha_devolucion_real = NOW(),
       notas = COALESCE($1, notas), updated_at = NOW() WHERE id = $2`,
      [notas, id]
    );

    await query(
      `UPDATE activos SET estado = 'disponible', updated_at = NOW() WHERE id = $1`,
      [prestamo.activo_id]
    );

    await del(`activo:${prestamo.activo_id}`);
    await delPattern('cache:/api/activos*');

    await registrar({
      usuarioId: req.user.id, accion: 'devolver', entidad: 'prestamos',
      entidadId: parseInt(id),
      detalle: { activo_id: prestamo.activo_id, activo_nombre: prestamo.activo_nombre },
      ip: req.ip
    });

    res.json({ mensaje: 'Devolución registrada exitosamente' });
  } catch (err) {
    logger.error('Error al registrar devolución', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── GET /api/prestamos/vencidos ─────────────────────────────────
const vencidos = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, a.codigo, a.nombre AS activo_nombre,
              u.nombre || ' ' || u.apellido AS usuario_nombre, u.email
       FROM prestamos p
       JOIN activos a  ON a.id = p.activo_id
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.estado = 'activo' AND p.fecha_devolucion_esperada < NOW()
       ORDER BY p.fecha_devolucion_esperada ASC`
    );

    // Marcar como vencidos en BD
    if (result.rows.length > 0) {
      const ids = result.rows.map(r => r.id);
      await query(`UPDATE prestamos SET estado = 'vencido' WHERE id = ANY($1::int[])`, [ids]);
    }

    res.json({ vencidos: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Error al obtener préstamos vencidos', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, devolver, vencidos };
