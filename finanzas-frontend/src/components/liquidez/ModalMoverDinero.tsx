import React, { useState } from 'react';
import { X, ArrowLeftRight, ArrowRight, WalletCards, Coins, Calendar } from 'lucide-react';
import { liquidezApi } from '../../api/client';
import { formatearMoneda, obtenerFechaHoyEsp, redondearMoneda } from '../../utils/formatters';
import type { CuentaLiquidez } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cuentas: CuentaLiquidez[];
};

export default function ModalMoverDinero({ isOpen, onClose, onSuccess, cuentas }: Props) {
  const [cuentaOrigenId, setCuentaOrigenId] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [fecha, setFecha] = useState(obtenerFechaHoyEsp());
  const [cantidad, setCantidad] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const origenActualId =
    cuentas.some(c => c.cuenta_id === cuentaOrigenId)
      ? cuentaOrigenId
      : (cuentas[0]?.cuenta_id ?? '');

  const cuentasDestinoDisponibles = cuentas.filter(c => c.cuenta_id !== origenActualId);

  const destinoActualId =
    cuentasDestinoDisponibles.some(c => c.cuenta_id === cuentaDestinoId)
      ? cuentaDestinoId
      : (cuentasDestinoDisponibles[0]?.cuenta_id ?? '');

  const cuentaOrigen = cuentas.find(c => c.cuenta_id === origenActualId) ?? null;
  const maximoDisponible = Math.max(0, redondearMoneda(cuentaOrigen?.saldo_calculado ?? 0));
  const cantidadNumerica = redondearMoneda(Number(cantidad));
  const cantidadInvalida =
    !cantidad ||
    Number.isNaN(cantidadNumerica) ||
    cantidadNumerica <= 0 ||
    cantidadNumerica > maximoDisponible;

  const handleClose = () => {
    setFecha(obtenerFechaHoyEsp());
    setCantidad('');
    onClose();
  };

  const handleOrigenChange = (nuevoOrigenId: string) => {
    setCuentaOrigenId(nuevoOrigenId);
    if (nuevoOrigenId === destinoActualId) {
      const otraCuenta = cuentas.find(c => c.cuenta_id !== nuevoOrigenId)?.cuenta_id ?? '';
      setCuentaDestinoId(otraCuenta);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cantidadInvalida || !origenActualId || !destinoActualId || origenActualId === destinoActualId) {
      return;
    }

    setEnviando(true);
    try {
      await liquidezApi.moverDinero({
        cuenta_origen_id: origenActualId,
        cuenta_destino_id: destinoActualId,
        fecha,
        cantidad: cantidadNumerica,
      });
      setFecha(obtenerFechaHoyEsp());
      setCantidad('');
      onSuccess();
      onClose();
    } catch {
      alert('Error al mover el dinero entre cuentas');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-blue-600 dark:text-blue-400" />
            Traspaso entre cuentas
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <WalletCards size={15} className="text-slate-400 shrink-0" />
                <span className="truncate">Origen</span>
              </label>
              <select
                required
                value={origenActualId}
                onChange={e => handleOrigenChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100"
              >
                {cuentas.map(c => (
                  <option key={c.cuenta_id} value={c.cuenta_id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="pb-2 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
              <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50">
                <ArrowRight size={16} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <WalletCards size={15} className="text-slate-400 shrink-0" />
                <span className="truncate">Destino</span>
              </label>
              <select
                required
                value={destinoActualId}
                onChange={e => setCuentaDestinoId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100"
              >
                {cuentasDestinoDisponibles.map(c => (
                  <option key={c.cuenta_id} value={c.cuenta_id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400 shrink-0" /> Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Coins size={15} className="text-slate-400 shrink-0" /> Cantidad (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={maximoDisponible}
                required
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100"
              />
              {cuentaOrigen && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Disponible: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatearMoneda(maximoDisponible)} €</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={enviando}
              className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-semibold active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || cantidadInvalida || !origenActualId || !destinoActualId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white py-2.5 rounded-xl font-semibold shadow-md active:scale-95 transition-all"
            >
              {enviando ? 'Moviendo...' : 'Mover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
