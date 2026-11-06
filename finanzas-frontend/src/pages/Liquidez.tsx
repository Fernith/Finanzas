import { useState } from 'react';
import { Link } from 'react-router';
import { Coins, RefreshCw, History, ArrowRight, ChevronLeft } from 'lucide-react';
import { formatearMoneda } from '../utils/formatters';
import type { CuentaLiquidez } from '../types';
import ModalActualizarSaldo from '../components/liquidez/ModalActualizarSaldo';
import ModalHistorialSaldo from '../components/liquidez/ModalHistorialSaldo';
import { useLiquidez } from '../hooks/useLiquidez';

export default function Liquidez() {
  const { cuentas, totalCalculado, cargarCuentas } = useLiquidez();
  
  const [modalActualizar, setModalActualizar] = useState<CuentaLiquidez | null>(null);
  const [modalHistorial, setModalHistorial] = useState<CuentaLiquidez | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-blue-500/30 pb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-500 dark:text-slate-400 rounded-xl transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/20 rounded-2xl shadow-sm border border-blue-200/50 dark:border-blue-800/50">
            <Coins className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Liquidez y Saldos</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestión manual y conciliación bancaria inteligente</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fondo Líquido Total</p>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{formatearMoneda(totalCalculado)} €</p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-blue-500/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-neutral-900/50 border-b border-slate-200 dark:border-blue-500/30">
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuenta</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Último Cuadre Manual</th>
                <th className="p-4 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50/30 dark:bg-blue-900/10">Saldo Actual Estimado</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-blue-500/20">
              {cuentas.map(c => (
                <tr key={c.cuenta_id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.color }}></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {c.fecha_actualizacion ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatearMoneda(c.ultimo_saldo_manual)} €</p>
                        <p className="text-xs text-slate-400 mt-0.5">el {c.fecha_actualizacion.split('-').reverse().join('/')}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nunca actualizado</span>
                    )}
                  </td>
                  <td className="p-4 bg-blue-50/10 dark:bg-blue-900/5">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-blue-600 dark:text-blue-400">{formatearMoneda(c.saldo_calculado)} €</p>
                      {c.saldo_calculado !== c.ultimo_saldo_manual && (
                        <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-500" title="Variación calculada">
                          <ArrowRight size={10} /> {c.saldo_calculado > c.ultimo_saldo_manual ? '+' : '-'} {formatearMoneda(Math.abs(c.saldo_calculado - c.ultimo_saldo_manual))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModalHistorial(c)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                        <History size={14}/> Historial
                      </button>
                      <button onClick={() => setModalActualizar(c)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm transition-colors">
                        <RefreshCw size={14}/> Actualizar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalActualizarSaldo isOpen={!!modalActualizar} onClose={() => setModalActualizar(null)} onSuccess={cargarCuentas} cuenta={modalActualizar} />
      <ModalHistorialSaldo isOpen={!!modalHistorial} onClose={() => setModalHistorial(null)} cuenta={modalHistorial} />
    </div>
  );
}