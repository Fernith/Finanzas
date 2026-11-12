import React, { useState, useEffect } from 'react';
import { X, Type, Layers, Palette, CheckSquare, Folder } from 'lucide-react';
import { ajustesApi } from '../../api/client';
import { useConfig } from '../../context/ConfigContext';
import type { CatalogoItem, GrupoItem } from '../../types';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  target: 'grupos' | 'categorias' | 'cuentas';
  itemAEditar?: CatalogoItem | null;
  grupos?: GrupoItem[];
};

export default function ModalAjusteMaestro({ isOpen, onClose, onSuccess, target, itemAEditar, grupos = [] }: ModalProps) {
  const { perfil } = useConfig();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#3b82f6');
  
  const [tipoOperacionId, setTipoOperacionId] = useState('GASTO');
  const [grupoId, setGrupoId] = useState('');
  
  // INVERSION quitado por defecto al crear cuentas
  const [tiposCuenta, setTiposCuenta] = useState<string[]>(['GASTO', 'INGRESO', 'INVERSION']); 
  const [enviando, setEnviando] = useState(false);

  const gruposActivos = grupos.filter((g) => g.activo || (itemAEditar && 'grupo_id' in itemAEditar && itemAEditar.grupo_id === g.id));

  useEffect(() => {
    if (isOpen) {
      if (itemAEditar) {
        setNombre(itemAEditar.nombre);
        setColor(itemAEditar.color || '#3b82f6');
        if (target === 'categorias' && 'tipo_operacion_id' in itemAEditar) {
          setTipoOperacionId(itemAEditar.tipo_operacion_id);
          setGrupoId(itemAEditar.grupo_id || '');
        }
        if (target === 'cuentas' && 'tipos_operacion' in itemAEditar) setTiposCuenta(itemAEditar.tipos_operacion || []);
      } else {
        setNombre('');
        setColor('#3b82f6');
        setTipoOperacionId('GASTO');
        setGrupoId('');
        setTiposCuenta(['GASTO', 'INGRESO', 'INVERSION']);
      }
    }
  }, [isOpen, itemAEditar, target]);

  if (!isOpen) return null;

  const toggleTipoCuenta = (tipo: string) => {
    setTiposCuenta(prev => prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (target === 'cuentas' && tiposCuenta.length === 0) {
        alert("Una cuenta debe tener asignado al menos un tipo de operación.");
        return;
    }

    setEnviando(true);

    try {
      if (target === 'grupos') {
        const payload = { nombre: nombre.trim(), color };
        if (itemAEditar) {
          await ajustesApi.modificarGrupo(itemAEditar.id, payload);
        } else {
          await ajustesApi.crearGrupo(payload);
        }
      } else if (target === 'categorias') {
        const payload = {
          nombre: nombre.trim(),
          tipo_operacion_id: tipoOperacionId,
          grupo_id: grupoId ? grupoId : null,
          color,
        };
        if (itemAEditar) {
          await ajustesApi.modificarCategoria(itemAEditar.id, payload);
        } else {
          await ajustesApi.crearCategoria(payload);
        }
      } else {
        const payload = { nombre: nombre.trim(), tipos_operacion: tiposCuenta, color };
        if (itemAEditar) {
          await ajustesApi.modificarCuenta(itemAEditar.id, payload);
        } else {
          await ajustesApi.crearCuenta(payload);
        }
      }
      onSuccess();
      onClose();
    } catch { alert('Error al guardar.'); } finally { setEnviando(false); }
  };

  const singuloLabel = target === 'grupos' ? 'Grupo' : target === 'categorias' ? 'Categoría' : 'Cuenta';
  const mostrarColor = !(target === 'categorias' && perfil === 'Tipo A');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {itemAEditar ? `Editar ${singuloLabel}` : `Nuevo ${singuloLabel}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Type size={16} /> Nombre</label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100" />
          </div>

          {target === 'categorias' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Layers size={16} /> Tipo de Operación</label>
                <select value={tipoOperacionId} onChange={(e) => setTipoOperacionId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="GASTO">Gastos</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="INVERSION">Inversiones</option>
                </select>
              </div>

              {perfil === 'Tipo A' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Folder size={16} /> Grupo</label>
                  <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-100">
                    <option value="">Sin grupo</option>
                    {gruposActivos.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {target === 'cuentas' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><CheckSquare size={16} /> Disponible para:</label>
              <div className="flex gap-2 flex-wrap">
                {['GASTO', 'INGRESO', 'INVERSION'].map(tipo => (
                  <label key={tipo} className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${tiposCuenta.includes(tipo) ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={tiposCuenta.includes(tipo)} onChange={() => toggleTipoCuenta(tipo)} className="hidden" />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>
          )}

          {mostrarColor && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2"><Palette size={16} /> Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" disabled={enviando} className="w-full sm:w-1/2 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-md active:scale-95">{enviando ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" onClick={onClose} className="w-full sm:w-1/2 order-2 sm:order-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold active:scale-95">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}