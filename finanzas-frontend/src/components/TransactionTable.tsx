import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, X, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { formatearMoneda } from '../utils/formatters';

export type Column = { 
  key: string; 
  label: string; 
  sortable?: boolean; 
  filterable?: boolean; 
};

type TableProps = { 
  columns: Column[]; 
  data: any[];
  colorTheme?: 'red' | 'emerald' | 'blue' | 'amber' | 'purple';
  categoriasDisponibles?: string[]; 
  cuentasDisponibles?: string[];
  usarPendientes?: boolean; // <-- AÑADIDO
  onGlobalSearch?: (term: string) => void;
  onEdit?: (row: any) => void;   
  onDelete?: (id: string) => void; 
  onActivar?: (id: string) => void; // <-- AÑADIDO
};

const formatearFechaLarga = (fechaStr: string) => {
  if (!fechaStr) return '';
  const [anio, mes, dia] = fechaStr.split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${parseInt(dia)} ${meses[parseInt(mes) - 1]} ${anio}`;
};

export default function TransactionTable({ columns, data, colorTheme, categoriasDisponibles, cuentasDisponibles, usarPendientes = false, onGlobalSearch, onEdit, onDelete, onActivar }: TableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'fecha', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onGlobalSearch) onGlobalSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onGlobalSearch]);

  const themeStyles = {
    red: { bg: 'bg-red-50/80 dark:bg-red-900/20', row: 'even:bg-red-50/40 dark:even:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-900/40', footer: 'bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/60' },
    emerald: { bg: 'bg-emerald-50/80 dark:bg-emerald-900/20', row: 'even:bg-emerald-50/40 dark:even:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40', footer: 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60' },
    blue: { bg: 'bg-blue-50/80 dark:bg-blue-900/20', row: 'even:bg-blue-50/40 dark:even:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/40', footer: 'bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/60' },
    amber: { bg: 'bg-amber-50/80 dark:bg-amber-900/20', row: 'even:bg-amber-50/40 dark:even:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/40', footer: 'bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/60' },
    purple: { bg: 'bg-purple-50/80 dark:bg-purple-900/20', row: 'even:bg-purple-50/40 dark:even:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40', footer: 'bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/60' }
  };

  const currentTheme = colorTheme ? themeStyles[colorTheme] : { bg: 'bg-slate-50/50 dark:bg-slate-900/20', row: 'even:bg-slate-50/50 dark:even:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-800/50', footer: 'bg-slate-100/80 dark:bg-slate-900/40 text-slate-900 dark:text-white border-slate-200' };

  const opcionesFiltro = useMemo(() => {
    const opciones: Record<string, string[]> = {};
    columns.filter(c => c.filterable).forEach(col => {
      if (col.key === 'categoria' && categoriasDisponibles) opciones[col.key] = categoriasDisponibles;
      else if (col.key === 'cuenta' && cuentasDisponibles) opciones[col.key] = cuentasDisponibles;
      else opciones[col.key] = Array.from(new Set(data.map(item => String(item[col.key])))).sort();
    });
    return opciones;
  }, [data, columns, categoriasDisponibles, cuentasDisponibles]);

  const processedData = useMemo(() => {
    let result = [...data];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        String(row.categoria || '').toLowerCase().includes(term) ||
        String(row.cuenta || '').toLowerCase().includes(term) ||
        String(row.notas || '').toLowerCase().includes(term)
      );
    }

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== '') result = result.filter(row => row[key] === value);
    });

    result.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'fecha') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filtros, sortConfig, searchTerm]);

  // --- REQUISITO 2.5: DOS TOTALES EN LAS BÚSQUEDAS/FILTROS ---
  const { totalReal, totalConPendiente } = useMemo(() => {
    let real = 0;
    let conPendiente = 0;
    processedData.forEach(curr => {
      const cantidad = Number(curr.cantidad);
      conPendiente += cantidad;
      if (!curr.pendiente) {
        real += cantidad;
      }
    });
    return { totalReal: real, totalConPendiente: conPendiente };
  }, [processedData]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / itemsPerPage));
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1); 
  
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Buscador y filtros */}
      <div className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="relative w-full lg:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 py-2 bg-slate-100 dark:bg-slate-800/80 border-transparent rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-100 dark:text-white outline-none"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {columns.filter(c => c.filterable).map(col => (
            <div key={col.key} className="relative flex items-center w-full sm:w-auto">
              <Filter size={14} className="absolute left-3 text-slate-400" />
              <select
                value={filtros[col.key] || ''}
                onChange={(e) => { setFiltros({ ...filtros, [col.key]: e.target.value }); setCurrentPage(1); }}
                className="w-full sm:w-auto pl-8 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 border-transparent rounded-lg text-sm appearance-none cursor-pointer hover:bg-slate-200 focus:bg-white dark:text-white outline-none"
              >
                <option value="">Todas las {col.label.toLowerCase()}</option>
                {opcionesFiltro[col.key]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className={currentTheme.bg}>
              {/* REQUISITO 2.6.1: Encabezado del Checkbox si la función está activa */}
              {usarPendientes && <th className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-12 text-center">Estado</th>}
              
              {columns.map((col) => (
                <th key={col.key} className={`p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-900 dark:hover:text-white' : ''}`} onClick={() => col.sortable && handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortConfig.key === col.key && (sortConfig.direction === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || onActivar) && <th className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right">Acciones</th>}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={row.id || index} className={`transition-colors ${currentTheme.row} ${usarPendientes && row.pendiente ? 'opacity-70 italic bg-slate-50/30 dark:bg-slate-900/10' : ''}`}>
                  
                  {/* REQUISITO 2.6.1: Checkbox de estado de la operación */}
                  {usarPendientes && (
                    <td className="p-4 text-center">
                      {row.pendiente ? (
                        <div className="inline-flex p-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg" title="Pago/Cobro Pendiente">
                          <Clock size={16} />
                        </div>
                      ) : (
                        <div className="inline-flex p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg" title="Completado / Liquidado">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </td>
                  )}

                  {columns.map((col) => (
                    <td key={col.key} className="p-4 text-sm text-slate-700 dark:text-slate-300">
                      {col.key === 'fecha' ? (
                        formatearFechaLarga(row[col.key])
                      ) : col.key === 'amount' || col.key === 'cantidad' ? (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatearMoneda(Number(row[col.key]))} €
                        </span>
                      ) : row[col.key]}
                    </td>
                  ))}

                  {/* Acciones de la fila */}
                  {(onEdit || onDelete || onActivar) && (
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* REQUISITO 2.6.2: Acción "Activar" visible SOLO si usarPendientes es true Y la fila está pendiente */}
                      {usarPendientes && row.pendiente && onActivar && (
                        <button onClick={() => onActivar(row.id)} className="p-1.5 inline-flex text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors font-bold text-xs gap-1 items-center" title="Marcar como liquidado / Realizado">
                          <CheckCircle2 size={15} /> Activar
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="p-1.5 inline-flex text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors">
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row.id)} className="p-1.5 inline-flex text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (usarPendientes ? 2 : 1)} className="p-8 text-center text-slate-500">No se encontraron resultados</td>
              </tr>
            )}
          </tbody>

          {/* REQUISITO 2.5: DOBLE FILA DE TOTALES DINÁMICOS */}
          <tfoot>
            <tr className={`font-bold border-t-2 ${currentTheme.footer}`}>
              {usarPendientes && <td></td>}
              {columns.map((col, index) => (
                <td key={`total-real-${col.key}`} className="p-4 text-sm whitespace-nowrap">
                  {col.key === 'cantidad' || col.key === 'amount' ? (
                    <span className="text-base font-black tracking-tight">{formatearMoneda(totalReal)} €</span>
                  ) : index === 0 ? (
                    <span className="uppercase text-xs font-bold tracking-wider opacity-70">Total Real (Liquidado):</span>
                  ) : ''}
                </td>
              ))}
              <td></td>
            </tr>
            {usarPendientes && (
              <tr className="font-bold bg-amber-50/20 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-t border-amber-100 dark:border-amber-900/30">
                <td></td>
                {columns.map((col, index) => (
                  <td key={`total-pend-${col.key}`} className="p-3 text-sm whitespace-nowrap">
                    {col.key === 'cantidad' || col.key === 'amount' ? (
                      <span className="text-sm font-extrabold tracking-tight">{formatearMoneda(totalConPendiente)} €</span>
                    ) : index === 0 ? (
                      <span className="uppercase text-[11px] font-bold tracking-wider opacity-70">Total Estimado (Con Pendientes):</span>
                    ) : ''}
                  </td>
                ))}
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Paginador */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Filas:</span>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 outline-none">
            {[10, 15, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
          <div className="hidden sm:block ml-2">Mostrando {paginatedData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, processedData.length)} de {processedData.length} resultados</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronLeft size={20} /></button>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-medium">{currentPage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"><ChevronRight size={20} /></button>
        </div>
      </div>
    </div>
  );
}