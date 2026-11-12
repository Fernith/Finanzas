import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, ArrowUpDown, Trash2 } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { formatearMoneda } from '../../utils/formatters';
import type { Activo, ActivoConTransacciones, TransaccionInversion } from '../../types';

type Props = {
  activosConTransacciones: ActivoConTransacciones[];
  onEditActivo: (activo: Activo) => void;
  onEditTransaccion: (transaccion: TransaccionInversion) => void;
  onDeleteTransaccion: (id: string) => void;
};

export default function TablaActivos({ activosConTransacciones, onEditActivo, onEditTransaccion, onDeleteTransaccion }: Props) {
  const { perfil } = useConfig();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ordenDescendente, setOrdenDescendente] = useState(true);

  const toggleExpand = (ticker: string) => {
    const next = new Set(expanded);
    if (next.has(ticker)) next.delete(ticker);
    else next.add(ticker);
    setExpanded(next);
  };

  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <th className="p-4 w-12"></th>
              <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Activo</th>
              <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Categoría</th>
              <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Total Invertido</th>
              <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {activosConTransacciones.map(activo => {
              const isExpanded = expanded.has(activo.ticker);
              const transaccionesOrdenadas = [...activo.transacciones].sort((a, b) => {
                return ordenDescendente 
                  ? new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime()
                  : new Date(a.fecha_compra).getTime() - new Date(b.fecha_compra).getTime();
              });

              return (
                <React.Fragment key={activo.ticker}>
                  {/* FILA PADRE (Activo) */}
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="p-4 text-center">
                      <button onClick={() => toggleExpand(activo.ticker)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-neutral-800 rounded-md transition-colors">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shadow-inner border border-black/10"
                          style={{ backgroundColor: perfil === 'Tipo A' ? (activo.color_grupo || '#3b82f6') : (activo.color || '#ccc') }}
                        ></span>
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">{activo.nombre}</p>
                          <p className="text-xs font-medium text-neutral-500 uppercase">{activo.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {activo.categoria_nombre || 'Sin categoría'}
                    </td>
                    <td className="p-4 text-right font-bold text-neutral-900 dark:text-white">
                      {formatearMoneda(activo.total_invertido)} €
                    </td>
                    <td className="p-4 text-right">
                      {/* ACCIÓN PADRE: Sólo editar */}
                      <button onClick={() => onEditActivo(activo)} className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Editar Activo">
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>

                  {/* FILAS HIJAS (Historial de Transacciones) */}
                  {isExpanded && (
                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/20">
                      <td colSpan={5} className="p-0 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="px-16 py-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">Historial de compras</h4>
                            <button onClick={() => setOrdenDescendente(!ordenDescendente)} className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-semibold px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-neutral-800 transition-colors">
                              <ArrowUpDown size={12} /> Ordenar por fecha
                            </button>
                          </div>
                          
                          {transaccionesOrdenadas.length === 0 ? (
                            <p className="text-sm text-neutral-400 py-2">No hay transacciones registradas para este activo.</p>
                          ) : (
                            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-neutral-100/50 dark:bg-neutral-800/50">
                                  <tr>
                                    <th className="px-4 py-2 font-semibold text-neutral-600 dark:text-neutral-300">Activo</th>
                                    <th className="px-4 py-2 font-semibold text-neutral-600 dark:text-neutral-300">Fecha</th>
                                    <th className="px-4 py-2 text-right font-semibold text-neutral-600 dark:text-neutral-300">Dinero Invertido</th>
                                    <th className="px-4 py-2 text-right font-semibold text-neutral-600 dark:text-neutral-300">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                  {transaccionesOrdenadas.map(t => (
                                    <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                                      <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">
                                        {activo.nombre} <span className="text-[10px] text-neutral-400 ml-1">({activo.ticker})</span>
                                      </td>
                                      <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{formatDate(t.fecha_compra)}</td>
                                      <td className="px-4 py-2 text-right font-medium text-neutral-800 dark:text-neutral-200">{formatearMoneda(t.euros_invertidos)} €</td>
                                      <td className="px-4 py-2 text-right space-x-1">
                                        {/* ACCIONES HIJAS: Editar y Borrar */}
                                        <button onClick={() => onEditTransaccion(t)} className="p-1.5 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors" title="Modificar compra">
                                          <Pencil size={14} />
                                        </button>
                                        <button onClick={() => onDeleteTransaccion(t.id)} className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Eliminar compra">
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {activosConTransacciones.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-neutral-400">No hay activos registrados en tu portfolio.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}