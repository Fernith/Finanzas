import React, { useState, useEffect } from 'react';
import { X, Save, Wallet } from 'lucide-react';

// Ahora aceptamos "activoTicker" por si estamos creando una nueva transacción desde cero
export default function ModalTransaccionInversion({ isOpen, onClose, onSuccess, transaccionAEditar, activoTicker }: any) {
  const [fecha, setFecha] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Cargamos el listado de cuentas bancarias
  useEffect(() => {
    if (isOpen) {
      fetch('/api/ajustes/cuentas')
        .then(r => r.json())
        .then(setCuentas)
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (transaccionAEditar && isOpen) {
      setFecha(transaccionAEditar.fecha_compra);
      setCantidad(transaccionAEditar.euros_invertidos.toString());
      setCuentaId(transaccionAEditar.cuenta_id || '');
    } else if (isOpen) {
      setFecha(new Date().toISOString().split('T')[0]);
      setCantidad('');
      setCuentaId('');
    }
  }, [transaccionAEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    const payload = {
      fecha_compra: fecha,
      euros_invertidos: Number(cantidad),
      // Si estamos editando mantenemos su ticker, si es nueva cogemos el ticker del botón
      activo_ticker: transaccionAEditar?.activo_ticker || activoTicker,
      cuenta_id: cuentaId
    };

    const url = transaccionAEditar 
      ? `/api/inversiones/transacciones/${transaccionAEditar.id}` 
      : `/api/inversiones/transacciones`;
      
    const method = transaccionAEditar ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method, 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(payload)
      });
      if (res.ok) { 
        onSuccess(); 
        onClose(); 
      } else { 
        const errorMsg = await res.text();
        alert(`Error al guardar: ${errorMsg}`); 
      }
    } catch { 
      alert('Error de red al conectar con el servidor'); 
    } finally { 
      setEnviando(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
            {transaccionAEditar ? 'Modificar Compra' : 'Nueva Inversión'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Fecha de Compra</label>
            <input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Cuenta Origen</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400"><Wallet size={16} /></div>
              <select required value={cuentaId} onChange={e => setCuentaId(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none">
                <option value="" disabled>Selecciona una cuenta</option>
                {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Euros Invertidos (€)</label>
            <input type="number" step="0.01" required value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
          </div>
          
          <button type="submit" disabled={enviando} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
            <Save size={18}/> {enviando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}