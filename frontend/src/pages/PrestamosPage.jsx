import { useEffect, useState } from 'react';
import { Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  activo:    'bg-blue-100 text-blue-700',
  devuelto:  'bg-green-100 text-green-700',
  vencido:   'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
};

const ModalPrestamo = ({ onClose, onSaved }) => {
  const [form, setForm]       = useState({ fecha_devolucion_esperada: '', proposito: '' });
  const [activos, setActivos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/activos', { params: { estado: 'disponible', limit: 100 } }).then(r => setActivos(r.data.activos));
    api.get('/auth/usuarios').then(r => setUsuarios(r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/prestamos', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear préstamo');
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
          <h2 className="text-lg font-semibold">Registrar préstamo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Activo a prestar *</label>
            <select className="input" required value={form.activo_id || ''} onChange={e => setForm(p => ({ ...p, activo_id: e.target.value }))}>
              <option value="">Selecciona un activo disponible</option>
              {activos.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Usuario solicitante *</label>
            <select className="input" required value={form.usuario_id || ''} onChange={e => setForm(p => ({ ...p, usuario_id: e.target.value }))}>
              <option value="">Selecciona un usuario</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha de devolución esperada *</label>
            <input className="input" type="datetime-local" required {...f('fecha_devolucion_esperada')} />
          </div>
          <div>
            <label className="label">Propósito / Motivo *</label>
            <textarea className="input resize-none" rows={3} required placeholder="¿Para qué se utilizará el activo?" {...f('proposito')} />
          </div>
          <div>
            <label className="label">Notas adicionales</label>
            <input className="input" placeholder="Opcional" {...f('notas')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Registrando...' : 'Registrar préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function PrestamosPage() {
  const { isEncargado } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [filtroEstado, setFiltro] = useState('');
  const [paginacion, setPag]      = useState({});
  const [page, setPage]           = useState(1);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/prestamos', { params: { estado: filtroEstado, page, limit: 15 } });
      setPrestamos(data.prestamos);
      setPag(data.paginacion);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, page]);

  const devolver = async (id) => {
    if (!confirm('¿Confirmar devolución?')) return;
    try {
      await api.put(`/prestamos/${id}/devolver`, {});
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-gray-500 text-sm">{paginacion.total || 0} registros</p>
        </div>
        {isEncargado() && (
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={15} /> Nuevo préstamo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex gap-3">
        {['', 'activo', 'devuelto', 'vencido'].map(e => (
          <button key={e}
            onClick={() => { setFiltro(e); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filtroEstado === e ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {e === '' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Fecha préstamo</th>
              <th className="px-4 py-3 font-medium">Devolución esperada</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Propósito</th>
              {isEncargado() && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : prestamos.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No hay préstamos</td></tr>
            ) : prestamos.map(p => {
              const vencido = p.estado === 'activo' && new Date(p.fecha_devolucion_esperada) < new Date();
              return (
                <tr key={p.id} className={`hover:bg-gray-50 ${vencido ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.activo_nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.activo_codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.usuario_nombre}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(p.fecha_prestamo).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={vencido ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {vencido && <AlertTriangle size={12} className="inline mr-1" />}
                      {new Date(p.fecha_devolucion_esperada).toLocaleString('es-MX')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${STATUS_BADGE[p.estado] || 'bg-gray-100 text-gray-500'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{p.proposito}</td>
                  {isEncargado() && (
                    <td className="px-4 py-3">
                      {p.estado === 'activo' && (
                        <button onClick={() => devolver(p.id)}
                          className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium">
                          <RotateCcw size={13} /> Devolver
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {paginacion.paginas > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
            <span className="text-gray-500">Página {page} de {paginacion.paginas}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Anterior</button>
              <button disabled={page >= paginacion.paginas} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {modal && <ModalPrestamo onClose={() => setModal(false)} onSaved={() => { setModal(false); cargar(); }} />}
    </div>
  );
}
