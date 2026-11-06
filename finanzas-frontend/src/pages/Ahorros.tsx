import { useState } from 'react';
import { PiggyBank, Plus, Target } from 'lucide-react';
import ModalConfirmacion from '../components/general/ModalConfirmacion';
import ModalMetaAhorro from '../components/ahorros/ModalMetaAhorro';
import ModalHistorialMeta from '../components/ahorros/ModalHistorialMeta';
import ModalMovimientoMeta from '../components/ahorros/ModalMovimientoMeta';
import ModalFinalizarMeta from '../components/ahorros/ModalFinalizarMeta';
import MetaCard from '../components/ahorros/MetaCard';
import { useAhorros } from '../hooks/useAhorros';
import type { MetaAhorro } from '../types';

// Importamos los nuevos componentes
import AhorrosHeader from '../components/ahorros/AhorrosHeader';
import CalculadoraProyecciones from '../components/ahorros/CalculadoraProyecciones';

export default function Ahorros() {
  const { 
    metas, 
    totalReservadoMetas, 
    dineroPorAhorrar, 
    progresoGlobal, 
    cargarDatos, 
    eliminarMeta 
  } = useAhorros();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [metaAEditar, setMetaAEditar] = useState<MetaAhorro | null>(null);
  const [itemAEliminar, setItemAEliminar] = useState<MetaAhorro | null>(null);

  const [modalHistorial, setModalHistorial] = useState<MetaAhorro | null>(null);
  const [modalMovimiento, setModalMovimiento] = useState<{ meta: MetaAhorro, tipo: 'add' | 'withdraw' } | null>(null);
  const [modalFinalizar, setModalFinalizar] = useState<MetaAhorro | null>(null);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12 w-full">
      
      {/* Cabecera Estática (Icono y Título) */}
      <div className="flex flex-col justify-between items-start pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-fuchsia-200 dark:from-purple-900/40 dark:to-fuchsia-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-800/50">
            <PiggyBank className="text-purple-600 dark:text-purple-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Caja de Ahorros</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestión de capital, carteras y objetivos virtuales</p>
          </div>
        </div>
      </div>

      {/* NUEVO HEADER Y CAJA DE MÉTRICAS DORADA */}
      <AhorrosHeader 
        totalReservadoMetas={totalReservadoMetas}
        dineroPorAhorrar={dineroPorAhorrar}
        progresoGlobal={progresoGlobal}
      />

      {/* ZONA DE METAS DE AHORRO */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-slate-200 dark:border-neutral-700 pb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="text-purple-500"/> Tus Sobres y Metas Virtuales
          </h2>
          <button onClick={() => { setMetaAEditar(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-500/10 active:scale-95 transition-all">
            <Plus size={16} /> Añadir Meta
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metas.map(m => (
            <MetaCard 
              key={m.id} meta={m} 
              onEdit={(meta) => { setMetaAEditar(meta); setModalOpen(true); }} 
              onDelete={setItemAEliminar} 
              onHistory={setModalHistorial} 
              onAdd={(meta) => setModalMovimiento({ meta, tipo: 'add' })} 
              onWithdraw={(meta) => setModalMovimiento({ meta, tipo: 'withdraw' })} 
              onFinish={setModalFinalizar} 
            />
          ))}
        </div>
      </div>

      {metas.length > 0 && (
        <CalculadoraProyecciones metas={metas} />
      )}

      {/* Modales */}
      <ModalMetaAhorro isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={cargarDatos} metaAEditar={metaAEditar} />
      <ModalConfirmacion isOpen={!!itemAEliminar} onClose={() => setItemAEliminar(null)} onConfirm={() => { if (itemAEliminar) eliminarMeta(itemAEliminar.id); setItemAEliminar(null); }} titulo="Eliminar meta de ahorro" mensaje={`¿Estás seguro de eliminar el sobre "${itemAEliminar?.nombre}"? El dinero volverá a estar libre.`} />
      <ModalHistorialMeta isOpen={!!modalHistorial} onClose={() => setModalHistorial(null)} meta={modalHistorial} />
      <ModalMovimientoMeta isOpen={!!modalMovimiento} onClose={() => setModalMovimiento(null)} onSuccess={cargarDatos} meta={modalMovimiento?.meta} tipo={modalMovimiento?.tipo} />
      <ModalFinalizarMeta isOpen={!!modalFinalizar} onClose={() => setModalFinalizar(null)} onSuccess={cargarDatos} meta={modalFinalizar} />
    </div>
  );
}