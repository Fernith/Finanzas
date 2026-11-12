import { useState } from 'react';
import { GripVertical, Plus, CheckCircle, XCircle, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { ajustesApi } from '../../api/client';
import { useConfig } from '../../context/ConfigContext';
import type { CatalogoItem } from '../../types';

export type TargetCatalogo = 'grupos' | 'categorias' | 'cuentas';

type CatalogoProps<T extends CatalogoItem> = {
  titulo: string;
  items: T[];
  setItems: (items: T[]) => void;
  target: TargetCatalogo;
  onReload: () => void;
  onAbrirAlta: (target: TargetCatalogo) => void;
  onAbrirEdicion: (target: TargetCatalogo, item: T) => void;
  onToggleEstado: (target: TargetCatalogo, id: string, nombre: string, tipo: 'activar' | 'desactivar') => void;
};

type FiltroTipo = 'TODOS' | 'GASTO' | 'INGRESO' | 'INVERSION';

const OPCIONES_FILTRO: { valor: FiltroTipo; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'GASTO', etiqueta: 'Gasto' },
  { valor: 'INGRESO', etiqueta: 'Ingreso' },
  { valor: 'INVERSION', etiqueta: 'Inversión' },
];

export default function CatalogoMaestro<T extends CatalogoItem>({ titulo, items, setItems, target, onReload, onAbrirAlta, onAbrirEdicion, onToggleEstado }: CatalogoProps<T>) {
  const { perfil } = useConfig();
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [draggedItem, setDraggedItem] = useState<{ index: number, target: string } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const itemsFiltrados = target === 'grupos' || filtroTipo === 'TODOS'
    ? items
    : items.filter((item) => {
        if ('tipo_operacion_id' in item) {
          return item.tipo_operacion_id === filtroTipo;
        }
        if ('tipos_operacion' in item) {
          return item.tipos_operacion.includes(filtroTipo);
        }
        return true;
      });

  const handleDragStart = (e: React.DragEvent, index: number, target: string) => {
    setDraggedItem({ index, target });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number, target: string) => {
    e.preventDefault();
    if (draggedItem?.target === target) setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number, targetParam: TargetCatalogo) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedItem || draggedItem.target !== targetParam || draggedItem.index === dropIndex) return;

    const itemOrigen = itemsFiltrados[draggedItem.index];
    const itemDestino = itemsFiltrados[dropIndex];
    if (!itemOrigen || !itemDestino) return;

    const realDragIndex = items.findIndex((i) => i.id === itemOrigen.id);
    const realDropIndex = items.findIndex((i) => i.id === itemDestino.id);
    if (realDragIndex === -1 || realDropIndex === -1 || realDragIndex === realDropIndex) return;

    setIsSavingOrder(true);
    
    const nuevosItems = [...items];
    const [draggedEl] = nuevosItems.splice(realDragIndex, 1);
    nuevosItems.splice(realDropIndex, 0, draggedEl);

    // Actualización optimista local
    setItems(nuevosItems);

    const payload = nuevosItems.map((item, idx) => ({ id: item.id, orden: idx }));
    try {
      if (targetParam === 'grupos') {
        await ajustesApi.reordenarGrupos(payload);
      } else if (targetParam === 'categorias') {
        await ajustesApi.reordenarCategorias(payload);
      } else {
        await ajustesApi.reordenarCuentas(payload);
      }
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
      <div className="p-5 border-b border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{titulo}</h2>
          <button 
            onClick={() => onAbrirAlta(target)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/10 active:scale-95"
          >
            <Plus size={14} /> Añadir
          </button>
        </div>

        {target !== 'grupos' && (
          <div className="flex flex-wrap gap-1.5">
            {OPCIONES_FILTRO.map((op) => {
              const activo = filtroTipo === op.valor;
              return (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setFiltroTipo(op.valor)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activo
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                >
                  {op.etiqueta}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="divide-y divide-slate-100 dark:divide-neutral-800 overflow-y-auto max-h-[500px]">
        {itemsFiltrados.length > 0 ? (
          itemsFiltrados.map((item, index) => {
            const colorCirculo = target === 'categorias' && 'color_grupo' in item
              ? (perfil === 'Tipo A' ? (item.color_grupo || '#3b82f6') : item.color)
              : item.color;

            return (
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
                  <span className="w-4 h-4 rounded-full shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: colorCirculo || undefined }}></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {item.nombre}
                      {perfil === 'Tipo A' && 'grupo_nombre' in item && item.grupo_nombre && (
                        <span className="ml-1 text-xs font-normal text-slate-400">({item.grupo_nombre})</span>
                      )}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {'tipo_operacion_id' in item && typeof item.tipo_operacion_id === 'string' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.tipo_operacion_id === 'GASTO' ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : item.tipo_operacion_id === 'INGRESO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'}`}>
                          {item.tipo_operacion_id}
                        </span>
                      )}
                      {'tipos_operacion' in item && Array.isArray(item.tipos_operacion) && item.tipos_operacion.map((tipo: string) => (
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
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">No hay registros definidos.</div>
        )}
      </div>
    </div>
  );
}