import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { useInversiones } from '../hooks/useInversiones';
import { formatearMoneda } from '../utils/formatters';
import type { Activo, TransaccionInversion } from '../types';

import TablaActivos from '../components/inversiones/TablaActivos';
import ModalActivoInversion from '../components/inversiones/ModalActivoInversiones';
import ModalTransaccionInversion from '../components/inversiones/ModalTransaccionInversion';
import ModalConfirmacion from '../components/general/ModalConfirmacion';

// 1. IMPORTAR NUEVOS COMPONENTES
import GraficoFlujoInversiones from '../components/inversiones/GraficoFlujoInversiones';
import CalculadoraInteresCompuesto from '../components/inversiones/CalculadoraInteresCompuesto';

export default function Inversiones() {
  const { 
    activosConTransacciones, totalInvertido, flujoMensual, // Sacamos flujoMensual
    cargarDatos, eliminarTransaccion 
  } = useInversiones();
  
  const [isModalActivoOpen, setIsModalActivoOpen] = useState(false);
  const [activoAEditar, setActivoAEditar] = useState<Activo | null>(null);
  const [transaccionAEditar, setTransaccionAEditar] = useState<TransaccionInversion | null>(null);
  const [idTransaccionEliminar, setIdTransaccionEliminar] = useState<string | null>(null);

  const handleEditActivo = (activo: Activo) => {
    setActivoAEditar(activo);
    setIsModalActivoOpen(true);
  };

  const handleNuevoActivo = () => {
    setActivoAEditar(null); // Null significa Creación
    setIsModalActivoOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full pb-12">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-neutral-200 dark:border-neutral-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-blue-200 dark:from-indigo-900/40 dark:to-blue-900/20 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50">
            <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Portfolio de Inversiones</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Gestión de activos, aportaciones e interés compuesto</p>
          </div>
        </div>
        <button onClick={handleNuevoActivo} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md active:scale-95 transition-all">
          <Plus size={18} /> Nuevo Activo
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Invertido (Aportaciones)</p>
          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{formatearMoneda(totalInvertido)} €</p>
        </div>
        <div className="p-4 rounded-full bg-indigo-50 dark:bg-neutral-800 text-indigo-500">
          <TrendingUp size={32} />
        </div>
      </div>

      {/* 2. GRÁFICA DE FLUJO */}
      <GraficoFlujoInversiones flujoMensual={flujoMensual} />

      <div>
        <h2 className="text-lg font-bold text-neutral-800 dark:text-white mb-4">Tus Activos</h2>
        <TablaActivos 
          activosConTransacciones={activosConTransacciones} 
          onEditActivo={handleEditActivo} 
          onEditTransaccion={setTransaccionAEditar}
          onDeleteTransaccion={setIdTransaccionEliminar}
        />
      </div>

      {/* 3. CALCULADORA */}
      <CalculadoraInteresCompuesto />

      <ModalActivoInversion 
        isOpen={isModalActivoOpen} 
        onClose={() => setIsModalActivoOpen(false)} 
        onSuccess={cargarDatos} 
        activoAEditar={activoAEditar} 
      />
      <ModalTransaccionInversion isOpen={!!transaccionAEditar} onClose={() => setTransaccionAEditar(null)} onSuccess={cargarDatos} transaccionAEditar={transaccionAEditar} />
      <ModalConfirmacion isOpen={!!idTransaccionEliminar} onClose={() => setIdTransaccionEliminar(null)} onConfirm={() => { if(idTransaccionEliminar) eliminarTransaccion(idTransaccionEliminar); setIdTransaccionEliminar(null); }} titulo="Eliminar aportación" mensaje="¿Estás seguro de eliminar esta compra del historial? Se descontará del total invertido de este activo." textoBoton="Eliminar" variante="danger" />

    </div>
  );
}