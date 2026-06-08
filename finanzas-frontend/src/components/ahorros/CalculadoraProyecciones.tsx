import { useState, useMemo, useEffect } from 'react';
import { Calculator, Calendar, CheckSquare, Square } from 'lucide-react';

export default function CalculadoraProyecciones({ metas }: { metas: any[] }) {
  // FILTRO: Nos quedamos únicamente con las metas que no están completadas ni canceladas
  const metasActivas = useMemo(() => metas.filter(m => m.ahorrado < m.objetivo), [metas]);

  const [selectedMetaIds, setSelectedMetaIds] = useState<Set<string>>(new Set());
  const [aniosSeleccionados, setAniosSeleccionados] = useState<number>(5);

  useEffect(() => {
    // Usamos metasActivas en lugar de metas
    if (metasActivas.length > 0 && selectedMetaIds.size === 0) {
      setSelectedMetaIds(new Set(metasActivas.map(m => m.id)));
    }
  }, [metasActivas]);

  const toggleMeta = (id: string) => {
    const next = new Set(selectedMetaIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMetaIds(next);
  };

  const toggleAll = () => {
    // Comparamos y alternamos basándonos en metasActivas
    if (selectedMetaIds.size === metasActivas.length) setSelectedMetaIds(new Set());
    else setSelectedMetaIds(new Set(metasActivas.map(m => m.id)));
  };

  const metasSeleccionadas = useMemo(() => metasActivas.filter(m => selectedMetaIds.has(m.id)), [metasActivas, selectedMetaIds]);

  const dineroRestante = useMemo(() => {
    return metasSeleccionadas.reduce((acc, m) => {
      const obj = Number(m.objetivo) || 0;
      const ah = Number(m.ahorrado) || 0;
      return acc + Math.max(0, obj - ah);
    }, 0);
  }, [metasSeleccionadas]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const aportacionAnualTarget = dineroRestante / aniosSeleccionados;
  const aportacionMensualTarget = aportacionAnualTarget / 12;

  const hitos = [1, 3, 5, 10, 15, 20];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 lg:p-8 mt-12">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Calculator size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Calculadora de Proyecciones</h2>
          <p className="text-sm text-neutral-500">Planifica las aportaciones necesarias para alcanzar las metas seleccionadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6 lg:col-span-1">
          
          <div>
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">¿Qué metas quieres proyectar?</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              <button onClick={toggleAll} className="w-full flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Todas las metas activas</span>
                {selectedMetaIds.size === metasActivas.length && metasActivas.length > 0 ? <CheckSquare size={18} className="text-indigo-500" /> : <Square size={18} className="text-neutral-400" />}
              </button>
              
              {/* Iteramos sobre metasActivas, ocultando las completadas */}
              {metasActivas.map(m => (
                <button key={m.id} onClick={() => toggleMeta(m.id)} className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${selectedMetaIds.has(m.id) ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: m.color || '#ccc' }}></span>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">{m.nombre}</span>
                  </div>
                  {selectedMetaIds.has(m.id) ? <CheckSquare size={18} className="text-indigo-500" /> : <Square size={18} className="text-neutral-400" />}
                </button>
              ))}
              {metasActivas.length === 0 && (
                <div className="text-xs text-neutral-500 text-center py-4">No hay metas activas disponibles.</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Calendar size={16} /> ¿En cuántos años quieres lograrlo?
            </h3>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="1" max="30" step="1" 
                value={aniosSeleccionados} 
                onChange={(e) => setAniosSeleccionados(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 min-w-[4rem] text-center">
                {aniosSeleccionados} {aniosSeleccionados === 1 ? 'año' : 'años'}
              </div>
            </div>
          </div>

        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12">
              <Calculator size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-2">
                Dinero restante a financiar: <span className="font-bold text-white ml-1 text-lg">{formatCurrency(dineroRestante)}</span>
              </p>
              <h3 className="text-xl font-bold mb-5">Si quieres conseguirlo en <span className="text-amber-300 text-2xl">{aniosSeleccionados} {aniosSeleccionados === 1 ? 'año' : 'años'}</span>, necesitas:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Aportación Anual</p>
                  <p className="text-3xl font-black">{formatCurrency(aportacionAnualTarget)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Aportación Mensual</p>
                  <p className="text-3xl font-black">{formatCurrency(aportacionMensualTarget)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase text-xs font-bold border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3.5">Tiempo Objetivo</th>
                  <th className="px-4 py-3.5 text-right">Aportación Anual</th>
                  <th className="px-4 py-3.5 text-right">Aportación Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {hitos.map(anio => {
                  const apAnual = dineroRestante / anio;
                  const apMensual = apAnual / 12;
                  const esDestacado = anio === aniosSeleccionados;
                  
                  return (
                    <tr key={anio} className={`transition-colors ${esDestacado ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300'}`}>
                      <td className={`px-4 py-3 font-semibold ${esDestacado ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                        {anio} {anio === 1 ? 'año' : 'años'} {esDestacado && <span className="text-xs font-normal ml-1">(Tu selección)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(apAnual)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(apMensual)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}