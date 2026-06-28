import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Package, ArrowLeftRight, Wrench, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import api from '../services/api';

const STATUS_COLORS = {
  disponible:    '#22c55e',
  prestado:      '#3b82f6',
  mantenimiento: '#f59e0b',
  dado_de_baja:  '#ef4444',
  reservado:     '#a855f7',
};

const KPI = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Cargando dashboard...
      </div>
    </div>
  );

  const estadosData = (data?.activos?.por_estado || []).map(e => ({
    name: e.estado,
    value: parseInt(e.total),
    fill: STATUS_COLORS[e.estado] || '#6b7280',
  }));

  const categoriasData = (data?.activos?.por_categoria || []).map(c => ({
    name: c.categoria,
    total: parseInt(c.total),
  }));

  const prestamosMesData = (data?.prestamos_por_mes || []).map(m => ({
    mes: m.mes,
    total: parseInt(m.total),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Resumen del estado del laboratorio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Package}        label="Total de activos"       value={data?.activos?.total || 0}         color="bg-primary-700"  sub="en inventario" />
        <KPI icon={ArrowLeftRight}  label="Préstamos activos"      value={data?.prestamos?.activos || 0}     color="bg-blue-500"     sub="en circulación" />
        <KPI icon={AlertTriangle}   label="Préstamos vencidos"     value={data?.prestamos?.vencidos || 0}    color="bg-red-500"      sub="requieren atención" />
        <KPI icon={Wrench}          label="En mantenimiento"       value={data?.mantenimientos?.pendientes || 0} color="bg-amber-500" sub="pendientes" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de activos (Pie) */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Estado de activos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={estadosData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {estadosData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activos por categoría (Bar) */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Activos por categoría</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoriasData} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#1d4ed8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Préstamos por mes */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Préstamos — últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={prestamosMesData} margin={{ left: -10 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad reciente */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Actividad reciente</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {(data?.actividad_reciente || []).map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{a.usuario}</span>
                    {' — '}<span className="text-gray-500">{a.accion} en {a.entidad}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top activos más prestados */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> Activos más solicitados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Código</th>
                <th className="pb-2 font-medium">Nombre</th>
                <th className="pb-2 font-medium">Categoría</th>
                <th className="pb-2 font-medium text-right">Préstamos</th>
              </tr>
            </thead>
            <tbody>
              {(data?.mas_prestados || []).map((a, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 font-mono text-xs text-gray-500">{a.codigo}</td>
                  <td className="py-2 font-medium text-gray-800">{a.nombre}</td>
                  <td className="py-2 text-gray-500 capitalize">{a.categoria}</td>
                  <td className="py-2 text-right font-semibold text-primary-700">{a.total_prestamos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
