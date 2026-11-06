import { Link } from 'react-router';
import { Coins, Target, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { Plus } from 'lucide-react';
import { formatearMoneda } from '../../utils/formatters';

type ResumenProps = {
  dinero_liquido: number;
  dinero_invertido: number;
  totalReservadoMetas: number;
  dineroDisponibleGastar: number;
};

export default function AhorrosResumenCabecera({ dinero_liquido, dinero_invertido, totalReservadoMetas, dineroDisponibleGastar }: ResumenProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Link to="/ahorros/liquidez" className="block bg-white dark:bg-neutral-900 border border-slate-200 dark:border-slate-500/50 p-6 rounded-2xl shadow-sm hover:ring-2 hover:ring-blue-500 hover:shadow-md transition-all group">
        <div className="flex justify-between items-start">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Coins size={14}/> Fondo Líquido Real</p>
          <div className="p-1 rounded bg-slate-100 dark:bg-neutral-800 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors"><Plus size={16}/></div>
        </div>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{formatearMoneda(dinero_liquido)} €</p>
        <span className="text-[10px] text-slate-400 block mt-1">Gestionar cuentas y balances manuales</span>
      </Link>

      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-emerald-500/50 p-6 rounded-2xl shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Target size={14} className="text-emerald-500" /> Reservado para Metas</p>
        <p className="text-2xl font-black text-emerald-500 mt-2">{formatearMoneda(totalReservadoMetas)} €</p>
        <span className="text-[10px] text-slate-400 block mt-1">Retenido virtualmente en los sobres</span>
      </div>

      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 dark:from-blue-950/30 dark:to-slate-950 border-2 border-blue-500/30 p-6 rounded-2xl shadow-md md:scale-105">
        <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse"><ShieldCheck size={14}/> Disponible para Gastar</p>
        <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{formatearMoneda(dineroDisponibleGastar)} €</p>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-1">Dinero libre para usar</span>
      </div>

      <Link to="/inversiones" className="block bg-white dark:bg-neutral-900 border border-slate-200 dark:border-amber-500/50 p-6 rounded-2xl shadow-sm hover:ring-2 hover:ring-amber-500 hover:shadow-md transition-all group">
        <div className="flex justify-between items-start">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ArrowRightLeft size={14}/> Capital Invertido</p>
          <div className="p-1 rounded bg-slate-100 dark:bg-neutral-800 text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30 transition-colors"><ArrowRightLeft size={16}/></div>
        </div>
        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{formatearMoneda(dinero_invertido)} €</p>
        <span className="text-[10px] text-slate-400 block mt-1">Ver desglose de inversiones y ETFs</span>
      </Link>
    </div>
  );
}