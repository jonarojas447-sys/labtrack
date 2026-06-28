const { query } = require('../database/db');
const logger = require('../utils/logger');

/**
 * Registra una acción en la tabla de auditoría y en el log centralizado.
 * @param {Object} opts
 * @param {number} opts.usuarioId   - ID del usuario que realiza la acción
 * @param {string} opts.accion      - Tipo de acción (ver enum audit_action)
 * @param {string} opts.entidad     - Nombre de la entidad afectada
 * @param {number} [opts.entidadId] - ID del registro afectado
 * @param {Object} [opts.detalle]   - Datos adicionales en JSON
 * @param {string} [opts.ip]        - IP de origen
 */
const registrar = async ({ usuarioId, accion, entidad, entidadId = null, detalle = {}, ip = null }) => {
  try {
    await query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip_origen)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, accion, entidad, entidadId, JSON.stringify(detalle), ip]
    );

    // También registra en el archivo centralizado de logs
    logger.info('AUDIT', {
      usuario_id: usuarioId,
      accion,
      entidad,
      entidad_id: entidadId,
      detalle,
      ip,
    });
  } catch (err) {
    // No lanzar error: la auditoría no debe bloquear la operación principal
    logger.error('Error al registrar auditoría', { error: err.message });
  }
};

/**
 * Obtiene el historial de auditoría con filtros opcionales.
 */
const obtenerHistorial = async ({ usuarioId, entidad, accion, desde, hasta, limit = 50, offset = 0 }) => {
  const condiciones = [];
  const valores = [];
  let idx = 1;

  if (usuarioId)  { condiciones.push(`a.usuario_id = $${idx++}`); valores.push(usuarioId); }
  if (entidad)    { condiciones.push(`a.entidad = $${idx++}`);    valores.push(entidad); }
  if (accion)     { condiciones.push(`a.accion = $${idx++}`);     valores.push(accion); }
  if (desde)      { condiciones.push(`a.created_at >= $${idx++}`); valores.push(desde); }
  if (hasta)      { condiciones.push(`a.created_at <= $${idx++}`); valores.push(hasta); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) FROM auditoria a ${where}`, valores
  );

  valores.push(limit, offset);
  const res = await query(
    `SELECT a.*, u.nombre || ' ' || u.apellido AS usuario_nombre
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    valores
  );

  return { total: parseInt(countRes.rows[0].count), registros: res.rows };
};

module.exports = { registrar, obtenerHistorial };
