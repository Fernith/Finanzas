import { Plus, Pencil, Trash2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

type Props = {
  titulo: string;
  items: any[];
  target: 'categorias' | 'cuentas';
  onAdd: (target: 'categorias' | 'cuentas') => void;
  onEdit: (target: 'categorias' | 'cuentas', item: any) => void;
  onToggleStatus: (target: 'categorias' | 'cuentas', id: string, nombre: string, tipo: 'activar' | 'desactivar') => void;
};

export default function ColumnaCatalogo({ titulo, items, target, onAdd, onEdit, onToggleStatus }: Props) {
  
  // Helper interno para pintar un badge individual de forma segura
  const renderBadgeHTML = (tipo: string) => {
    if (!tipo) return null;
    const cleanTipo = tipo.toUpperCase().trim();
    return (
      <span key={tipo} className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${cleanTipo === 'GASTO' ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : cleanTipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>
        {cleanTipo}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[600px]">
      
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{titulo}</h2>
        <button 
          onClick={() => onAdd(target)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 active:scale-95"
        >
          <Plus size={14} /> Añadir
        </button>
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto flex-1 custom-scrollbar">
        {items.length > 0 ? (
          items.map(item => {
            // Unificamos el posible nombre del campo que venga del backend por seguridad
            const tipoCategoria = item.tipo_operacion_id || item.tipo_operacion;
            const listaTiposCuenta = item.tipos_operacion || item.tipos;

            return (
              <div key={item.id} className={`p-4 flex justify-between items-center transition-colors ${!item.activo ? 'opacity-50 bg-slate-50/40 dark:bg-slate-900/20' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20'}`}>
                
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: item.color }}></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.nombre}</p>
                    
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {/* 1. Renderizado Seguro para Categorías */}
                      {tipoCategoria && typeof tipoCategoria === 'string' && renderBadgeHTML(tipoCategoria)}

                      {/* 2. Renderizado Seguro para Cuentas (Limpia nulos automáticamente) */}
                      {Array.isArray(listaTiposCuenta) && 
                        listaTiposCuenta.filter(Boolean).map(tipo => renderBadgeHTML(tipo))
                      }
                    </div>
                  </div>
                </div>

                {/* Botonera lateral */}
                <div className="flex items-center gap-2">
                  {item.activo ? (
                    <span className="text-emerald-500" title="Activo"><CheckCircle size={14} /></span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium" title="Inactivo"><XCircle size={14} /> Inactivo</span>
                  )}
                  
                  <button onClick={() => onEdit(target, item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors" title="Editar"><Pencil size={15} /></button>
                  
                  {item.activo ? (
                    <button 
                      onClick={() => onToggleStatus(target, item.id, item.nombre, 'desactivar')} 
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Desactivar"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => onToggleStatus(target, item.id, item.nombre, 'activar')} 
                      className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors" title="Reactivar"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">No hay registros definidos.</div>
        )}
      </div>
    </div>
  );
}