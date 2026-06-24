import { useState } from 'react';
import { GripVertical, Plus, CheckCircle, XCircle, Pencil, Trash2, RotateCcw } from 'lucide-react';

type CatalogoProps = {
  titulo: string;
  items: any[];
  setItems: (items: any[]) => void;
  target: 'categorias' | 'cuentas';
  onReload: () => void;
  onAbrirAlta: (target: 'categorias' | 'cuentas') => void;
  onAbrirEdicion: (target: 'categorias' | 'cuentas', item: any) => void;
  onToggleEstado: (target: 'categorias' | 'cuentas', id: string, nombre: string, tipo: 'activar' | 'desactivar') => void;
};

export default function CatalogoMaestro({ titulo, items, setItems, target, onReload, onAbrirAlta, onAbrirEdicion, onToggleEstado }: CatalogoProps) {
  const [draggedItem, setDraggedItem] = useState<{ index: number, target: string } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const handleDragStart = (e: React.DragEvent, index: number, target: string) => {
    setDraggedItem({ index, target });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number, target: string) => {
    e.preventDefault();
    if (draggedItem?.target === target) setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number, target: string) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedItem || draggedItem.target !== target || draggedItem.index === dropIndex) return;

    setIsSavingOrder(true);
    
    const nuevosItems = [...items];
    const dragIndex = draggedItem.index;
    const [draggedEl] = nuevosItems.splice(dragIndex, 1);
    nuevosItems.splice(dropIndex, 0, draggedEl);

    // Actualización optimista local
    setItems(nuevosItems);

    const payload = nuevosItems.map((item, idx) => ({ id: item.id, orden: idx }));
    try {
      const res = await fetch(`/api/ajustes/${target}/reordenar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar');
    } catch {
      alert("Error al guardar el nuevo orden en el servidor.");
      onReload(); // Deshacer en caso de error
    } finally {
      setIsSavingOrder(false);
      setDraggedItem(null);
    }
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-sm flex flex-col overflow-hidden h-full transition-opacity ${isSavingOrder ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="p-5 border-b border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{titulo}</h2>
        <button 
          onClick={() => onAbrirAlta(target)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 active:scale-95"
        >
          <Plus size={14} /> Añadir
        </button>
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-neutral-800 overflow-y-auto max-h-[500px]">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div 
              key={item.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, index, target)}
              onDragOver={(e) => handleDragOver(e, index, target)}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index, target)}
              className={`p-4 flex justify-between items-center transition-all cursor-move
                ${!item.activo ? 'opacity-50 bg-slate-50/40 dark:bg-neutral-900/20' : 'hover:bg-slate-50/30 dark:hover:bg-neutral-800/50'}
                ${draggedItem?.target === target && dragOverIndex === index ? 'bg-slate-100 dark:bg-neutral-800 shadow-inner' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <GripVertical size={16} className="text-slate-400 shrink-0 hover:text-slate-600 dark:hover:text-slate-200" />
                <span className="w-4 h-4 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: item.color }}></span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {item.nombre}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {typeof item.tipo_operacion_id === 'string' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.tipo_operacion_id === 'GASTO' ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : item.tipo_operacion_id === 'INGRESO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>
                        {item.tipo_operacion_id}
                      </span>
                    )}
                    {Array.isArray(item.tipos_operacion) && item.tipos_operacion.map((tipo: string) => (
                      <span key={tipo} className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${tipo === 'GASTO' ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>
                        {tipo}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.activo ? (
                  <span className="text-emerald-500" title="Activo"><CheckCircle size={14} /></span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium" title="Inactivo"><XCircle size={14} /> Inactivo</span>
                )}
                <button onClick={() => onAbrirEdicion(target, item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors" title="Editar"><Pencil size={15} /></button>
                {item.activo ? (
                  <button onClick={() => onToggleEstado(target, item.id, item.nombre, 'desactivar')} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Desactivar"><Trash2 size={15} /></button>
                ) : (
                  <button onClick={() => onToggleEstado(target, item.id, item.nombre, 'activar')} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors" title="Reactivar"><RotateCcw size={15} /></button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">No hay registros definidos.</div>
        )}
      </div>
    </div>
  );
}