import { useEffect, useState, useRef } from 'react';
import { Activity, RefreshCw, Pause, Play, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const LEVEL_STYLE = {
  error: { bg: 'bg-red-50',     text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icon: <AlertCircle size={13} /> },
  warn:  { bg: 'bg-yellow-50',  text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={13} /> },
  info:  { bg: 'bg-blue-50',    text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icon: <Info size={13} /> },
  http:  { bg: 'bg-gray-50',    text: 'text-gray-600',   badge: 'bg-gray-100 text-gray-600',   icon: <Activity size={13} /> },
};

export default function LogsPage() {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filtroLevel, setFiltroLevel] = useState('');
  const [busqueda,   setBusqueda]   = useState('');
  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  const cargar = async () => {
    try {
      const { data } = await api.get('/logs');
      setLogs(data.logs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    cargar();
  }, []);

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(cargar, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const logsFiltrados = logs.filter(l => {
    const matchLevel  = !filtroLevel || l.level === filtroLevel;
    const matchSearch = !busqueda    || JSON.stringify(l).toLowerCase().includes(busqueda.toLowerCase());
    return matchLevel && matchSearch;
  });

  const contadores = {
    error: logs.filter(l => l.level === 'error').length,
    warn:  logs.filter(l => l.level === 'warn').length,
    info:  logs.filter(l => l.level === 'info').length,
  };

  const formatLog = (log) => {
    if (typeof log === 'string') return { message: log, level: 'info' };
    return log;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity size={22} /> Logs del Sistema
          </h1>
          <p className="text-gray-500 text-sm">Últimas 100 entradas del log centralizado</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="btn-secondary">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={autoRefresh ? 'btn-danger' : 'btn-primary'}>
            {autoRefresh ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Auto-refresh</>}
          </button>
        </div>
      </div>

      {/* Indicador de auto-refresh */}
      {autoRefresh && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Actualizando automáticamente cada 5 segundos...
        </div>
      )}

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Errores', count: contadores.error, style: 'bg-red-50 border-red-200 text-red-700', icon: <AlertCircle size={18} /> },
          { label: 'Alertas', count: contadores.warn,  style: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: <AlertTriangle size={18} /> },
          { label: 'Info',    count: contadores.info,  style: 'bg-blue-50 border-blue-200 text-blue-700', icon: <Info size={18} /> },
        ].map(c => (
          <div key={c.label} className={`card p-4 border ${c.style} flex items-center gap-3`}>
            {c.icon}
            <div>
              <p className="text-xs opacity-70">{c.label}</p>
              <p className="text-2xl font-bold">{c.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex gap-3 flex-wrap items-center">
        <div className="flex gap-2">
          {['', 'error', 'warn', 'info'].map(l => (
            <button key={l}
              onClick={() => setFiltroLevel(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filtroLevel === l
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {l === '' ? 'Todos' : l.toUpperCase()}
            </button>
          ))}
        </div>
        <input className="input flex-1 min-w-48 text-xs"
          placeholder="Buscar en logs..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)} />
        <span className="text-xs text-gray-400">{logsFiltrados.length} entradas</span>
      </div>

      {/* Visor de logs */}
      <div ref={containerRef}
        className="card bg-gray-900 text-gray-100 font-mono text-xs overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-gray-400 text-xs">labtrack-api — app.log</span>
        </div>

        <div className="max-h-[500px] overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div className="text-gray-400 text-center py-8">Cargando logs...</div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No hay entradas que coincidan</div>
          ) : logsFiltrados.map((rawLog, i) => {
            const log = formatLog(rawLog);
            const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
            const timestamp = log.timestamp || '';
            const message   = log.message   || JSON.stringify(log);
            const meta = { ...log };
            delete meta.timestamp; delete meta.message; delete meta.level; delete meta.service;

            return (
              <div key={i}
                className={`flex gap-3 p-2 rounded text-[11px] leading-relaxed
                  ${log.level === 'error' ? 'bg-red-900/30 border-l-2 border-red-500'
                  : log.level === 'warn'  ? 'bg-yellow-900/20 border-l-2 border-yellow-500'
                  : 'hover:bg-gray-800/50'}`}>
                <span className="text-gray-500 flex-shrink-0 w-40">{timestamp}</span>
                <span className={`font-bold uppercase w-10 flex-shrink-0
                  ${log.level === 'error' ? 'text-red-400'
                  : log.level === 'warn'  ? 'text-yellow-400'
                  : 'text-green-400'}`}>
                  {log.level}
                </span>
                <span className="text-gray-200 flex-1">{message}</span>
                {Object.keys(meta).length > 0 && (
                  <span className="text-gray-500 text-[10px] flex-shrink-0 max-w-[200px] truncate">
                    {JSON.stringify(meta)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
