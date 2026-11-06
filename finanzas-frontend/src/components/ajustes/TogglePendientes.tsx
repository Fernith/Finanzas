import { useState } from 'react';
import { Clock } from 'lucide-react';
import { ajustesApi } from '../../api/client';
import { useConfig } from '../../context/ConfigContext';
import ModalConfirmacion from '../general/ModalConfirmacion';

export default function TogglePendientes() {
  const { usarPendientes, setUsarPendientes } = useConfig();
  const [modalPendientesAbierto, setModalPendientesAbierto] = useState(false);

  const confirmarTogglePendientes = async () => {
    const nuevoEstado = !usarPendientes;
    setUsarPendientes(nuevoEstado); 
    try {
      await ajustesApi.actualizarConfiguracion({ usar_pendientes: nuevoEstado });
    } catch {
      alert('Error de conexión al guardar la configuración');
      setUsarPendientes(!nuevoEstado); 
    } finally { 
      setModalPendientesAbierto(false); 
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={20} className="text-amber-500"/> Gestión de Operaciones Pendientes
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Activa esta opción para registrar operaciones que aún no se han reflejado en tu banco.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" className="sr-only peer" checked={usarPendientes} onChange={() => setModalPendientesAbierto(true)}/>
          <div className="w-11 h-6 bg-slate-300 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
        </label>
      </div>

      <ModalConfirmacion 
        isOpen={modalPendientesAbierto} 
        onClose={() => setModalPendientesAbierto(false)} 
        onConfirm={confirmarTogglePendientes}
        titulo={usarPendientes ? "Desactivar Operaciones Pendientes" : "Activar Operaciones Pendientes"}
        mensaje={usarPendientes 
          ? "¿Estás seguro de que deseas desactivar la gestión de operaciones pendientes? Dejarán de mostrarse las operaciones como pendientes en los listados y las sumas se calcularán sobre el total de registros."
          : "¿Estás seguro de que deseas activar la gestión de operaciones pendientes? Podrás registrar movimientos que aún no se han reflejado en el banco."
        }
        textoBoton={usarPendientes ? "Desactivar" : "Activar"}
        variante={usarPendientes ? 'danger' : 'success'}
      />
    </>
  );
}