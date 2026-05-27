import { useState, useEffect } from 'react';
import { Settings, LayoutGrid } from 'lucide-react';
import ModalAjusteMaestro from '../components/ModalAjusteMaestro'; 
import ModalConfirmacion from '../components/ModalConfirmacion'; 
import ColumnaCatalogo from '../components/ajustes/ColumnaCatalogo';
import ComportamientoApp from '../components/ajustes/ComportamientoApp';

export default function Ajustes() {
  const [activeTab, setActiveTab] = useState('general');
  const [usarPendientes, setUsarPendientes] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetModal, setTargetModal] = useState<'categorias' | 'cuentas'>('categorias');
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [accionConfirmacion, setAccionConfirmacion] = useState<{ target: 'categorias' | 'cuentas', id: string, nombre: string, tipo: 'activar' | 'desactivar' } | null>(null);

  const cargarCategorias = () => fetch('/api/ajustes/categorias').then(res => res.json()).then(data => setCategorias(data));
  const cargarCuentas = () => fetch('/api/ajustes/cuentas').then(res => res.json()).then(data => setCuentas(data));
  const cargarConfiguracion = () => fetch('/api/configuracion').then(res => res.json()).then(data => setUsarPendientes(data.usar_pendientes));

  useEffect(() => {
    cargarConfiguracion();
    cargarCategorias();
    cargarCuentas();
  }, []);

  const handleToggleConfirmado = async (nuevoEstado: boolean) => {
    setGuardandoConfig(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usar_pendientes: nuevoEstado })
      });
      if (res.ok) setUsarPendientes(nuevoEstado);
    } catch {
      alert("Error al actualizar la configuración");
    } finally {
      setGuardandoConfig(false);
    }
  };

  const handleAbrirAlta = (target: 'categorias' | 'cuentas') => {
    setTargetModal(target);
    setItemSeleccionado(null);
    setModalOpen(true);
  };

  const handleAbrirEdicion = (target: 'categorias' | 'cuentas', item: any) => {
    setTargetModal(target);
    setItemSeleccionado(item);
    setModalOpen(true);
  };

  const handleToggleStatus = (target: 'categorias' | 'cuentas', id: string, nombre: string, tipo: 'activar' | 'desactivar') => {
    setAccionConfirmacion({ target, id, nombre, tipo });
  };

  const ejecutarAccionConfirmada = async () => {
    if (!accionConfirmacion) return;
    const { target, id, tipo } = accionConfirmacion;
    
    const url = tipo === 'desactivar' ? `/api/ajustes/${target}/${id}` : `/api/ajustes/${target}/${id}/activar`;
    const method = tipo === 'desactivar' ? 'DELETE' : 'PUT';

    try {
      const res = await fetch(url, { method });
      if (res.ok) {
        target === 'categorias' ? cargarCategorias() : cargarCuentas();
      } else {
        alert(`No se pudo ${tipo} el elemento.`);
      }
    } catch { 
      alert('Error de conexión.'); 
    } finally {
      setAccionConfirmacion(null);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <LayoutGrid size={18} /> },
    { id: 'futuro', label: 'Futuros Ajustes', icon: <Settings size={18} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-[1400px] mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/20 rounded-2xl shadow-sm border border-blue-200/50 dark:border-blue-800/50">
            <Settings className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Ajustes Generales</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura y personaliza tu entorno de finanzas</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'} rounded-t-xl`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          
          <ComportamientoApp 
            usarPendientes={usarPendientes} 
            guardandoConfig={guardandoConfig} 
            onToggleConfirmado={handleToggleConfirmado} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <ColumnaCatalogo 
              titulo="Catálogo de Categorías" items={categorias} target="categorias" 
              onAdd={handleAbrirAlta} onEdit={handleAbrirEdicion} onToggleStatus={handleToggleStatus} 
            />
            <ColumnaCatalogo 
              titulo="Catálogo de Cuentas Financieras" items={cuentas} target="cuentas" 
              onAdd={handleAbrirAlta} onEdit={handleAbrirEdicion} onToggleStatus={handleToggleStatus} 
            />
          </div>
        </div>
      )}

      {activeTab === 'futuro' && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
          Esta pestaña está reservada para futuras configuraciones.
        </div>
      )}

      <ModalAjusteMaestro 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        // CORREGIDO: Vuelve a ejecutar la función correcta según la pestaña abierta
        onSuccess={targetModal === 'categorias' ? cargarCategorias : cargarCuentas}
        target={targetModal}
        itemAEditar={itemSeleccionado}
      />

      <ModalConfirmacion 
        isOpen={!!accionConfirmacion} 
        onClose={() => setAccionConfirmacion(null)} 
        onConfirm={ejecutarAccionConfirmada}
        titulo={accionConfirmacion?.tipo === 'desactivar' ? "Desactivar elemento" : "Reactivar elemento"}
        mensaje={
          accionConfirmacion?.tipo === 'desactivar' 
          ? `¿Estás seguro de que deseas desactivar "${accionConfirmacion?.nombre}"? Dejará de aparecer en los selectores.`
          : `Vas a reactivar "${accionConfirmacion?.nombre}". Volverá a estar disponible para nuevos registros.`
        }
        textoBoton={accionConfirmacion?.tipo === 'desactivar' ? "Desactivar" : "Reactivar"}
        variante={accionConfirmacion?.tipo === 'desactivar' ? 'danger' : 'success'}
      />
    </div>
  );
}