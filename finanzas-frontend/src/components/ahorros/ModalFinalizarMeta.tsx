import React, { useState, useEffect } from 'react';
import { X, Calendar, Tags, WalletCards } from 'lucide-react';
import { ahorrosApi } from '../../api/client';
import { formatearMoneda, obtenerFechaHoyEsp } from '../../utils/formatters';
import type { MetaAhorro, OpcionesFinalizar } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meta: MetaAhorro | null;
};

export default function ModalFinalizarMeta({ isOpen, onClose, onSuccess, meta }: Props) {
  const [opciones, setOpciones] = useState<OpcionesFinalizar>({ categorias: [], cuentas: [] });
  const [fecha, setFecha] = useState(obtenerFechaHoyEsp());
  const [categoriaId, setCategoriaId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      ahorrosApi.obtenerOpcionesFinalizar()
        .then(data => {
          setOpciones(data);
          if (data.categorias[0]) setCategoriaId(data.categorias[0].id);
          if (data.cuentas[0]) setCuentaId(data.cuentas[0].id);
        });
      setFecha(obtenerFechaHoyEsp());
    }
  }, [isOpen]);

  if (!isOpen || !meta) return null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    
    try {
      await ahorrosApi.finalizarMeta(meta.id, { fecha, cuenta_id: cuentaId, categoria_id: categoriaId });
      window.dispatchEvent(new Event('actualizarTransacciones'));
      onSuccess();
      onClose();
    } catch { alert('Error al finalizar la meta'); } finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Finalizar Meta</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-xl text-xs text-center border border-blue-100 dark:border-blue-800">
            Se generará un gasto de <strong>{formatearMoneda(meta.ahorrado)} €</strong> y esta meta quedará vaciada a cero.
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Calendar size={16}/> Fecha del Gasto</label>
            <input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Tags size={16}/> Categoría (Gasto)</label>
            <select required value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100">
              {opciones.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><WalletCards size={16}/> Cuenta Bancaria</label>
            <select required value={cuentaId} onChange={e => setCuentaId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100">
              {opciones.cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-md active:scale-95 transition-all">{enviando ? 'Procesando...' : 'Confirmar'}</button>
            <button type="button" onClick={onClose} disabled={enviando} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-semibold active:scale-95 transition-all">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}