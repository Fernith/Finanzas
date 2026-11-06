import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import GraficoResumen from './GraficoResumen';
import TransactionTable from './TransactionTable';
import DiagramaSankey from './DiagramaSankey';
import type { CategoriaStatOperacion, SankeyData, Transaction } from '../../types';

type Props = {
  categoriasStats: CategoriaStatOperacion[];
  transacciones: Transaction[];
  sankeyMes: SankeyData | null;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onTogglePendiente: (id: string) => void;
  tipo: 'GASTO' | 'INGRESO';
  isSearching: boolean;
};

export default function VistaMensualOperaciones({ categoriasStats, transacciones, sankeyMes, onEdit, onDelete, onTogglePendiente, tipo, isSearching }: Props) {
  const datosPie = categoriasStats.filter(c => c.totalMes > 0).map(c => ({ name: c.nombre, value: c.totalMes, fill: c.color }));
  const nombreOperacion = tipo === 'GASTO' ? 'Gastos' : 'Ingresos';
  const colorBordeGeneral = tipo === 'GASTO' ? 'dark:border-red-500/30' : 'dark:border-emerald-500/30';

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      
      {!isSearching && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-2 flex flex-col">
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 uppercase tracking-wider pl-2">Rendimiento por Categoría</h3>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 dark:border-neutral-700 text-neutral-500">
                    <th className="pb-3 font-semibold px-2">Categoría</th>
                    <th className="pb-3 font-semibold text-right">Mes Actual</th>
                    <th className="pb-3 font-semibold text-right">Media Anual</th>
                    <th className="pb-3 font-semibold text-right px-2">Evolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                  {categoriasStats.map(c => {
                    const isIncrease = c.evolucion >= 0;
                    const colorEvolucion = tipo === 'INGRESO' ? (isIncrease ? 'text-emerald-500' : 'text-red-500') : (isIncrease ? 'text-red-500' : 'text-emerald-500');
                    const bgCat = c.color || '#94a3b8';
                    return (
                      <tr key={c.nombre} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-2"><span className="px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm"
                            style= {{backgroundColor: c.color, color: obtenerColorTextoParaFondo(bgCat)}}>{c.nombre}</span></td>
                        <td className="py-2.5 text-right font-bold text-neutral-800 dark:text-neutral-200">{formatearMoneda(c.totalMes)} €</td>
                        <td className="py-2.5 text-right font-medium text-neutral-500">{formatearMoneda(c.media)} €</td>
                        <td className={`py-2.5 text-right font-bold flex items-center justify-end gap-1 px-2 ${colorEvolucion}`}>
                          {isIncrease ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {Math.abs(c.evolucion).toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                  {categoriasStats.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-neutral-400">No hay datos este mes</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <DiagramaSankey data={sankeyMes} titulo={`Flujo de ${nombreOperacion} (Mes)`} mensajeVacio="No hay datos suficientes para el diagrama." colorBorderTheme={colorBordeGeneral} />
        </div>
      )}

      {isSearching && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 p-4 rounded-xl text-center text-sm font-semibold border border-indigo-200 dark:border-indigo-800/50 animate-in fade-in">
          🔍 Viendo resultados de búsqueda en todo el historial. Gráficas de rendimiento ocultadas temporalmente.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <TransactionTable transacciones={transacciones} onEdit={onEdit} onDelete={onDelete} onTogglePendiente={onTogglePendiente} tipo={tipo} colorBorderTheme={colorBordeGeneral} />
        </div>
        <div className="lg:col-span-1">
          <GraficoResumen titulo="Desglose" datosGrafico={datosPie} colorBorderTheme={colorBordeGeneral} mensajeVacio={`Sin ${nombreOperacion.toLowerCase()}`} />
        </div>
      </div>

    </div>
  );
}