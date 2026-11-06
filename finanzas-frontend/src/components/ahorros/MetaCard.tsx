import { Pencil, Trash2, History, ArrowDownToLine, ArrowUpFromLine, Flag } from 'lucide-react';
import { formatearMoneda } from '../../utils/formatters';
import type { MetaAhorro } from '../../types';

type MetaCardProps = {
  meta: MetaAhorro;
  onEdit: (meta: MetaAhorro) => void;
  onDelete: (meta: MetaAhorro) => void;
  onHistory: (meta: MetaAhorro) => void;
  onAdd: (meta: MetaAhorro) => void;
  onWithdraw: (meta: MetaAhorro) => void;
  onFinish: (meta: MetaAhorro) => void;
};

export default function MetaCard({ meta, onEdit, onDelete, onHistory, onAdd, onWithdraw, onFinish }: MetaCardProps) {
  const porcentaje = Math.min(100, (meta.ahorrado / meta.objetivo) * 100);

  return (
    <div className="bg-white dark:bg-neutral-900 border rounded-2xl shadow-sm overflow-hidden flex flex-col p-5" style={{ borderColor: meta.color }}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: meta.color }}></span>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{meta.nombre}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(meta)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg"><Pencil size={15}/></button>
          <button onClick={() => onDelete(meta)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg"><Trash2 size={15}/></button>
        </div>
      </div>
      
      <div className="space-y-1 mb-6">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-700 dark:text-slate-300">Asignado: {formatearMoneda(meta.ahorrado)} €</span>
          <span className="text-slate-400">Objetivo: {formatearMoneda(meta.objetivo)} €</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden shadow-inner">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${porcentaje}%`, backgroundColor: meta.color }}></div>
        </div>
        <p className="text-right text-[10px] font-bold text-slate-400 pt-1">{porcentaje.toFixed(0)}% Completado</p>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-neutral-800">
        <button onClick={() => onHistory(meta)} className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-neutral-800 transition-colors group">
          <History size={18} className="mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Histórico</span>
        </button>
        <button onClick={() => onAdd(meta)} className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group">
          <ArrowDownToLine size={18} className="mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Añadir</span>
        </button>
        <button onClick={() => onWithdraw(meta)} className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group">
          <ArrowUpFromLine size={18} className="mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Sacar</span>
        </button>
        <button onClick={() => onFinish(meta)} className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
          <Flag size={18} className="mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Finalizar</span>
        </button>
      </div>
    </div>
  );
}