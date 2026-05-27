import { useState } from 'react';
import { Clock } from 'lucide-react';
import ModalConfirmacion from '../ModalConfirmacion'; // Ajusta la ruta a donde tengas el ModalConfirmacion

type Props = {
  usarPendientes: boolean;
  guardandoConfig: boolean;
  onToggleConfirmado: (nuevoEstado: boolean) => Promise<void>;
};

export default function ComportamientoApp({ usarPendientes, guardandoConfig, onToggleConfirmado }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const solicitarCambio = () => {
    setModalAbierto(true);
  };

  const ejecutarCambio = async () => {
    await onToggleConfirmado(!usarPendientes);
    setModalAbierto(false);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
          <Clock className="text-blue-500" size={20} />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Comportamiento de la App</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Funcionalidad de Operaciones Pendientes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Permite registrar ingresos, gastos o inversiones que aún no se han ejecutado en el banco. Estas transacciones no afectarán a tus totales reales ni a la liquidez hasta que sean marcadas como completadas.
              </p>
            </div>
            <button 
              onClick={solicitarCambio} 
              disabled={guardandoConfig} 
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${usarPendientes ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'} ${guardandoConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${usarPendientes ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <ModalConfirmacion 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)} 
        onConfirm={ejecutarCambio}
        titulo={usarPendientes ? "Desactivar Operaciones Pendientes" : "Activar Operaciones Pendientes"}
        mensaje={usarPendientes 
          ? "¿Estás seguro de que deseas desactivar esta funcionalidad? El cálculo de totales estimados desaparecerá de todas las pantallas."
          : "¿Deseas activar la previsión financiera? Podrás marcar transacciones como pendientes sin que afecten a tu saldo real actual."
        }
        textoBoton={usarPendientes ? "Desactivar" : "Activar"}
        variante={usarPendientes ? "danger" : "success"}
      />
    </>
  );
}