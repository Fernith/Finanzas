import { useState } from 'react';
import { Settings } from 'lucide-react';
import ModalAjusteMaestro from '../components/ajustes/ModalAjusteMaestro';
import ModalConfirmacion from '../components/general/ModalConfirmacion';
import TogglePendientes from '../components/ajustes/TogglePendientes';
import CatalogoMaestro from '../components/ajustes/CatalogoMaestro';
import ModalAlerta from '../components/general/ModalAlerta';
import { useAjustes } from '../hooks/useAjustes';
import { useSuscripciones } from '../hooks/useSuscripciones';

type TargetT = 'categorias' | 'cuentas';

export default function Ajustes() {
  const { 
    categorias, setCategorias, cargarCategorias,
    cuentas, setCuentas, cargarCuentas, ejecutarAccionEstado 
  } = useAjustes();

  const [modalOpen, setModalOpen] = useState(false);
  const [targetModal, setTargetModal] = useState<TargetT>('categorias');
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);

  const [accionConfirmacion, setAccionConfirmacion] = useState<{ 
    target: TargetT, id: string, nombre: string, tipo: 'activar' | 'desactivar' 
  } | null>(null);

  const [alerta, setAlerta] = useState<{ titulo: string, mensaje: string } | null>(null);

  const { suscripciones } = useSuscripciones();

  const handleAbrirAlta = (target: TargetT) => { setTargetModal(target); setItemSeleccionado(null); setModalOpen(true); };
  const handleAbrirEdicion = (target: TargetT, item: any) => { setTargetModal(target); setItemSeleccionado(item); setModalOpen(true); };
  
  const handleToggleEstado = (target: TargetT, id: string, nombre: string, tipo: 'activar' | 'desactivar') => {

    // VALIDACIÓN 2: No desactivar una cuenta si tiene suscripciones activas.
    if (target === 'cuentas' && tipo === 'desactivar') {
      const enUso = suscripciones.some((s: any) => s.cuenta_id === id && s.activo);
      if (enUso) {
        setAlerta({ titulo: "Cuenta en uso", mensaje: `No puedes desactivar la cuenta "${nombre}" porque tiene suscripciones activas de cobro automático. Cámbialas de cuenta o cancélalas primero.` });
        return;
      }
    }

    setAccionConfirmacion({ target, id, nombre, tipo });
  };

  const ejecutarAccionConfirmada = async () => {
    if (!accionConfirmacion) return;
    const { target, id, tipo } = accionConfirmacion;
    const ok = await ejecutarAccionEstado(target, id, tipo);
    if (!ok) alert(`No se pudo ${tipo} el elemento.`);
    setAccionConfirmacion(null);
  };

  const onSuccessModal = () => {
    if (targetModal === 'categorias') cargarCategorias();
    if (targetModal === 'cuentas') cargarCuentas();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-neutral-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl shadow-sm border border-slate-200/50 dark:border-neutral-700/50">
            <Settings className="text-slate-600 dark:text-slate-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Ajustes Generales</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura y personaliza tus catálogos (Arrastra para reordenar)</p>
          </div>
        </div>
      </div>

      <TogglePendientes />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <CatalogoMaestro 
          titulo="Catálogo de Categorías" target="categorias" items={categorias} setItems={setCategorias}
          onReload={cargarCategorias} onAbrirAlta={handleAbrirAlta} onAbrirEdicion={handleAbrirEdicion} onToggleEstado={handleToggleEstado}
        />
        <CatalogoMaestro 
          titulo="Catálogo de Cuentas" target="cuentas" items={cuentas} setItems={setCuentas}
          onReload={cargarCuentas} onAbrirAlta={handleAbrirAlta} onAbrirEdicion={handleAbrirEdicion} onToggleEstado={handleToggleEstado}
        />
      </div>

      {/* Le pasamos "grupos" al modal para que pueda usarlos en el select de Categorías */}
      <ModalAjusteMaestro 
        isOpen={modalOpen} onClose={() => setModalOpen(false)} 
        onSuccess={onSuccessModal} target={targetModal} 
        itemAEditar={itemSeleccionado}
      />
      
      <ModalConfirmacion 
        isOpen={!!accionConfirmacion} onClose={() => setAccionConfirmacion(null)} onConfirm={ejecutarAccionConfirmada} 
        titulo={accionConfirmacion?.tipo === 'desactivar' ? "Desactivar elemento" : "Reactivar elemento"} 
        mensaje={accionConfirmacion?.tipo === 'desactivar' ? `¿Estás seguro de que deseas desactivar "${accionConfirmacion?.nombre}"? Dejará de aparecer en los selectores.` : `Vas a reactivar "${accionConfirmacion?.nombre}". Volverá a estar disponible para nuevos registros.`} 
        textoBoton={accionConfirmacion?.tipo === 'desactivar' ? "Desactivar" : "Reactivar"} 
        variante={accionConfirmacion?.tipo === 'desactivar' ? 'danger' : 'success'} 
      />

      <ModalAlerta 
        isOpen={!!alerta}
        onClose={() => setAlerta(null)}
        titulo={alerta?.titulo || ''}
        mensaje={alerta?.mensaje || ''}
      />
    </div>
  );
}