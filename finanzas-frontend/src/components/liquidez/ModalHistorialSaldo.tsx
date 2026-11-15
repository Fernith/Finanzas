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

  const obtenerEstilosAccion = (accion: HistorialSaldo['accion']) => {
    switch (accion) {
      case 'agregar':
        return {
          etiqueta: 'Agregar',
          contenedor: 'bg-emerald-50/50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800/60',
          badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
          textoCantidad: 'text-emerald-600 dark:text-emerald-400',
          prefijo: '+',
        };
      case 'quitar':
        return {
          etiqueta: 'Quitar',
          contenedor: 'bg-red-50/50 dark:bg-red-900/15 border-red-200 dark:border-red-800/60',
          badge: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300',
          textoCantidad: 'text-red-600 dark:text-red-400',
          prefijo: '',
        };
      default:
        return {
          etiqueta: 'Actualizar',
          contenedor: 'bg-blue-50/50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/60',
          badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
          textoCantidad: 'text-blue-600 dark:text-blue-400',
          prefijo: '',
        };
    }
  };

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
              {historial.map((h, i) => {
                const estilos = obtenerEstilosAccion(h.accion);
                return (
                  <div key={h.id} className={`flex justify-between items-center p-3 rounded-xl border ${estilos.contenedor}`}>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                      <Calendar size={14} /> {h.fecha.split('-').reverse().join('/')}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${estilos.badge}`}>
                        {estilos.etiqueta}
                      </span>
                      {i === 0 && <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded uppercase">Último</span>}
                    </div>
                    <span className={`font-bold ${estilos.textoCantidad}`}>
                      {estilos.prefijo}{formatearMoneda(h.cantidad)} €
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No hay registros manuales en esta cuenta.</div>
          )}
        </div>
      </div>
    </div>
  );
}