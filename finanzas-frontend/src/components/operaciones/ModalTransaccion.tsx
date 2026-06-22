import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, AlignLeft } from 'lucide-react';

export type TipoTransaccion = 'GASTO' | 'INGRESO' | 'INVERSION';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaccionAEditar?: any;
  tipoInicial?: TipoTransaccion;
};

export default function ModalTransaccion({ isOpen, onClose, onSuccess, transaccionAEditar, tipoInicial = 'GASTO' }: ModalProps) {
  const hoy = new Date().toISOString().split('T')[0];
  
  const [form, setForm] = useState({
    tipo: tipoInicial,
    fecha: hoy,
    cantidad: '',
    categoria_id: '',
    cuenta_id: '',
    descripcion: '',
    pendiente: false,
    activo_ticker: ''
  });

  const [categorias, setCategorias] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [activos, setActivos] = useState<any[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const tipoFinal = transaccionAEditar?.tipo_operacion_id || tipoInicial;

      // Seteo inicial preventivo mientras cargan los datos
      setForm(prev => ({
        ...prev,
        tipo: tipoFinal,
        fecha: transaccionAEditar?.fecha || hoy,
        cantidad: transaccionAEditar ? String(transaccionAEditar.cantidad) : '',
        descripcion: transaccionAEditar?.descripcion || '',
        pendiente: transaccionAEditar?.pendiente || false,
        categoria_id: transaccionAEditar?.categoria_id || '',
        cuenta_id: transaccionAEditar?.cuenta_id || '',
        activo_ticker: ''
      }));

      const fetchData = async () => {
        try {
          // Cargamos todos los catálogos en paralelo
          const [resCat, resCta, resAct] = await Promise.all([
            fetch('/api/ajustes/categorias').then(r => r.json()),
            fetch('/api/ajustes/cuentas').then(r => r.json()),
            fetch('/api/inversiones/activos').then(r => r.json())
          ]);

          const activeCat = resCat.filter((c: any) => c.activo !== false);
          const activeCta = resCta.filter((c: any) => c.activo !== false);

          setCategorias(activeCat);
          setCuentas(activeCta);
          setActivos(resAct);

          // Asignación segura de IDs por defecto
          setForm(prev => ({
            ...prev,
            categoria_id: prev.categoria_id || (transaccionAEditar ? (activeCat.find((c:any) => c.nombre === transaccionAEditar.categoria)?.id || '') : ''),
            cuenta_id: prev.cuenta_id || (transaccionAEditar ? (activeCta.find((c:any) => c.nombre === transaccionAEditar.cuenta)?.id || '') : (activeCta.length > 0 ? activeCta[0].id : '')),
            activo_ticker: resAct.length > 0 ? resAct[0].ticker : ''
          }));
        } catch (e) {
          console.error('Error cargando catálogos', e);
        }
      };
      fetchData();
    }
  }, [isOpen, transaccionAEditar, tipoInicial, hoy]);

  if (!isOpen) return null;

  // Lógica de colores idéntica a tu diseño original
  const getTema = () => {
    if (form.tipo === 'GASTO') return { bg: 'bg-red-500', btn: 'from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700', ring: 'focus:ring-red-100 dark:focus:ring-red-900/30', toggle: 'peer-checked:bg-red-500' };
    if (form.tipo === 'INGRESO') return { bg: 'bg-emerald-500', btn: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700', ring: 'focus:ring-emerald-100 dark:focus:ring-emerald-900/30', toggle: 'peer-checked:bg-emerald-500' };
    return { bg: 'bg-amber-500', btn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600', ring: 'focus:ring-amber-100 dark:focus:ring-amber-900/30', toggle: 'peer-checked:bg-amber-500' };
  };
  
  const tema = getTema();
  const inputClases = `w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:ring-2 ${tema.ring} transition-all`;
  
  const categoriasFiltradas = categorias.filter(c => c.tipo_operacion_id === form.tipo);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    
    const cantidadLimpia = Math.round(parseFloat(String(form.cantidad).replace(',', '.')) * 100) / 100;
    if (isNaN(cantidadLimpia) || cantidadLimpia <= 0) { alert('Introduce una cantidad válida.'); return; }

    setEnviando(true);

    try {
      if (form.tipo === 'INVERSION') {
        if (!form.activo_ticker || !form.cuenta_id) { alert('Selecciona un activo y una cuenta.'); setEnviando(false); return; }
        
        const activoSeleccionado = activos.find(a => a.ticker === form.activo_ticker);
        
        // 1. Guardar la Inversión (Aportación)
        await fetch('/api/inversiones/transacciones', { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha_compra: form.fecha, euros_invertidos: cantidadLimpia, activo_ticker: form.activo_ticker }) 
        });

        // 2. Crear Gasto reflejo para restar la liquidez bancaria
        await fetch('/api/gastos', { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha: form.fecha, cantidad: cantidadLimpia, categoria_id: activoSeleccionado?.categoria_id || null, cuenta_id: form.cuenta_id, descripcion: `Inversión: ${activoSeleccionado?.nombre || form.activo_ticker}`, pendiente: false }) 
        });

      } else {
        // Gasto / Ingreso Normal
        if (!form.categoria_id || !form.cuenta_id) { alert('Selecciona una categoría y cuenta.'); setEnviando(false); return; }

        const payload = { fecha: form.fecha, cantidad: cantidadLimpia, categoria_id: form.categoria_id, cuenta_id: form.cuenta_id, descripcion: form.descripcion.trim() || null, pendiente: form.pendiente };
        const urls: any = { GASTO: '/api/gastos', INGRESO: '/api/ingresos' };
        const url = transaccionAEditar ? `${urls[form.tipo]}/${transaccionAEditar.id}` : urls[form.tipo];
        const method = transaccionAEditar ? 'PUT' : 'POST';

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error de servidor');
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert('Error de red al guardar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {transaccionAEditar && form.tipo ? `Editar ${form.tipo.charAt(0) + form.tipo.slice(1).toLowerCase()}` : `Nueva Operación`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* BOTONES DE TIPO (Gastos, Ingresos, Inversión) */}
          {!transaccionAEditar && (
            <div className="flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl mb-4 border border-slate-200 dark:border-zinc-800">
              {(['GASTO', 'INGRESO', 'INVERSION'] as TipoTransaccion[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(prev => ({...prev, tipo: t, categoria_id: ''}))}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all capitalize ${
                    form.tipo === t 
                      ? (t === 'GASTO' ? 'bg-red-500 text-white shadow-md' : t === 'INGRESO' ? 'bg-emerald-500 text-white shadow-md' : 'bg-amber-500 text-white shadow-md') 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t.toLowerCase()}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><Calendar size={16} className="text-slate-400"/> Fecha</label>
              <input type="date" required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className={inputClases} />
            </div>
            <div className="w-1/2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><DollarSign size={16} className="text-slate-400"/> Cantidad (€)</label>
              <input type="number" step="0.01" min="0.01" required value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} className={inputClases} placeholder="0.00" />
            </div>
          </div>
          
          {/* CONDICIONAL: ACTIVO (Si es Inversión) vs CATEGORÍA (Si es Gasto/Ingreso) */}
          {form.tipo === 'INVERSION' ? (
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><Tag size={16} className="text-slate-400"/> Activo de Inversión</label>
              <select value={form.activo_ticker} onChange={e => setForm({...form, activo_ticker: e.target.value})} className={inputClases}>
                {activos.length === 0 && <option value="" disabled>No hay activos registrados...</option>}
                {activos.map(a => <option key={a.ticker} value={a.ticker}>{a.nombre} ({a.ticker})</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><Tag size={16} className="text-slate-400"/> Categoría</label>
              <select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})} className={inputClases}>
                <option value="">Selecciona una categoría...</option>
                {categoriasFiltradas.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
            </div>
          )}

          {/* CUENTA: Aplica a los 3 (Para restar la Inversión) */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><CreditCard size={16} className="text-slate-400"/> Cuenta</label>
            <select value={form.cuenta_id} onChange={e => setForm({...form, cuenta_id: e.target.value})} className={inputClases}>
              {cuentas.length === 0 && <option value="" disabled>Cargando...</option>}
              {cuentas.map(cta => <option key={cta.id} value={cta.id}>{cta.nombre}</option>)}
            </select>
          </div>

          {/* CONDICIONAL: DESCRIPCIÓN Y PENDIENTE (Solo Gastos e Ingresos) */}
          {form.tipo !== 'INVERSION' && (
            <>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1.5"><AlignLeft size={16} className="text-slate-400"/> Descripción</label>
                <textarea rows={2} placeholder="Detalle de la operación..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className={`${inputClases} resize-none`} />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl mt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operación Pendiente</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Aún no reflejada en el banco</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.pendiente} onChange={e => setForm({...form, pendiente: e.target.checked})}/>
                  <div className={`w-11 h-6 bg-slate-300 dark:bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${tema.toggle}`}></div>
                </label>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" disabled={enviando} className={`w-full sm:w-1/2 order-1 sm:order-2 bg-gradient-to-r ${tema.btn} text-white py-2.5 rounded-xl font-semibold shadow-lg active:scale-95 transition-all`}>
              {enviando ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onClose} disabled={enviando} className="w-full sm:w-1/2 order-2 sm:order-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-semibold active:scale-95 transition-all">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}