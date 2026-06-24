import { useState, useMemo } from 'react';
import { Pencil, Trash2, CheckCircle2, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatearMoneda, obtenerColorTextoParaFondo } from '../../utils/formatters';
import ModalConfirmacion from '../general/ModalConfirmacion';

type Props = {
  transacciones: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onTogglePendiente: (id: string) => void;
  tipo: 'GASTO' | 'INGRESO';
  colorBorderTheme: string;
};

export default function TransactionTable({ transacciones, onEdit, onDelete, onTogglePendiente, tipo, colorBorderTheme }: Props) {
  const [sortDesc, setSortDesc] = useState(true);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [idConfirmarActivacion, setIdConfirmarActivacion] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'long' })} ${d.getFullYear()}`;
  };

  const transaccionesOrdenadas = useMemo(() => {
    return [...transacciones].sort((a, b) => {
      return sortDesc ? new Date(b.fecha).getTime() - new Date(a.fecha).getTime() : new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
  }, [transacciones, sortDesc]);

  const totalPages = Math.ceil(transaccionesOrdenadas.length / perPage) || 1;
  const currentItems = transaccionesOrdenadas.slice((currentPage - 1) * perPage, currentPage * perPage);
  
  const totalFiltrado = transacciones.reduce((acc, t) => acc + t.cantidad, 0);

  const isIngreso = tipo === 'INGRESO';
  const headerBg = isIngreso ? 'dark:bg-[#07130f] bg-emerald-50' : 'dark:bg-[#1a0f0f] bg-red-50';
  const colorTextHighlight = isIngreso ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500';

  return (
    <>
      <div className={`bg-white dark:bg-[#121212] border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full transition-colors ${colorBorderTheme}`}>
        
        <div className="overflow-x-auto w-full flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            
            <thead>
              <tr className={`${headerBg} border-b border-neutral-200 dark:border-neutral-800/80`}>
                {/* <th className="p-4 w-10 text-center"></th> */}
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 cursor-pointer select-none" onClick={() => setSortDesc(!sortDesc)}>
                  <div className="flex items-center gap-1">FECHA <ChevronDown size={14} className={`transition-transform ${!sortDesc && 'rotate-180'}`}/></div>
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">CANTIDAD</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">CATEGORÍA</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">CUENTA</th>
                {isIngreso && <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">PAGADOR/ENTIDAD</th>}
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">DESCRIPCIÓN</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 text-center">ACCIONES</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {currentItems.map((t) => {
                const bgCat = t.color_categoria || '#94a3b8';
                return (
                  <tr key={t.id} className="odd:bg-transparent even:bg-neutral-50 dark:even:bg-[#161616] hover:bg-neutral-100 dark:hover:bg-[#1a1a1a] transition-colors">
                    {/* 
                    <td className="p-4 text-center">
                      {t.pendiente 
                        ? <button onClick={() => setIdConfirmarActivacion(t.id)} title="Marcar completado" className="text-amber-500 hover:scale-110 transition-transform"><Clock size={16} strokeWidth={3} /></button>
                        : <span title="Completado"><CheckCircle2 size={16} strokeWidth={3} className="text-emerald-500 mx-auto" /></span>
                      }
                    </td>
                    */}
                    <td className="p-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">{formatDate(t.fecha)}</td>
                    <td className="p-4 text-base font-bold text-neutral-900 dark:text-white">{formatearMoneda(t.cantidad)} €</td>
                    
                    {/* APLICADO CONTRASTE AUTOMÁTICO AL RECUADRO DE CATEGORÍA */}
                    <td className="p-4">
                      <span 
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm border border-black/10 inline-block truncate max-w-[150px]"
                        style={{ backgroundColor: bgCat, color: obtenerColorTextoParaFondo(bgCat) }}
                        title={t.categoria}
                      >
                        {t.categoria}
                      </span>
                    </td>
                    
                    <td className="p-4 text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">{t.cuenta}</td>
                    {isIngreso && <td className="p-4 text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">{t.campo_extra_ingreso || ''}</td>}
                    <td className="p-4 text-sm text-neutral-500 dark:text-neutral-400 min-w-[200px] max-w-[300px] whitespace-pre-wrap break-words">{t.descripcion || ''}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => onEdit(t)} className="text-neutral-400 hover:text-indigo-500 transition-colors" title="Editar"><Pencil size={16} /></button>
                        <button onClick={() => onDelete(t.id)} className="text-neutral-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentItems.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-neutral-500 text-sm">No hay resultados.</td></tr>
              )}
            </tbody>

            <tfoot className={`${headerBg} border-t border-neutral-200 dark:border-neutral-800/80`}>
              <tr>
                <td colSpan={2} className={`p-4 text-xs font-bold uppercase tracking-wider ${colorTextHighlight}`}>
                  TOTAL FILTRADO:
                </td>
                <td colSpan={isIngreso ? 6 : 5} className={`p-4 text-base font-black ${colorTextHighlight}`}>
                  {formatearMoneda(totalFiltrado)} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={`${headerBg} p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800/80`}>
          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Filas:</span>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-white dark:bg-[#202020] border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 outline-none text-neutral-800 dark:text-white">
                {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span>Mostrando {transaccionesOrdenadas.length > 0 ? (currentPage - 1) * perPage + 1 : 0} a {Math.min(currentPage * perPage, transaccionesOrdenadas.length)} de {transaccionesOrdenadas.length} resultados</span>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-[#202020] rounded-lg px-2 py-1 border border-neutral-300 dark:border-neutral-700">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 disabled:opacity-30 hover:text-neutral-800 dark:hover:text-white text-neutral-400 transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 disabled:opacity-30 hover:text-neutral-800 dark:hover:text-white text-neutral-400 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <ModalConfirmacion 
        isOpen={!!idConfirmarActivacion} 
        onClose={() => setIdConfirmarActivacion(null)} 
        onConfirm={() => { 
          if(idConfirmarActivacion) onTogglePendiente(idConfirmarActivacion); 
          setIdConfirmarActivacion(null); 
        }} 
        mensaje="¿Estás seguro de que deseas marcar esta operación como completada?" 
      />
    </>
  );
}