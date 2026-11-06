import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { liquidezApi } from '../../api/client';
import { formatearMoneda } from '../../utils/formatters';
import type { CuentaLiquidez, HistorialSaldo } from '../../types';

type Props = { isOpen: boolean; onClose: () => void; cuenta: CuentaLiquidez | null; };

export default function ModalHistorialSaldo({ isOpen, onClose, cuenta }: Props) {
  const [historial, setHistorial] = useState<HistorialSaldo[]>([]);

  useEffect(() => {
    if (isOpen && cuenta) {
      liquidezApi.obtenerHistorial(cuenta.cuenta_id)
        .then(data => setHistorial(data));
    }
  }, [isOpen, cuenta]);

  if (!isOpen || !cuenta) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial: {cuenta.nombre}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          {historial.length > 0 ? (
            <div className="space-y-2">
              {historial.map((h, i) => (
                <div key={h.id} className={`flex justify-between items-center p-3 rounded-xl border ${i === 0 ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                    <Calendar size={14} /> {h.fecha.split('-').reverse().join('/')}
                    {i === 0 && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">Último</span>}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{formatearMoneda(h.cantidad)} €</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No hay registros manuales en esta cuenta.</div>
          )}
        </div>
      </div>
    </div>
  );
}