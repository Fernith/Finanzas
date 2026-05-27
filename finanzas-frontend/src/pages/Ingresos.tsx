import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Plus, Wallet, Clock } from 'lucide-react';
import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import TransactionTable, { type Column } from '../components/TransactionTable';
import ModalConfirmacion from '../components/ModalConfirmacion';
import ModalAgregarIngreso from '../components/ModalAgregarIngreso'; 
import { formatearMoneda } from '../utils/formatters';

export default function Ingresos() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [usarPendientes, setUsarPendientes] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ingresoAEditar, setIngresoAEditar] = useState<any>(null);
  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);

  const cargarIngresos = () => {
    fetch('/api/configuracion').then(res => res.json()).then(data => setUsarPendientes(data.usar_pendientes));
    fetch('/api/ingresos').then(res => res.json()).then(data => setIngresos(data)).catch(() => setIngresos([]));
  };

  useEffect(() => { cargarIngresos(); }, []);

  const { datosGrafico, totalIngresadoReal, totalIngresadoConPendientes } = useMemo(() => {
    const agrupado: Record<string, { valor: number, color: string }> = {};
    let totalReal = 0;
    let totalConPend = 0;

    ingresos.forEach(i => {
      const cantidad = Number(i.cantidad);
      totalConPend += cantidad;

      if (!i.pendiente) {
        totalReal += cantidad;
      }

      // La gráfica ignora los cobros pendientes
      if (usarPendientes && i.pendiente) return;

      if (!agrupado[i.categoria]) {
        agrupado[i.categoria] = { valor: 0, color: i.color };
      }
      agrupado[i.categoria].valor += cantidad;
    });

    const datos = Object.entries(agrupado)
      .map(([name, data]) => ({ name, value: data.valor, color: data.color, fill: data.color }))
      .sort((a, b) => b.value - a.value);

    return { datosGrafico: datos, totalIngresadoReal: totalReal, totalIngresadoConPendientes: totalConPend };
  }, [ingresos, usarPendientes]);

  const columns: Column[] = [
    { key: 'fecha', label: 'FECHA', sortable: true },
    { key: 'cantidad', label: 'CANTIDAD', sortable: true },
    { key: 'categoria', label: 'CATEGORÍA', sortable: true, filterable: true },
    { key: 'cuenta', label: 'CUENTA', sortable: true, filterable: true },
    { key: 'notas', label: 'DESCRIPCIÓN', sortable: false }
  ];

  const confirmarEliminacion = async () => {
    if (!idAEliminar) return;
    try {
      const res = await fetch(`/api/ingresos/${idAEliminar}`, { method: 'DELETE' });
      if (res.ok) cargarIngresos();
    } catch { alert('Error de conexión.'); } finally { setIdAEliminar(null); }
  };

  const handleActivarOperacion = async (id: string) => {
    try {
      const res = await fetch(`/api/operaciones/${id}/completar`, { method: 'PUT' });
      if (res.ok) cargarIngresos();
    } catch { alert('Error al activar la operación'); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-[1600px] mx-auto">
      
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-900/40 rounded-2xl border border-emerald-200/50">
          <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Mis Ingresos</h1>
          <p className="text-sm text-slate-500 mt-1">Controla y analiza tus entradas de dinero</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl min-w-[240px] flex items-center gap-6 shadow-sm">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-xl"><Wallet size={32} /></div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Ingresado Real</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{formatearMoneda(totalIngresadoReal)} €</p>
          </div>
        </div>

        {usarPendientes && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/30 p-6 rounded-2xl min-w-[240px] flex items-center gap-6 shadow-sm border-dashed">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl"><Clock size={32} /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Estimado (Con Pendientes)</p>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{formatearMoneda(totalIngresadoConPendientes)} €</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Listado de Transacciones</h2>
            <button onClick={() => { setIngresoAEditar(null); setModalAbierto(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-md">
              <Plus size={16} /> Agregar Ingreso
            </button>
          </div>
          
          <TransactionTable 
            columns={columns} 
            data={ingresos} 
            colorTheme="emerald"
            usarPendientes={usarPendientes}
            onEdit={(i) => { setIngresoAEditar(i); setModalAbierto(true); }}
            onDelete={(id) => setIdAEliminar(id)}
            onActivar={handleActivarOperacion}
          />
        </div>

        <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm sticky top-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Resumen por Categoría</h2>
          <div className="h-64 w-full">
            {datosGrafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGrafico} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" label={({ percent }: any) => percent !== undefined ? `${(percent * 100).toFixed(0)}%` : ''} />
                  <Tooltip formatter={(value: any) => `${formatearMoneda(Number(value))} €`} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos reales para graficar</div>
            )}
          </div>
          <div className="mt-6 space-y-3 max-h-64 overflow-y-auto pr-2">
            {datosGrafico.map(item => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatearMoneda(item.value)} €</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ModalAgregarIngreso isOpen={modalAbierto} onClose={() => { setModalAbierto(false); setIngresoAEditar(null); }} onSuccess={cargarIngresos} ingresoAEditar={ingresoAEditar} />
      <ModalConfirmacion isOpen={!!idAEliminar} onClose={() => setIdAEliminar(null)} onConfirm={confirmarEliminacion} mensaje="¿Estás seguro de que deseas eliminar este ingreso permanentemente?" />
    </div>
  );
}