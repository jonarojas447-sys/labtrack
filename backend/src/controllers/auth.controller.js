const bcrypt = require('bcryptjs');
const { query } = require('../database/db');
const { generateToken, blacklistToken } = require('../middleware/auth.middleware');
const { registrar } = require('../services/audit.service');
const logger = require('../utils/logger');

// ─── POST /api/auth/login ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE`, [email]
    );
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = generateToken({
      id:     usuario.id,
      email:  usuario.email,
      nombre: usuario.nombre,
      rol:    usuario.rol,
    });

    await registrar({
      usuarioId: usuario.id, accion: 'login',
      entidad: 'usuarios', entidadId: usuario.id,
      detalle: { email }, ip: req.ip
    });

    res.json({
      token,
      usuario: {
        id:       usuario.id,
        nombre:   usuario.nombre,
        apellido: usuario.apellido,
        email:    usuario.email,
        rol:      usuario.rol,
      }
    });
  } catch (err) {
    logger.error('Error en login', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await blacklistToken(req.token);
    await registrar({
      usuarioId: req.user.id, accion: 'logout',
      entidad: 'usuarios', entidadId: req.user.id, ip: req.ip
    });
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    logger.error('Error en logout', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, apellido, email, rol, created_at FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── POST /api/auth/usuarios (solo admin) ────────────────────────
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    const existe = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO usuarios (nombre, apellido, email, password, rol)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, apellido, email, rol, created_at`,
      [nombre, apellido, email, hash, rol || 'usuario']
    );

    await registrar({
      usuarioId: req.user.id, accion: 'crear', entidad: 'usuarios',
      entidadId: result.rows[0].id, detalle: { email, rol }, ip: req.ip
    });

    res.status(201).json({ mensaje: 'Usuario creado', usuario: result.rows[0] });
  } catch (err) {
    logger.error('Error al crear usuario', { error: err.message });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── GET /api/auth/usuarios (solo admin/encargado) ───────────────
const listarUsuarios = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nombre, apellido, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login, logout, me, crearUsuario, listarUsuarios };
