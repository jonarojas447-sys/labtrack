const { query } = require('../database/db');
const { get, set, del, delPattern, cacheMiddleware } = require('../services/cache.service');
const { registrar } = require('../services/audit.service');
const { generarExcel, generarPDFActivos } = require('../services/export.service');
const logger = require('../utils/logger');

// ─── GET /api/activos ─────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const { categoria, estado, ubicacion_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const condiciones = ['a.activo = TRUE'];
    const valores = [];
    let idx = 1;

    if (categoria)    { condiciones.push(`a.categoria = $${idx++}`); valores.push(categoria); }
    if (estado)       { condiciones.push(`a.estado = $${idx++}`);    valores.push(estado); }
    if (ubicacion_id) { condiciones.push(`a.ubicacion_id = $${idx++}`); valores.push(ubicacion_id); }
    if (search) {
      condiciones.push(`(a.nombre ILIKE $${idx} OR a.codigo ILIKE $${idx} OR a.marca ILIKE $${idx})`);
      valores.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${condiciones.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*) FROM activos a ${where}`, valores
    );

    valores.push(parseInt(limit), offset);
    const res2 = await query(
      `SELECT a.*, u.nombre AS ubicacion_nombre, 
              usr.nombre || ' ' || usr.apellido AS responsable_nombre
       FROM activos a
       LEFT JOIN ubicaciones u ON u.id = a.ubicacion_id
       LEFT JOIN usuarios usr ON usr.id = a.responsable_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      valores
    );

    const total = parseInt(countRes.rows[0].count);
    const data = {
      activos: res2.rows,
      paginacion: { total, page: parseInt(page), limit: parseInt(limit), paginas: Math.ceil(total / limit) }
    };

    if (res.sendCached) return res.sendCached(data);
    res.json(data);
  } catch (err) {
    logger.error('Error al listar activos', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── GET /api/activos/:id ─────────────────────────────────────────
const obtener = async (req, res) => {
  try {
    const cacheKey = `activo:${req.params.id}`;
    const cached = await get(cacheKey);
    if (cached) return res.json({ ...cached, _fromCache: true });

    const result = await query(
      `SELECT a.*, u.nombre AS ubicacion_nombre,
              usr.nombre || ' ' || usr.apellido AS responsable_nombre
       FROM activos a
       LEFT JOIN ubicaciones u ON u.id = a.ubicacion_id
       LEFT JOIN usuarios usr ON usr.id = a.responsable_id
       WHERE a.id = $1 AND a.activo = TRUE`,
      [req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Activo no encontrado' });

    // Historial de préstamos del activo
    const historial = await query(
      `SELECT p.*, usr.nombre || ' ' || usr.apellido AS usuario_nombre
       FROM prestamos p
       LEFT JOIN usuarios usr ON usr.id = p.usuario_id
       WHERE p.activo_id = $1
       ORDER BY p.fecha_prestamo DESC LIMIT 10`,
      [req.params.id]
    );

    const data = { ...result.rows[0], historial_prestamos: historial.rows };
    await set(cacheKey, data, 120);
    res.json(data);
  } catch (err) {
    logger.error('Error al obtener activo', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── POST /api/activos ────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, categoria, marca, modelo,
      numero_serie, estado, ubicacion_id, responsable_id,
      fecha_adquisicion, valor, especificaciones
    } = req.body;

    const existente = await query('SELECT id FROM activos WHERE codigo = $1', [codigo]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: `El código "${codigo}" ya está registrado` });
    }

    const result = await query(
      `INSERT INTO activos
         (codigo, nombre, descripcion, categoria, marca, modelo, numero_serie,
          estado, ubicacion_id, responsable_id, fecha_adquisicion, valor, especificaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [codigo, nombre, descripcion, categoria, marca, modelo, numero_serie,
       estado || 'disponible', ubicacion_id, responsable_id,
       fecha_adquisicion, valor, especificaciones ? JSON.stringify(especificaciones) : null]
    );

    await delPattern('cache:/api/activos*');
    await registrar({
      usuarioId: req.user.id, accion: 'crear', entidad: 'activos',
      entidadId: result.rows[0].id, detalle: { codigo, nombre }, ip: req.ip
    });

    res.status(201).json({ mensaje: 'Activo creado exitosamente', activo: result.rows[0] });
  } catch (err) {
    logger.error('Error al crear activo', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── PUT /api/activos/:id ─────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const campos = req.body;
    const actualizables = [
      'nombre','descripcion','categoria','marca','modelo','numero_serie',
      'estado','ubicacion_id','responsable_id','fecha_adquisicion','valor','especificaciones'
    ];

    const setClauses = [];
    const valores = [];
    let idx = 1;

    for (const campo of actualizables) {
      if (campos[campo] !== undefined) {
        setClauses.push(`${campo} = $${idx++}`);
        valores.push(campo === 'especificaciones' ? JSON.stringify(campos[campo]) : campos[campo]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    setClauses.push(`updated_at = NOW()`);
    valores.push(id);

    const result = await query(
      `UPDATE activos SET ${setClauses.join(', ')} WHERE id = $${idx} AND activo = TRUE RETURNING *`,
      valores
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Activo no encontrado' });

    await del(`activo:${id}`);
    await delPattern('cache:/api/activos*');
    await registrar({
      usuarioId: req.user.id, accion: 'editar', entidad: 'activos',
      entidadId: parseInt(id), detalle: campos, ip: req.ip
    });

    res.json({ mensaje: 'Activo actualizado', activo: result.rows[0] });
  } catch (err) {
    logger.error('Error al actualizar activo', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── DELETE /api/activos/:id (baja lógica) ────────────────────────
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const activoRes = await query('SELECT * FROM activos WHERE id = $1 AND activo = TRUE', [id]);
    if (!activoRes.rows[0]) return res.status(404).json({ error: 'Activo no encontrado' });

    const prestamosActivos = await query(
      `SELECT id FROM prestamos WHERE activo_id = $1 AND estado = 'activo'`, [id]
    );
    if (prestamosActivos.rows.length > 0) {
      return res.status(409).json({ error: 'No se puede dar de baja: el activo tiene préstamos activos' });
    }

    await query(
      `UPDATE activos SET activo = FALSE, estado = 'dado_de_baja', updated_at = NOW() WHERE id = $1`, [id]
    );

    await del(`activo:${id}`);
    await delPattern('cache:/api/activos*');
    await registrar({
      usuarioId: req.user.id, accion: 'dar_de_baja', entidad: 'activos',
      entidadId: parseInt(id), detalle: { nombre: activoRes.rows[0].nombre }, ip: req.ip
    });

    res.json({ mensaje: 'Activo dado de baja exitosamente' });
  } catch (err) {
    logger.error('Error al dar de baja activo', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── GET /api/activos/exportar/excel ─────────────────────────────
const exportarExcel = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.codigo, a.nombre, a.categoria, a.marca, a.modelo, a.numero_serie,
              a.estado, u.nombre AS ubicacion, a.valor,
              usr.nombre || ' ' || usr.apellido AS responsable,
              a.fecha_adquisicion, a.created_at AS fecha_registro
       FROM activos a
       LEFT JOIN ubicaciones u ON u.id = a.ubicacion_id
       LEFT JOIN usuarios usr ON usr.id = a.responsable_id
       WHERE a.activo = TRUE ORDER BY a.codigo`
    );

    const buffer = generarExcel(result.rows, 'Inventario de Activos');
    await registrar({
      usuarioId: req.user.id, accion: 'exportar', entidad: 'activos',
      detalle: { formato: 'excel', total: result.rows.length }, ip: req.ip
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventario_activos.xlsx');
    res.send(buffer);
  } catch (err) {
    logger.error('Error al exportar Excel', { error: err.message });
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
};

// ─── GET /api/activos/exportar/pdf ───────────────────────────────
const exportarPDF = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.nombre AS ubicacion FROM activos a
       LEFT JOIN ubicaciones u ON u.id = a.ubicacion_id
       WHERE a.activo = TRUE ORDER BY a.categoria, a.codigo`
    );

    const buffer = await generarPDFActivos(result.rows, 'Inventario de Activos Tecnológicos');
    await registrar({
      usuarioId: req.user.id, accion: 'exportar', entidad: 'activos',
      detalle: { formato: 'pdf', total: result.rows.length }, ip: req.ip
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inventario_activos.pdf');
    res.send(buffer);
  } catch (err) {
    logger.error('Error al exportar PDF', { error: err.message });
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, exportarExcel, exportarPDF, cacheMiddleware };
