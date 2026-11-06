import { X, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatearMoneda } from '../../utils/formatters';
import type { MetaAhorro } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  meta: MetaAhorro | null;
};

export default function ModalHistorialMeta({ isOpen, onClose, meta }: Props) {
  if (!isOpen || !meta) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial: {meta.nombre}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          {meta.movimientos.length > 0 ? (
            <div className="space-y-2">
              {meta.movimientos.map((m) => (
                <div key={m.id} className="flex justify-between items-center p-3 rounded-xl border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm">
                    {m.cantidad >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-red-500" />}
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="opacity-50"/> {m.fecha.split('-').reverse().join('/')}</span>
                  </div>
                  <span className={`font-bold ${m.cantidad >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {m.cantidad >= 0 ? '+' : ''}{formatearMoneda(m.cantidad)} €
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No hay movimientos registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}