import { useState, useEffect } from 'react';
import { Repeat, Plus, Pencil, Trash2, PowerOff, Power } from 'lucide-react';
import { useSuscripciones } from '../hooks/useSuscripciones';
import { formatearMoneda } from '../utils/formatters';
import ModalSuscripcion from '../components/suscripciones/ModalSuscripcion';
import ModalConfirmacion from '../components/general/ModalConfirmacion';

export default function Suscripciones() {
  const { suscripciones, cargarSuscripciones, eliminarSuscripcion, procesarTotales } = useSuscripciones();
  const [cuentas, setCuentas] = useState<any[]>([]);
  const { gastoMensual, gastoAnual, gastoMesCurso } = procesarTotales();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [suscripcionAEditar, setSuscripcionAEditar] = useState<any>(null);
  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);
  
  // NUEVO ESTADO PARA PAUSAR/REACTIVAR
  const [subParaToggle, setSubParaToggle] = useState<any>(null);

  useEffect(() => { fetch('/api/ajustes/cuentas').then(res => res.json()).then(setCuentas); }, []);

  const toggleActivo = async (sub: any) => {
    const payload = { ...sub, activo: !sub.activo };
    if (await fetch(`/api/suscripciones/${sub.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(res => res.ok)) {
      cargarSuscripciones();
    }
  };

  const eqMensual = (s: any) => s.periodicidad === 'MENSUAL' ? s.cantidad : s.periodicidad === 'ANUAL' ? s.cantidad / 12 : s.cantidad * (365/30) / 12;
  const eqAnual = (s: any) => s.periodicidad === 'ANUAL' ? s.cantidad : s.periodicidad === 'MENSUAL' ? s.cantidad * 12 : s.cantidad * (365/30);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 dark:border-neutral-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-neutral-700 dark:to-neutral-800 rounded-2xl shadow-sm border border-slate-300/50 dark:border-neutral-600/50">
            <Repeat className="text-slate-800 dark:text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Suscripciones</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatiza y controla tus servicios recurrentes</p>
          </div>
        </div>
        <button onClick={() => { setSuscripcionAEditar(null); setModalAbierto(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-bold rounded-xl shadow-md shadow-slate-900/10 dark:shadow-white/10 active:scale-95 transition-all">
          <Plus size={18} /> Añadir Suscripción
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pago este mes</p><p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatearMoneda(gastoMesCurso)} €</p></div>
          <div className="p-3 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"><Repeat size={24}/></div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carga Mensual</p><p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatearMoneda(gastoMensual)} €</p></div>
          <div className="p-3 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"><Repeat size={24}/></div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impacto Anual</p><p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{formatearMoneda(gastoAnual)} €</p></div>
          <div className="p-3 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"><Repeat size={24}/></div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-700">
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Servicio</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cobro Real</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100/50 dark:bg-neutral-800/30">Eq. Mensual</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Periodicidad</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Próxima Renov.</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cuenta</th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {suscripciones.map(s => (
                <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors ${!s.activo ? 'opacity-50' : ''}`}>
                  <td className="p-4 font-bold text-slate-800 dark:text-white">{s.nombre} {(!s.activo) && <span className="ml-2 text-[10px] bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">INACTIVA</span>}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{formatearMoneda(s.cantidad)} €</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-neutral-800/30">{formatearMoneda(eqMensual(s))} € <span className="text-[10px] font-normal text-slate-400 ml-1">({formatearMoneda(eqAnual(s))}€/año)</span></td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{s.periodicidad.replace('_', ' ')}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{s.fecha_proxima_renovacion.split('-').reverse().join('/')}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{s.cuenta_nombre}</td>
                  <td className="p-4 text-right space-x-2">
                    {/* Botón actualizado para abrir el modal de confirmación */}
                    <button onClick={() => setSubParaToggle(s)} className={`p-1.5 rounded-lg transition-colors ${s.activo ? 'text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`} title={s.activo ? "Pausar" : "Reactivar"}>
                      {s.activo ? <PowerOff size={16}/> : <Power size={16}/>}
                    </button>
                    <button onClick={() => { setSuscripcionAEditar(s); setModalAbierto(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Pencil size={16}/></button>
                    <button onClick={() => setIdAEliminar(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
              {suscripciones.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay suscripciones registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ModalSuscripcion isOpen={modalAbierto} onClose={() => { setModalAbierto(false); setSuscripcionAEditar(null); }} onSuccess={cargarSuscripciones} suscripcionAEditar={suscripcionAEditar} cuentas={cuentas} />
      
      <ModalConfirmacion 
        isOpen={!!idAEliminar} 
        onClose={() => setIdAEliminar(null)} 
        onConfirm={() => { if(idAEliminar) eliminarSuscripcion(idAEliminar); setIdAEliminar(null); }} 
        mensaje="¿Estás seguro de que deseas eliminar esta suscripción permanentemente?" 
      />

      {/* NUEVO MODAL DE CONFIRMACIÓN PARA PAUSAR/REACTIVAR */}
      <ModalConfirmacion 
        isOpen={!!subParaToggle} 
        onClose={() => setSubParaToggle(null)} 
        onConfirm={() => { if (subParaToggle) { toggleActivo(subParaToggle); setSubParaToggle(null); } }} 
        titulo={subParaToggle?.activo ? "Pausar suscripción" : "Reactivar suscripción"}
        mensaje={subParaToggle?.activo ? `¿Seguro que deseas pausar "${subParaToggle?.nombre}"? No se generarán gastos automáticos hasta que la reactives.` : `¿Deseas reactivar "${subParaToggle?.nombre}"? Volverá a cobrarse automáticamente en su próxima fecha.`}
        textoBoton={subParaToggle?.activo ? "Pausar" : "Reactivar"}
        variante={subParaToggle?.activo ? "warning" : "success"}
      />
    </div>
  );
}