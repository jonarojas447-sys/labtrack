import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Download, BarChart2, Package, ArrowLeftRight, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const STATUS_COLORS = {
  disponible:    '#22c55e',
  prestado:      '#3b82f6',
  mantenimiento: '#f59e0b',
  dado_de_baja:  '#ef4444',
};

const ReporteCard = ({ icon: Icon, titulo, descripcion, formato, color, onExportar, loading }) => (
  <div className="card p-5 flex flex-col gap-4">
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{titulo}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{descripcion}</p>
      </div>
    </div>
    <div className="flex gap-2 pt-1 border-t border-gray-100">
      {formato.includes('excel') && (
        <button
          onClick={() => onExportar('excel')}
          disabled={loading}
          className="btn-secondary flex-1 justify-center text-xs py-2">
          <FileSpreadsheet size={14} className="text-green-600" />
          {loading === 'excel' ? 'Generando...' : 'Descargar Excel'}
        </button>
      )}
      {formato.includes('pdf') && (
        <button
          onClick={() => onExportar('pdf')}
          disabled={loading}
          className="btn-secondary flex-1 justify-center text-xs py-2">
          <FileText size={14} className="text-red-500" />
          {loading === 'pdf' ? 'Generando...' : 'Descargar PDF'}
        </button>
      )}
    </div>
  </div>
);

export default function ReportesPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loadingExp, setLoadingExp] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(r => setDashboard(r.data)).catch(console.error);
  }, []);

  const exportar = async (tipo, formato) => {
    setLoadingExp(`${tipo}-${formato}`);
    try {
      const res = await api.get(`/${tipo}/exportar/${formato}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${tipo}_${new Date().toISOString().slice(0,10)}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el reporte. Intenta de nuevo.');
    } finally {
      setLoadingExp(null);
    }
  };

  const estadosData = (dashboard?.activos?.por_estado || []).map(e => ({
    name: e.estado.replace('_', ' '),
    value: parseInt(e.total),
    fill: STATUS_COLORS[e.estado] || '#6b7280',
  }));

  const categoriasData = (dashboard?.activos?.por_categoria || []).map(c => ({
    name: c.categoria,
    total: parseInt(c.total),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 size={22} /> Reportes y Exportaciones
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Genera y descarga reportes del sistema en diferentes formatos</p>
      </div>

      {/* Resumen ejecutivo */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Resumen ejecutivo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total activos',      value: dashboard?.activos?.total || 0,              icon: Package,       color: 'text-primary-700' },
            { label: 'Préstamos activos',  value: dashboard?.prestamos?.activos || 0,          icon: ArrowLeftRight, color: 'text-blue-600' },
            { label: 'Vencidos',           value: dashboard?.prestamos?.vencidos || 0,         icon: ArrowLeftRight, color: 'text-red-600' },
            { label: 'En mantenimiento',   value: dashboard?.mantenimientos?.pendientes || 0,  icon: Wrench,        color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
              <s.icon size={20} className={`mx-auto mb-2 ${s.color}`} />
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficas de resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Distribución por estado</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={estadosData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={75}
                label={({ name, value }) => `${name}: ${value}`}>
                {estadosData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Activos por categoría</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoriasData} margin={{ left: -15 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#1d4ed8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarjetas de exportación */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Download size={16} /> Exportar reportes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReporteCard
            icon={Package}
            titulo="Inventario de Activos"
            descripcion="Listado completo de todos los activos con sus estados, ubicaciones y valores."
            formato={['excel', 'pdf']}
            color="bg-primary-700"
            loading={loadingExp?.startsWith('activos') ? loadingExp.split('-')[1] : null}
            onExportar={(fmt) => exportar('activos', fmt)}
          />
          <ReporteCard
            icon={ArrowLeftRight}
            titulo="Historial de Préstamos"
            descripcion="Registro completo de préstamos y devoluciones con fechas y responsables."
            formato={['excel']}
            color="bg-blue-600"
            loading={loadingExp?.startsWith('prestamos') ? loadingExp.split('-')[1] : null}
            onExportar={(fmt) => exportar('prestamos', fmt)}
          />
          <ReporteCard
            icon={Wrench}
            titulo="Registro de Mantenimientos"
            descripcion="Historial de mantenimientos realizados, costos y técnicos asignados."
            formato={['excel']}
            color="bg-amber-500"
            loading={loadingExp?.startsWith('mantenimientos') ? loadingExp.split('-')[1] : null}
            onExportar={(fmt) => exportar('mantenimientos', fmt)}
          />
        </div>
      </div>

      {/* Top activos más prestados */}
      {dashboard?.mas_prestados?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Activos más solicitados</h3>
          <div className="space-y-3">
            {dashboard.mas_prestados.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{a.categoria} · {a.codigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary-700">{a.total_prestamos}</p>
                  <p className="text-xs text-gray-400">préstamos</p>
                </div>
                <div className="w-24 bg-gray-100 rounded-full h-2 ml-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (a.total_prestamos / (dashboard.mas_prestados[0]?.total_prestamos || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
