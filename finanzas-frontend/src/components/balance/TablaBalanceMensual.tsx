import { formatearMoneda, obtenerFechaHoyEsp } from '../../utils/formatters';
import type { ResumenMesBalance } from '../../types';

type Props = { 
  mesesNombres: string[]; 
  resumenMensual: ResumenMesBalance[]; 
  totalIngresos: number; 
  totalGastos: number; 
  totalBalance: number;
  anioSeleccionado: number; // NUEVA PROP
};

export default function TablaBalanceMensual({ mesesNombres, resumenMensual, totalIngresos, totalGastos, totalBalance, anioSeleccionado }: Props) {
  
  // Cálculo inteligente de los meses válidos para la media
  const [anioHoyStr, mesHoyStr] = obtenerFechaHoyEsp().split('-');
  const currentYear = Number(anioHoyStr);
  const currentMonth = Number(mesHoyStr); // 1 a 12
  
  // Si es un año pasado dividimos entre 12. Si es el actual, entre los meses que llevamos.
  const divisorMedia = anioSeleccionado < currentYear ? 12 : anioSeleccionado > currentYear ? 1 : currentMonth;

  // Calculamos las medias
  const mediaIngresos = divisorMedia > 0 ? totalIngresos / divisorMedia : 0;
  const mediaGastos = divisorMedia > 0 ? totalGastos / divisorMedia : 0;
  const mediaBalance = divisorMedia > 0 ? totalBalance / divisorMedia : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-blue-500/30 rounded-2xl shadow-sm overflow-hidden w-full">
      <div className="p-5 border-b border-slate-200 dark:border-blue-500/30 bg-slate-50/50 dark:bg-neutral-900/50">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Balance Mes a Mes</h2>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-neutral-900/20 border-b border-slate-200 dark:border-blue-500/30">
              <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50/90 dark:bg-neutral-900/90 backdrop-blur z-10 whitespace-nowrap">Métrica</th>
              {mesesNombres.map(mes => <th key={mes} className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">{mes}</th>)}
              
              {/* NUEVA COLUMNA DE MEDIA */}
              <th className="p-4 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-right bg-blue-50/30 dark:bg-blue-900/10 whitespace-nowrap">Media/Mes</th>
              
              <th className="p-4 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider text-right bg-slate-100 dark:bg-neutral-800/50 whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-blue-500/20">
            <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/20 transition-colors">
              <td className="p-4 text-sm font-semibold text-emerald-600 dark:text-emerald-500 sticky left-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10 whitespace-nowrap">Ingresos</td>
              {resumenMensual.map(m => <td key={`ing-${m.mes}`} className="p-4 text-sm text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatearMoneda(m.ingresos)} €</td>)}
              
              {/* CELDA DE MEDIA DE INGRESOS */}
              <td className="p-4 text-sm text-right font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 whitespace-nowrap">{formatearMoneda(mediaIngresos)} €</td>
              
              <td className="p-4 text-sm text-right font-bold text-emerald-600 dark:text-emerald-500 bg-slate-50 dark:bg-neutral-800/30 whitespace-nowrap">{formatearMoneda(totalIngresos)} €</td>
            </tr>
            <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/20 transition-colors">
              <td className="p-4 text-sm font-semibold text-red-600 dark:text-red-500 sticky left-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10 whitespace-nowrap">Gastos</td>
              {resumenMensual.map(m => <td key={`gas-${m.mes}`} className="p-4 text-sm text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatearMoneda(m.gastos)} €</td>)}
              
              {/* CELDA DE MEDIA DE GASTOS */}
              <td className="p-4 text-sm text-right font-semibold text-red-600 dark:text-red-500 bg-red-50/30 dark:bg-red-900/10 whitespace-nowrap">{formatearMoneda(mediaGastos)} €</td>
              
              <td className="p-4 text-sm text-right font-bold text-red-600 dark:text-red-500 bg-slate-50 dark:bg-neutral-800/30 whitespace-nowrap">{formatearMoneda(totalGastos)} €</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-blue-500/30 bg-slate-50 dark:bg-neutral-900/40">
              <td className="p-4 text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider sticky left-0 bg-slate-50/90 dark:bg-neutral-900/90 backdrop-blur z-10 whitespace-nowrap">Balance</td>
              {resumenMensual.map(m => (
                <td key={`bal-${m.mes}`} className={`p-4 text-sm text-right font-bold whitespace-nowrap ${m.balance > 0 ? 'text-blue-600 dark:text-blue-400' : m.balance < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {m.balance > 0 ? '+' : ''}{formatearMoneda(m.balance)} €
                </td>
              ))}
              
              {/* CELDA DE MEDIA DE BALANCE */}
              <td className={`p-4 text-sm text-right font-bold whitespace-nowrap bg-blue-50/30 dark:bg-blue-900/10 ${mediaBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                {mediaBalance > 0 ? '+' : ''}{formatearMoneda(mediaBalance)} €
              </td>
              
              <td className={`p-4 text-base text-right font-black whitespace-nowrap bg-blue-50/50 dark:bg-blue-900/20 ${totalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                {totalBalance > 0 ? '+' : ''}{formatearMoneda(totalBalance)} €
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}