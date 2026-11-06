import { useState, useRef } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatearMoneda, redondearMoneda } from '../../utils/formatters';

type TipoDuracion = 'ANIOS' | 'MESES';
type TipoAportacion = 'MENSUAL' | 'ANUAL';
type TipoTasa = 'ANUAL' | 'MENSUAL';

interface PuntoGraficaProyeccion {
  periodo: number;
  aportado: number;
  intereses: number;
  total: number;
}

interface ResultadoProyeccion {
  datosGrafica: PuntoGraficaProyeccion[];
  totalAportado: number;
  interesesGenerados: number;
  capitalFinal: number;
}

export default function CalculadoraInteresCompuesto() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [capitalInicial, setCapitalInicial] = useState<number>(1000);
  const [duracion, setDuracion] = useState<number>(10);
  const [tipoDuracion, setTipoDuracion] = useState<TipoDuracion>('ANIOS');
  const [aportacion, setAportacion] = useState<number>(200);
  const [tipoAportacion, setTipoAportacion] = useState<TipoAportacion>('MENSUAL');
  const [tasaInteres, setTasaInteres] = useState<number>(7);
  const [tipoTasa, setTipoTasa] = useState<TipoTasa>('ANUAL');

  const [proyeccion, setProyeccion] = useState<ResultadoProyeccion | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calcularProyeccion = () => {

    const r = tasaInteres / 100;
    // Tasa equivalente compuesta mensual: (1 + r)^(1/12) - 1
    const i = tipoTasa === 'ANUAL' ? Math.pow(1 + r, 1 / 12) - 1 : r;
    const mesesTotales = tipoDuracion === 'ANIOS' ? duracion * 12 : duracion;

    let saldo = capitalInicial;
    let totalAportado = capitalInicial;
    const datosGrafica: PuntoGraficaProyeccion[] = [];

    datosGrafica.push({
      periodo: 0,
      aportado: redondearMoneda(totalAportado),
      intereses: 0,
      total: redondearMoneda(saldo),
    });

    for (let m = 1; m <= mesesTotales; m++) {
      // 1. Sumar aportación según toque
      let aportacionEsteMes = 0;
      if (tipoAportacion === 'MENSUAL') {
        aportacionEsteMes = aportacion;
      } else if (tipoAportacion === 'ANUAL' && m % 12 === 0) {
        aportacionEsteMes = aportacion;
      }
      
      saldo += aportacionEsteMes;
      totalAportado += aportacionEsteMes;

      // 2. Aplicar interés compuesto mensual
      saldo = saldo * (1 + i);

      // 3. Guardar puntos para gráfica redondeados al final del periodo
      const intereses = saldo - totalAportado;
      
      if (tipoDuracion === 'ANIOS' && m % 12 === 0) {
        datosGrafica.push({
          periodo: m / 12,
          aportado: redondearMoneda(totalAportado),
          intereses: redondearMoneda(intereses),
          total: redondearMoneda(saldo),
        });
      } else if (tipoDuracion === 'MESES') {
        datosGrafica.push({
          periodo: m,
          aportado: redondearMoneda(totalAportado),
          intereses: redondearMoneda(intereses),
          total: redondearMoneda(saldo),
        });
      }
    }

    setProyeccion({
      datosGrafica,
      totalAportado: redondearMoneda(totalAportado),
      interesesGenerados: redondearMoneda(saldo - totalAportado),
      capitalFinal: redondearMoneda(saldo),
    });

    setTimeout(() => { containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden mt-8 transition-all duration-300" ref={containerRef}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-6 py-5 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/20 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Calculator size={20} /></div>
          <div className="text-left">
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Calculadora de Interés Compuesto</h3>
            <p className="text-xs text-neutral-500">Proyecta el crecimiento de tu dinero a largo plazo</p>
          </div>
        </div>
        <div className="text-neutral-400">{isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
      </button>

      {isExpanded && (
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Cantidad Inicial (€)</label>
            <input type="number" value={capitalInicial} onChange={(e) => setCapitalInicial(Number(e.target.value))} className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" /></div>
            
            <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Duración</label>
            <div className="flex gap-2">
                <input type="number" value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                <select value={tipoDuracion} onChange={(e) => setTipoDuracion(e.target.value === 'MESES' ? 'MESES' : 'ANIOS')} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="ANIOS">Años</option><option value="MESES">Meses</option></select>
            </div></div>

            <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Aportación Periódica (€)</label>
            <div className="flex gap-2">
                <input type="number" value={aportacion} onChange={(e) => setAportacion(Number(e.target.value))} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                <select value={tipoAportacion} onChange={(e) => setTipoAportacion(e.target.value === 'ANUAL' ? 'ANUAL' : 'MENSUAL')} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="MENSUAL">Mensual</option><option value="ANUAL">Anual</option></select>
            </div></div>

            <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Tasa de Interés (%)</label>
            <div className="flex gap-2">
                <input type="number" step="0.01" value={tasaInteres} onChange={(e) => setTasaInteres(Number(e.target.value))} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                <select value={tipoTasa} onChange={(e) => setTipoTasa(e.target.value === 'MENSUAL' ? 'MENSUAL' : 'ANUAL')} className="w-1/2 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50"><option value="ANUAL">Anual</option><option value="MENSUAL">Mensual</option></select>
            </div></div>
          </div>

          <button onClick={calcularProyeccion} className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all">Proyectar Crecimiento</button>

          {proyeccion && (
            <div className="mt-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"><p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Aportado</p><p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatearMoneda(proyeccion.totalAportado)} €</p></div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"><p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Intereses Generados</p><p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">+{formatearMoneda(proyeccion.interesesGenerados)} €</p></div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-4 rounded-xl shadow-lg text-white"><p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Capital Final</p><p className="text-3xl font-black drop-shadow-md">{formatearMoneda(proyeccion.capitalFinal)} €</p></div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={proyeccion.datosGrafica} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:stroke-neutral-800" />
                    <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(v) => `${tipoDuracion === 'ANIOS' ? 'Año' : 'Mes'} ${v}`} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val) => `${val}€`} />
                    <Tooltip formatter={(value, name) => [`${formatearMoneda(Number(value ?? 0))} €`, name === 'aportado' || name === 'Capital Aportado' ? 'Capital Aportado' : 'Intereses Ganados']} labelFormatter={(label) => `${tipoDuracion === 'ANIOS' ? 'Año' : 'Mes'} ${label}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="aportado" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} name="Capital Aportado" />
                    <Bar dataKey="intereses" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Intereses Ganados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}