import { useEffect, useState } from 'react';
import { X, Calendar, CreditCard, Repeat, ArrowDownCircle } from 'lucide-react';
import { prestamosApi } from '../../api/client';
import { formatearMoneda, redondearMoneda } from '../../utils/formatters';
import type { PagoPrestamo, Prestamo } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  prestamo: Prestamo | null;
};

export default function ModalHistorialPrestamo({ isOpen, onClose, prestamo }: Props) {
  const [pagos, setPagos] = useState<PagoPrestamo[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && prestamo) {
      setCargando(true);
      prestamosApi
        .obtenerHistorial(prestamo.id)
        .then(setPagos)
        .catch(console.error)
        .finally(() => setCargando(false));
    } else {
      setPagos([]);
    }
  }, [isOpen, prestamo]);

  if (!isOpen || !prestamo) return null;

  const pagadoTotal = redondearMoneda(Math.max(0, prestamo.cantidad_inicial - prestamo.cantidad_pendiente));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-slate-50 dark:bg-neutral-900/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Histórico de Pagos: {prestamo.nombre}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pagado: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatearMoneda(pagadoTotal)} €</span> · Pendiente:{' '}
              <span className="font-semibold text-rose-600 dark:text-rose-400">{formatearMoneda(prestamo.cantidad_pendiente)} €</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5">
          {cargando ? (
            <div className="text-center py-8 text-slate-400 text-sm">Cargando histórico...</div>
          ) : pagos.length > 0 ? (
            pagos.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3.5 rounded-xl border bg-white dark:bg-neutral-800/70 border-slate-100 dark:border-neutral-700/80 hover:border-slate-200 dark:hover:border-neutral-600 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.es_cuota_prestamo
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}
                    >
                      {p.es_cuota_prestamo ? <Repeat size={11} /> : <ArrowDownCircle size={11} />}
                      {p.es_cuota_prestamo ? 'Cuota periódica' : 'Reducción manual'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar size={12} /> {p.fecha.split('-').reverse().join('/')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <CreditCard size={12} /> {p.cuenta_nombre}
                    </span>
                  </div>
                  {p.descripcion && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{p.descripcion}</p>
                  )}
                </div>

                <div className="text-right sm:shrink-0">
                  <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                    -{formatearMoneda(p.cantidad)} €
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Aún no se han registrado pagos para este préstamo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
