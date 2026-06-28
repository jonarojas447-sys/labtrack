import { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, Shield, User, Briefcase } from 'lucide-react';
import api from '../services/api';

const ROL_BADGE = {
  admin:     'bg-purple-100 text-purple-700',
  encargado: 'bg-blue-100 text-blue-700',
  usuario:   'bg-gray-100 text-gray-600',
};

const ROL_ICON = {
  admin:     <Shield size={12} />,
  encargado: <Briefcase size={12} />,
  usuario:   <User size={12} />,
};

// ─── Modal crear usuario ─────────────────────────────────────────
const ModalUsuario = ({ onClose, onSaved }) => {
  const [form, setForm]       = useState({ rol: 'usuario' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }
    try {
      await api.post('/auth/usuarios', {
        nombre:   form.nombre,
        apellido: form.apellido,
        email:    form.email,
        password: form.password,
        rol:      form.rol,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear usuario');
    } finally { setLoading(false); }
  };

  const f = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value }))
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Nuevo usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" required placeholder="Juan" {...f('nombre')} />
            </div>
            <div>
              <label className="label">Apellido *</label>
              <input className="input" required placeholder="Pérez" {...f('apellido')} />
            </div>
          </div>

          <div>
            <label className="label">Correo electrónico *</label>
            <input className="input" type="email" required placeholder="usuario@labtrack.edu" {...f('email')} />
          </div>

          <div>
            <label className="label">Rol *</label>
            <select className="input" required {...f('rol')}>
              <option value="usuario">Usuario</option>
              <option value="encargado">Encargado</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {form.rol === 'admin' && 'Acceso total al sistema'}
              {form.rol === 'encargado' && 'Puede gestionar activos, préstamos y mantenimientos'}
              {form.rol === 'usuario' && 'Solo puede consultar y solicitar préstamos'}
            </p>
          </div>

          <div>
            <label className="label">Contraseña *</label>
            <input className="input" type="password" required minLength={6}
              placeholder="Mínimo 6 caracteres" {...f('password')} />
          </div>

          <div>
            <label className="label">Confirmar contraseña *</label>
            <input className="input" type="password" required
              placeholder="Repite la contraseña" {...f('confirmar')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/usuarios');
      setUsuarios(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const toggleActivo = async (usuario) => {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${usuario.nombre}?`)) return;
    try {
      await api.put(`/auth/usuarios/${usuario.id}`, { activo: !usuario.activo });
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo actualizar');
    }
  };

  const filtrados = usuarios.filter(u =>
    `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Contadores por rol
  const contadores = {
    admin:     usuarios.filter(u => u.rol === 'admin').length,
    encargado: usuarios.filter(u => u.rol === 'encargado').length,
    usuario:   usuarios.filter(u => u.rol === 'usuario').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm">{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* Contadores por rol */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Administradores', count: contadores.admin,     color: 'bg-purple-50 border-purple-200', text: 'text-purple-700', icon: <Shield size={18} /> },
          { label: 'Encargados',      count: contadores.encargado, color: 'bg-blue-50 border-blue-200',     text: 'text-blue-700',   icon: <Briefcase size={18} /> },
          { label: 'Usuarios',        count: contadores.usuario,   color: 'bg-gray-50 border-gray-200',     text: 'text-gray-700',   icon: <User size={18} /> },
        ].map(c => (
          <div key={c.label} className={`card p-4 border ${c.color} flex items-center gap-3`}>
            <div className={c.text}>{c.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold ${c.text}`}>{c.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="card p-4">
        <input className="input max-w-sm" placeholder="Buscar por nombre o email..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha de registro</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No se encontraron usuarios</td></tr>
            ) : filtrados.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.nombre} {u.apellido}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge flex items-center gap-1 w-fit ${ROL_BADGE[u.rol]}`}>
                    {ROL_ICON[u.rol]} {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString('es-MX')}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(u)}
                    className={`flex items-center gap-1 text-xs font-medium transition-colors
                      ${u.activo
                        ? 'text-red-500 hover:text-red-700'
                        : 'text-green-600 hover:text-green-800'}`}>
                    {u.activo ? <><UserX size={13} /> Desactivar</> : <><UserCheck size={13} /> Activar</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalUsuario onClose={() => setModal(false)} onSaved={() => { setModal(false); cargar(); }} />
      )}
    </div>
  );
}
