import { AreaChart, Calendar, TrendingUp } from 'lucide-react';
import Acordeon from '../components/general/Acordeon';
import BalanceMetricas from '../components/balance/BalanceMetricas';
import TablaBalanceMensual from '../components/balance/TablaBalanceMensual';
import GraficoBalanceEvolutivo from '../components/balance/GraficoBalanceEvolutivo';
import TablaBalanceCategorias from '../components/balance/TablaBalanceCategorias';
import GraficoBalanceApilado from '../components/balance/GraficoBalanceApilado';
import AhorrosResumenCabecera from '../components/ahorros/AhorrosResumenCabecera';

import { useBalance } from '../hooks/useBalance';
import { useAhorros } from '../hooks/useAhorros';
import { formatearMoneda, redondearMoneda } from '../utils/formatters';

export default function Finanzas() {
  const {
    anioSeleccionado, setAnioSeleccionado, anios, mesesNombres,
    resumenMensual, tablaCategoriasGastos, tablaCategoriasIngresos, 
    totalGastosAnual, totalIngresosAnual, coloresCategorias, ordenCategorias,
    flujoNetoActual, flujoNetoAnterior, mesActualStats
  } = useBalance();

  const { resumen, totalReservadoMetas, dineroDisponibleGastar } = useAhorros();

  const crecimientoFlujo = flujoNetoAnterior !== 0 ? ((flujoNetoActual - flujoNetoAnterior) / Math.abs(flujoNetoAnterior)) * 100 : 0;
  
  const totalMesEnCurso = redondearMoneda(mesActualStats.ingresos + mesActualStats.gastos);
  const pctIngresos = totalMesEnCurso > 0 ? (mesActualStats.ingresos / totalMesEnCurso) * 100 : 50;
  const pctGastos = totalMesEnCurso > 0 ? (mesActualStats.gastos / totalMesEnCurso) * 100 : 50;

  const totalReal = redondearMoneda(resumen.dinero_liquido + resumen.dinero_invertido);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 w-[95vw] max-w-[1600px] 2xl:max-w-[1800px] relative left-1/2 -translate-x-1/2">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-indigo-500/30 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-200 dark:from-indigo-900/40 dark:to-purple-900/20 rounded-2xl shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <AreaChart className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Finanzas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Panel de control de tu patrimonio y evolución anual</p>
          </div>
        </div>

        <div className="relative flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-indigo-500/30 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/30 transition-all cursor-pointer">
          <Calendar className="text-slate-400 absolute left-4 pointer-events-none" size={20} />
          <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="w-full pl-12 pr-4 py-2 bg-transparent text-lg font-bold text-slate-800 dark:text-white outline-none cursor-pointer dark:bg-neutral-900 dark:focus:bg-neutral-900">
            {anios.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <Acordeon 
        titulo="Patrimonio Neto" 
        defaultOpen={true}
        colorBorde="border-indigo-200 dark:border-indigo-500/30"
        extraHeader={<span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatearMoneda(totalReal)} €</span>}
      >
        <div className="flex flex-col gap-6 mb-2">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
              <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Crecimiento Financiero ({anioSeleccionado})</h4>
              {flujoNetoAnterior !== 0 ? (
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-black flex items-center gap-2 ${crecimientoFlujo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {crecimientoFlujo >= 0 ? <TrendingUp size={28}/> : <TrendingUp size={28} className="rotate-180"/>} 
                    {Math.abs(crecimientoFlujo).toFixed(1)}%
                  </div>
                  <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 border-l border-neutral-300 dark:border-neutral-700 pl-4">
                    Flujo neto actual: <span className="font-bold text-neutral-800 dark:text-white">{formatearMoneda(flujoNetoActual)} €</span><br/>
                    Flujo año anterior: {formatearMoneda(flujoNetoAnterior)} €
                  </div>
                </div>
              ) : (
                <p className="text-neutral-400 font-medium italic mt-2">No hay datos del año anterior para comparar el crecimiento.</p>
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
              <div className="flex justify-between items-end mb-3">
                <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Flujo del Mes en Curso</h4>
                <span className="text-xs font-bold text-neutral-400">Total movido: {formatearMoneda(totalMesEnCurso)} €</span>
              </div>
              
              {totalMesEnCurso > 0 ? (
                <div className="space-y-2 mt-1">
                  <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner">
                    <div style={{ width: `${pctIngresos}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
                    <div style={{ width: `${pctGastos}%` }} className="bg-red-500 h-full transition-all duration-500"></div>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">Ingresos: {formatearMoneda(mesActualStats.ingresos)} €</span>
                    <span className="text-red-600 dark:text-red-400">Gastos: {formatearMoneda(mesActualStats.gastos)} €</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-5 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mt-3 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Sin movimientos aún</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            <AhorrosResumenCabecera 
              dinero_liquido={resumen.dinero_liquido}
              dinero_invertido={resumen.dinero_invertido}
              totalReservadoMetas={totalReservadoMetas}
              dineroDisponibleGastar={dineroDisponibleGastar}
            />
          </div>
        </div>
      </Acordeon>

      <Acordeon titulo="Balance General" colorBorde="border-blue-200 dark:border-blue-500/30">
        <div className="space-y-8">
          <BalanceMetricas totalIngresos={totalIngresosAnual} totalGastos={totalGastosAnual} totalBalance={flujoNetoActual} />
          <TablaBalanceMensual 
            mesesNombres={mesesNombres} 
            resumenMensual={resumenMensual} 
            totalIngresos={totalIngresosAnual} 
            totalGastos={totalGastosAnual} 
            totalBalance={flujoNetoActual} 
            anioSeleccionado={anioSeleccionado} 
          />
          <GraficoBalanceEvolutivo resumenMensual={resumenMensual} />
        </div>
      </Acordeon>

      <Acordeon titulo="Evolución de Gastos" colorBorde="border-red-200 dark:border-red-500/30">
        <div className="space-y-8">
          <TablaBalanceCategorias tablaCategorias={tablaCategoriasGastos} mesesNombres={mesesNombres} resumenMensual={resumenMensual} totalGlobal={totalGastosAnual} tipo="GASTO" />
          <GraficoBalanceApilado resumenMensual={resumenMensual} coloresCategorias={coloresCategorias} ordenCategorias={ordenCategorias} dataKeyPrefix="categoriasGastos" />
        </div>
      </Acordeon>

      <Acordeon titulo="Evolución de Ingresos" colorBorde="border-emerald-200 dark:border-emerald-500/30">
        <div className="space-y-8">
          <TablaBalanceCategorias tablaCategorias={tablaCategoriasIngresos} mesesNombres={mesesNombres} resumenMensual={resumenMensual} totalGlobal={totalIngresosAnual} tipo="INGRESO" />
          <GraficoBalanceApilado resumenMensual={resumenMensual} coloresCategorias={coloresCategorias} ordenCategorias={ordenCategorias} dataKeyPrefix="categoriasIngresos" />
        </div>
      </Acordeon>

    </div>
  );
}