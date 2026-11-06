import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ahorrosApi } from '../../api/client';
import { redondearMoneda } from '../../utils/formatters';
import type { MetaAhorro } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  metaAEditar?: MetaAhorro | null;
};

export default function ModalMetaAhorro({ isOpen, onClose, onSuccess, metaAEditar }: Props) {
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [color, setColor] = useState('#10b981'); // Emerald
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (metaAEditar) {
        setNombre(metaAEditar.nombre);
        setObjetivo(metaAEditar.objetivo.toString());
        setColor(metaAEditar.color);
      } else {
        setNombre('');
        setObjetivo('');
        setColor('#10b981');
      }
    }
  }, [isOpen, metaAEditar]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);

    const payload = { nombre, objetivo: redondearMoneda(Number(objetivo)), color };

    try {
      if (metaAEditar) {
        await ahorrosApi.modificarMeta(metaAEditar.id, payload);
      } else {
        await ahorrosApi.crearMeta(payload);
      }
      onSuccess();
      onClose();
    } catch { alert('Error al guardar la meta de ahorro.'); } finally { setEnviando(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{metaAEditar ? 'Editar Sobre' : 'Nuevo Sobre de Ahorro'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Plus size={18} className="rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nombre de la Meta</label>
            <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Colchón de Emergencia..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Objetivo Total</label>
              <input type="number" required value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Ej: 5000" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Color Identificativo</label>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-8 bg-transparent border-0 rounded cursor-pointer shrink-0" />
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{color}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" disabled={enviando} className="w-full sm:w-1/2 order-1 sm:order-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-500/20 active:scale-95 transition-all">
              {enviando ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onClose} disabled={enviando} className="w-full sm:w-1/2 order-2 sm:order-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-semibold active:scale-95 transition-all border border-transparent">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}