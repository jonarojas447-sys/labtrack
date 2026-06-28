import { useEffect, useState } from 'react';
import { Plus, Search, Download, Filter, Edit2, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  disponible:    'bg-green-100 text-green-700',
  prestado:      'bg-blue-100 text-blue-700',
  mantenimiento: 'bg-yellow-100 text-yellow-700',
  dado_de_baja:  'bg-red-100 text-red-700',
  reservado:     'bg-purple-100 text-purple-700',
};

const CATEGORIAS = ['sensor','placa','robotica','vr','computo','herramienta','otro'];
const ESTADOS    = ['disponible','prestado','mantenimiento','dado_de_baja','reservado'];

const ModalActivo = ({ activo, onClose, onSaved }) => {
  const [form, setForm]     = useState(activo || { estado: 'disponible', categoria: 'computo' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [ubicaciones, setUbicaciones] = useState([]);

  useEffect(() => {
    api.get('/ubicaciones').then(r => setUbicaciones(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (activo?.id) {
        await api.put(`/activos/${activo.id}`, form);
      } else {
        await api.post('/activos', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({
    value: form[field] || '',
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value }))
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{activo?.id ? 'Editar activo' : 'Nuevo activo'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="label">Código *</label>
            <input className="input" required placeholder="SEN-001" {...f('codigo')} />
          </div>
          <div>
            <label className="label">Nombre *</label>
            <input className="input" required placeholder="Nombre del activo" {...f('nombre')} />
          </div>
          <div>
            <label className="label">Categoría *</label>
            <select className="input" required {...f('categoria')}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" {...f('estado')}>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Marca</label>
            <input className="input" placeholder="Marca" {...f('marca')} />
          </div>
          <div>
            <label className="label">Modelo</label>
            <input className="input" placeholder="Modelo" {...f('modelo')} />
          </div>
          <div>
            <label className="label">Número de serie</label>
            <input className="input" placeholder="S/N" {...f('numero_serie')} />
          </div>
          <div>
            <label className="label">Valor (MXN)</label>
            <input className="input" type="number" step="0.01" placeholder="0.00" {...f('valor')} />
          </div>
          <div>
            <label className="label">Ubicación</label>
            <select className="input" value={form.ubicacion_id || ''} onChange={e => setForm(p => ({ ...p, ubicacion_id: e.target.value || null }))}>
              <option value="">Sin ubicación</option>
              {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fecha de adquisición</label>
            <input className="input" type="date" {...f('fecha_adquisicion')} />
          </div>
          <div className="col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input resize-none" rows={2} placeholder="Descripción del activo..." {...f('descripcion')} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : activo?.id ? 'Actualizar' : 'Crear activo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function ActivosPage() {
  const { isEncargado } = useAuth();
  const [activos,  setActivos]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'crear' | activo
  const [paginacion, setPag]    = useState({});
  const [filtros,  setFiltros]  = useState({ search: '', categoria: '', estado: '', page: 1 });

  const cargar = async () => {
    setLoading(true);
    try {
      const params = { ...filtros, limit: 15 };
      const { data } = await api.get('/activos', { params });
      setActivos(data.activos);
      setPag(data.paginacion);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtros]);

  const exportar = async (formato) => {
    const res = await api.get(`/activos/exportar/${formato}`, { responseType: 'blob' });
    const url  = URL.createObjectURL(res.data);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `activos.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
    a.click();
  };

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Dar de baja "${nombre}"?`)) return;
    try {
      await api.delete(`/activos/${id}`);
      cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Activos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{paginacion.total || 0} activos registrados</p>
        </div>
        {isEncargado() && (
          <div className="flex gap-2">
            <button onClick={() => exportar('excel')} className="btn-secondary">
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button onClick={() => exportar('pdf')} className="btn-secondary">
              <Download size={15} /> PDF
            </button>
            <button onClick={() => setModal('crear')} className="btn-primary">
              <Plus size={15} /> Nuevo activo
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nombre, código, marca..."
            value={filtros.search}
            onChange={e => setFiltros(f => ({ ...f, search: e.target.value, page: 1 }))} />
        </div>
        <select className="input w-40" value={filtros.categoria}
          onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value, page: 1 }))}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-40" value={filtros.estado}
          onChange={e => setFiltros(f => ({ ...f, estado: e.target.value, page: 1 }))}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Cargando...</td></tr>
              ) : activos.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No se encontraron activos</td></tr>
              ) : activos.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.codigo}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.nombre}</p>
                    {a.marca && <p className="text-xs text-gray-400">{a.marca} {a.modelo}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-700 capitalize">{a.categoria}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${STATUS_BADGE[a.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {a.estado?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.ubicacion_nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {a.valor ? `$${parseFloat(a.valor).toLocaleString('es-MX')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {isEncargado() && (
                        <>
                          <button onClick={() => setModal(a)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => eliminar(a.id, a.nombre)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {paginacion.paginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">
              Página {filtros.page} de {paginacion.paginas}
            </span>
            <div className="flex gap-2">
              <button disabled={filtros.page <= 1}
                onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                className="btn-secondary py-1 px-3 disabled:opacity-40">Anterior</button>
              <button disabled={filtros.page >= paginacion.paginas}
                onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                className="btn-secondary py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ModalActivo
          activo={modal === 'crear' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}
