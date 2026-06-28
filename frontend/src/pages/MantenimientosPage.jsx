import { useEffect, useState } from 'react';
import { Plus, Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADO_BADGE = {
  pendiente:   'bg-yellow-100 text-yellow-700',
  en_proceso:  'bg-blue-100 text-blue-700',
  completado:  'bg-green-100 text-green-700',
  cancelado:   'bg-gray-100 text-gray-500',
};

const ESTADO_ICON = {
  pendiente:  <Clock size={14} />,
  en_proceso: <Wrench size={14} />,
  completado: <CheckCircle size={14} />,
  cancelado:  <AlertCircle size={14} />,
};

// ─── Modal: Solicitar mantenimiento ──────────────────────────────
const ModalSolicitar = ({ onClose, onSaved }) => {
  const [form, setForm]       = useState({ tipo: '', descripcion: '' });
  const [activos, setActivos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/activos', { params: { limit: 100 } }).then(r => setActivos(r.data.activos));
    api.get('/auth/usuarios').then(r => setUsuarios(r.data.filter(u => u.rol !== 'usuario')));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/mantenimientos', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally { setLoading(false); }
  };

  const f = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value }))
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench size={18} /> Solicitar mantenimiento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="label">Activo *</label>
            <select className="input" required value={form.activo_id || ''}
              onChange={e => setForm(p => ({ ...p, activo_id: e.target.value }))}>
              <option value="">Selecciona un activo</option>
              {activos.map(a => (
                <option key={a.id} value={a.id}>{a.codigo} — {a.nombre} ({a.estado})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Técnico asignado</label>
            <select className="input" value={form.tecnico_id || ''}
              onChange={e => setForm(p => ({ ...p, tecnico_id: e.target.value || null }))}>
              <option value="">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.rol})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tipo de mantenimiento *</label>
            <select className="input" required {...f('tipo')}>
              <option value="">Selecciona el tipo</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Calibración">Calibración</option>
              <option value="Reparación">Reparación</option>
              <option value="Actualización de firmware">Actualización de firmware</option>
            </select>
          </div>

          <div>
            <label className="label">Descripción del problema *</label>
            <textarea className="input resize-none" rows={3} required
              placeholder="Describe el problema o motivo del mantenimiento..."
              {...f('descripcion')} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registrando...' : 'Solicitar mantenimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Actualizar estado ────────────────────────────────────
const ModalActualizar = ({ mantenimiento, onClose, onSaved }) => {
  const [form, setForm]   = useState({
    estado:        mantenimiento.estado,
    notas_tecnico: mantenimiento.notas_tecnico || '',
    costo:         mantenimiento.costo || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.put(`/mantenimientos/${mantenimiento.id}`, {
        ...form,
        fecha_fin: form.estado === 'completado' ? new Date().toISOString() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Actualizar mantenimiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-700">{mantenimiento.activo_nombre}</p>
            <p className="text-gray-500">{mantenimiento.tipo}</p>
          </div>

          <div>
            <label className="label">Nuevo estado *</label>
            <select className="input" required value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="label">Notas del técnico</label>
            <textarea className="input resize-none" rows={3}
              placeholder="Acciones realizadas, diagnóstico, etc."
              value={form.notas_tecnico}
              onChange={e => setForm(p => ({ ...p, notas_tecnico: e.target.value }))} />
          </div>

          <div>
            <label className="label">Costo (MXN)</label>
            <input className="input" type="number" step="0.01" placeholder="0.00"
              value={form.costo}
              onChange={e => setForm(p => ({ ...p, costo: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Página principal ────────────────────────────────────────────
export default function MantenimientosPage() {
  const { isEncargado } = useAuth();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modalSol, setModalSol] = useState(false);
  const [modalAct, setModalAct] = useState(null);
  const [filtroEstado, setFiltro] = useState('');
  const [paginacion, setPag]    = useState({});
  const [page, setPage]         = useState(1);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/mantenimientos', {
        params: { estado: filtroEstado, page, limit: 15 }
      });
      setMantenimientos(data.mantenimientos);
      setPag(data.paginacion);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, page]);

  // KPIs rápidos
  const pendientes  = mantenimientos.filter(m => m.estado === 'pendiente').length;
  const en_proceso  = mantenimientos.filter(m => m.estado === 'en_proceso').length;
  const completados = mantenimientos.filter(m => m.estado === 'completado').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mantenimientos</h1>
          <p className="text-gray-500 text-sm">{paginacion.total || 0} registros totales</p>
        </div>
        {isEncargado() && (
          <button onClick={() => setModalSol(true)} className="btn-primary">
            <Plus size={15} /> Solicitar mantenimiento
          </button>
        )}
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendientes',  value: pendientes,  color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'En proceso',  value: en_proceso,  color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Completados', value: completados, color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(k => (
          <div key={k.label} className={`card p-4 border ${k.color} flex items-center justify-between`}>
            <span className="text-sm font-medium">{k.label}</span>
            <span className="text-2xl font-bold">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex gap-2 flex-wrap">
        {['', 'pendiente', 'en_proceso', 'completado', 'cancelado'].map(e => (
          <button key={e}
            onClick={() => { setFiltro(e); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filtroEstado === e
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {e === '' ? 'Todos' : e.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Solicitado por</th>
              <th className="px-4 py-3 font-medium">Técnico</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Costo</th>
              {isEncargado() && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : mantenimientos.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No hay registros</td></tr>
            ) : mantenimientos.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{m.activo_nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{m.activo_codigo}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.tipo}</td>
                <td className="px-4 py-3">
                  <span className={`badge flex items-center gap-1 w-fit ${ESTADO_BADGE[m.estado]}`}>
                    {ESTADO_ICON[m.estado]}
                    {m.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.solicitado_por_nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{m.tecnico_nombre || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(m.created_at).toLocaleDateString('es-MX')}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {m.costo ? `$${parseFloat(m.costo).toLocaleString('es-MX')}` : '—'}
                </td>
                {isEncargado() && (
                  <td className="px-4 py-3">
                    {m.estado !== 'completado' && m.estado !== 'cancelado' && (
                      <button onClick={() => setModalAct(m)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium hover:underline">
                        Actualizar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {paginacion.paginas > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
            <span className="text-gray-500">Página {page} de {paginacion.paginas}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary py-1 px-3 disabled:opacity-40">Anterior</button>
              <button disabled={page >= paginacion.paginas} onClick={() => setPage(p => p + 1)}
                className="btn-secondary py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {modalSol && (
        <ModalSolicitar onClose={() => setModalSol(false)} onSaved={() => { setModalSol(false); cargar(); }} />
      )}
      {modalAct && (
        <ModalActualizar mantenimiento={modalAct} onClose={() => setModalAct(null)} onSaved={() => { setModalAct(null); cargar(); }} />
      )}
    </div>
  );
}
