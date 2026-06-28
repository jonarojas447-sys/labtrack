import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import api from '../services/api';

const ACCION_BADGE = {
  crear:               'bg-green-100 text-green-700',
  editar:              'bg-blue-100 text-blue-700',
  eliminar:            'bg-red-100 text-red-700',
  prestar:             'bg-purple-100 text-purple-700',
  devolver:            'bg-teal-100 text-teal-700',
  login:               'bg-gray-100 text-gray-600',
  logout:              'bg-gray-100 text-gray-600',
  dar_de_baja:         'bg-red-100 text-red-700',
  exportar:            'bg-yellow-100 text-yellow-700',
  mantenimiento_inicio:'bg-orange-100 text-orange-700',
  mantenimiento_fin:   'bg-emerald-100 text-emerald-700',
};

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [filtros,   setFiltros]   = useState({ entidad: '', accion: '' });

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auditoria', {
        params: { ...filtros, limit: 20, offset: (page - 1) * 20 }
      });
      setRegistros(data.registros);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [page, filtros]);

  const paginas = Math.ceil(total / 20);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={22} /> Auditoría del Sistema
          </h1>
          <p className="text-gray-500 text-sm">{total} eventos registrados</p>
        </div>
        <button onClick={cargar} className="btn-secondary">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <select className="input w-44"
          value={filtros.entidad}
          onChange={e => setFiltros(f => ({ ...f, entidad: e.target.value }))}>
          <option value="">Todas las entidades</option>
          {['activos','prestamos','mantenimientos','usuarios'].map(e =>
            <option key={e} value={e}>{e}</option>
          )}
        </select>
        <select className="input w-44"
          value={filtros.accion}
          onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))}>
          <option value="">Todas las acciones</option>
          {['crear','editar','eliminar','prestar','devolver','login','logout','exportar','dar_de_baja'].map(a =>
            <option key={a} value={a}>{a}</option>
          )}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha y hora</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Entidad</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono text-xs">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500">
                  {new Date(r.created_at).toLocaleString('es-MX')}
                </td>
                <td className="px-4 py-2.5 font-sans font-medium text-gray-800">
                  {r.usuario_nombre || <span className="text-gray-400">Sistema</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${ACCION_BADGE[r.accion] || 'bg-gray-100 text-gray-600'}`}>
                    {r.accion}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.entidad}</td>
                <td className="px-4 py-2.5 text-gray-400">{r.entidad_id || '—'}</td>
                <td className="px-4 py-2.5 text-gray-400">{r.ip_origen || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">
                  {r.detalle ? JSON.stringify(r.detalle).substring(0, 60) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginas > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm">
            <span className="text-gray-500">Página {page} de {paginas}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Anterior</button>
              <button disabled={page >= paginas} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
