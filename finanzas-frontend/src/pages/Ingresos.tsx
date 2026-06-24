import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Search, Filter, X } from 'lucide-react';
import { useTransacciones } from '../hooks/useTransacciones';
import { formatearMoneda } from '../utils/formatters';
import SelectorMesAno from '../components/operaciones/SelectorMesAno';
import ModalTransaccion from '../components/operaciones/ModalTransaccion';
import ModalConfirmacion from '../components/general/ModalConfirmacion';
import VistaMensualOperaciones from '../components/operaciones/VistaMensualOperaciones';
import VistaAnualOperaciones from '../components/operaciones/VistaAnualOperaciones';

export default function Ingresos() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [vista, setVista] = useState<'MENSUAL' | 'ANUAL'>('MENSUAL');
  
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [catSeleccionadas, setCatSeleccionadas] = useState<string[]>([]);
  const [ctaSeleccionadas, setCtaSeleccionadas] = useState<string[]>([]);

  const { transaccionesAnuales, transacciones, fetchTransacciones, togglePendiente, eliminarTransaccion } = useTransacciones('INGRESO', month, year);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [transaccionAEditar, setTransaccionAEditar] = useState<any>(null);
  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);

  useEffect(() => {
    if (vista === 'ANUAL' && busquedaInput !== '') {
      setBusquedaInput('');
      setBusquedaActiva('');
      fetchTransacciones('');
    }
  }, [vista, fetchTransacciones, busquedaInput]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setBusquedaActiva(busquedaInput);
      fetchTransacciones(busquedaInput);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [busquedaInput, fetchTransacciones]);

  const limpiarBusqueda = () => setBusquedaInput('');

  const tAnualesFiltradas = useMemo(() => {
    return transaccionesAnuales.filter(t => 
      (catSeleccionadas.length === 0 || catSeleccionadas.includes(t.categoria)) &&
      (ctaSeleccionadas.length === 0 || ctaSeleccionadas.includes(t.cuenta))
    );
  }, [transaccionesAnuales, catSeleccionadas, ctaSeleccionadas]);

  const tMensualesFiltradas = useMemo(() => {
    return transacciones.filter(t => 
      (catSeleccionadas.length === 0 || catSeleccionadas.includes(t.categoria)) &&
      (ctaSeleccionadas.length === 0 || ctaSeleccionadas.includes(t.cuenta))
    );
  }, [transacciones, catSeleccionadas, ctaSeleccionadas]);

  const categoriasUnicas = useMemo(() => Array.from(new Set(transaccionesAnuales.map(t => t.categoria))), [transaccionesAnuales]);
  const cuentasUnicas = useMemo(() => Array.from(new Set(transaccionesAnuales.map(t => t.cuenta))), [transaccionesAnuales]);

  const toggleArray = (arr: string[], val: string, setArr: any) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const divisorMedia = year < currentYear ? 12 : year > currentYear ? 1 : currentMonth;

  const realesMes = tMensualesFiltradas.filter(t => !t.pendiente).reduce((a, b) => a + b.cantidad, 0);
  const totalesMes = tMensualesFiltradas.reduce((a, b) => a + b.cantidad, 0);
  const realesAnual = tAnualesFiltradas.filter(t => !t.pendiente).reduce((a, b) => a + b.cantidad, 0);
  const totalesAnual = tAnualesFiltradas.reduce((a, b) => a + b.cantidad, 0);

  const categoriasStats = useMemo(() => {
    const agrupado: Record<string, { nombre: string, color: string, totalAnual: number, totalMes: number }> = {};
    tAnualesFiltradas.filter(t => !t.pendiente).forEach(t => {
      if (!agrupado[t.categoria]) { agrupado[t.categoria] = { nombre: t.categoria, color: t.color_categoria || '#10b981', totalAnual: 0, totalMes: 0 }; }
      agrupado[t.categoria].totalAnual += t.cantidad;
    });
    tMensualesFiltradas.filter(t => !t.pendiente).forEach(t => {
      if (agrupado[t.categoria]) { agrupado[t.categoria].totalMes += t.cantidad; }
    });
    return Object.values(agrupado).map(c => {
      const media = c.totalAnual / divisorMedia;
      const evolucion = media > 0 ? ((c.totalMes - media) / media) * 100 : 0;
      return { ...c, media, evolucion };
    }).sort((a, b) => b.totalMes - a.totalMes);
  }, [tAnualesFiltradas, tMensualesFiltradas, divisorMedia]);

  const sankeyMes = useMemo(() => {
    const cats = categoriasStats.filter(c => c.totalMes > 0);
    if(cats.length === 0) return null;
    return { nodes: [ ...cats.map(c => ({ name: c.nombre, fill: c.color })), { name: `Ingresos`, fill: '#10b981' } ], links: cats.map((c, i) => ({ source: i, target: cats.length, value: c.totalMes })) };
  }, [categoriasStats]);

  const sankeyAnual = useMemo(() => {
    const cats = categoriasStats.filter(c => c.totalAnual > 0);
    if(cats.length === 0) return null;
    return { nodes: [ ...cats.map(c => ({ name: c.nombre, fill: c.color })), { name: `Ingresos`, fill: '#10b981' } ], links: cats.map((c, i) => ({ source: i, target: cats.length, value: c.totalAnual })) };
  }, [categoriasStats]);

  const barrasMesAMes = useMemo(() => {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses.map((m, i) => {
      const datosDelMes: any = { mes: m };
      tAnualesFiltradas
        .filter(t => !t.pendiente && parseInt(t.fecha.split('-')[1]) === i + 1)
        .forEach(t => {
          if (!datosDelMes[t.categoria]) datosDelMes[t.categoria] = 0;
          datosDelMes[t.categoria] += t.cantidad;
        });
      return datosDelMes;
    });
  }, [tAnualesFiltradas]);

  const barrasMediaCategorias = useMemo(() => [...categoriasStats].sort((a, b) => b.media - a.media).map(c => ({ categoria: c.nombre, Media: Math.round(c.media), fill: c.color })), [categoriasStats]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-900/40 dark:to-teal-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50 flex-shrink-0">
            <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Mis Ingresos</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Gestión, evolución y análisis de capital</p>
          </div>
        </div>

        {/* CAMBIO: flex-row flex-nowrap justify-between para asegurar misma línea en móvil */}
        <div className="flex flex-row items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
          <SelectorMesAno month={month} year={year} setMonth={setMonth} setYear={setYear} modoAnual={vista === 'ANUAL'} tipo="INGRESO" />
          
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className={`h-11 px-3 rounded-xl border shadow-sm transition-all flex-shrink-0 flex items-center justify-center ${mostrarFiltros || catSeleccionadas.length > 0 || ctaSeleccionadas.length > 0 || busquedaActiva !== '' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-600' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-800 dark:text-white">Filtros Activos</h3>
            <button onClick={() => { setCatSeleccionadas([]); setCtaSeleccionadas([]); setBusquedaInput(''); setBusquedaActiva(''); }} className="text-xs font-bold text-neutral-400 hover:text-red-500">Limpiar Todos</button>
          </div>
          <div className="space-y-4">
            
            {/* Buscador Integrado */}
            {vista !== 'ANUAL' && (
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Búsqueda Global</p>
                <div className="flex items-center bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden h-11 w-full transition-all focus-within:ring-2 ring-emerald-500/50">
                  <div className="pl-3 text-neutral-400"><Search size={16} /></div>
                  <input type="text" placeholder="Buscar concepto o importe..." value={busquedaInput} onChange={(e) => setBusquedaInput(e.target.value)} className="w-full px-2 py-2 bg-transparent text-sm outline-none dark:text-white" />
                  {busquedaInput && <button onClick={limpiarBusqueda} className="px-3 text-neutral-400 hover:text-red-500"><X size={16} /></button>}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Categorías</p>
              <div className="flex flex-wrap gap-2">
                {categoriasUnicas.map(cat => (
                  <button key={cat} onClick={() => toggleArray(catSeleccionadas, cat, setCatSeleccionadas)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${catSeleccionadas.includes(cat) ? 'bg-emerald-500 text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{cat}</button>
                ))}
                {categoriasUnicas.length === 0 && <span className="text-xs text-neutral-400">Sin datos</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Cuentas Bancarias</p>
              <div className="flex flex-wrap gap-2">
                {cuentasUnicas.map(cta => (
                  <button key={cta} onClick={() => toggleArray(ctaSeleccionadas, cta, setCtaSeleccionadas)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${ctaSeleccionadas.includes(cta) ? 'bg-emerald-500 text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{cta}</button>
                ))}
                {cuentasUnicas.length === 0 && <span className="text-xs text-neutral-400">Sin datos</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800">
        <button onClick={() => setVista('MENSUAL')} className={`pb-3 text-sm font-bold transition-all relative ${vista === 'MENSUAL' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
          Vista Mensual
          {vista === 'MENSUAL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>}
        </button>
        <button onClick={() => setVista('ANUAL')} className={`pb-3 text-sm font-bold transition-all relative ${vista === 'ANUAL' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
          Vista Anual
          {vista === 'ANUAL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-emerald-500/30 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Ingreso Real Percibido</p><p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{formatearMoneda(vista === 'MENSUAL' ? realesMes : realesAnual)} €</p></div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-emerald-500/30 rounded-2xl p-6 shadow-sm flex items-center justify-between opacity-80">
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total (Inc. Pendientes)</p><p className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">{formatearMoneda(vista === 'MENSUAL' ? totalesMes : totalesAnual)} €</p></div>
        </div>
      </div>

      {vista === 'MENSUAL' ? (
        <VistaMensualOperaciones 
          categoriasStats={categoriasStats} 
          transacciones={tMensualesFiltradas} 
          sankeyMes={sankeyMes} 
          onEdit={(t) => { setTransaccionAEditar(t); setModalAbierto(true); }} 
          onDelete={setIdAEliminar} 
          onTogglePendiente={(id) => togglePendiente(id, busquedaActiva)}
          tipo="INGRESO"
          isSearching={busquedaActiva !== ''}
        />
      ) : (
        <VistaAnualOperaciones 
          barrasMesAMes={barrasMesAMes} 
          barrasMediaCategorias={barrasMediaCategorias} 
          sankeyAnual={sankeyAnual} 
          year={year} 
          tipo="INGRESO"
          categorias={categoriasStats.map(c => ({ nombre: c.nombre, color: c.color }))} 
        />
      )}

      <ModalTransaccion isOpen={modalAbierto} onClose={() => { setModalAbierto(false); setTransaccionAEditar(null); }} onSuccess={fetchTransacciones} transaccionAEditar={transaccionAEditar} tipoInicial="INGRESO" />
      <ModalConfirmacion 
        isOpen={!!idAEliminar} 
        onClose={() => setIdAEliminar(null)} 
        onConfirm={() => { 
          if(idAEliminar) eliminarTransaccion(idAEliminar, busquedaActiva); 
          setIdAEliminar(null); 
        }} 
        mensaje={`¿Estás seguro de que deseas eliminar este registro?`} 
      />

    </div>
  );
}