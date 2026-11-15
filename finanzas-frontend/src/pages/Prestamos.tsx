import { useState, useEffect } from 'react';
import { Landmark, Plus, Pencil, Trash2, History, Calendar, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { usePrestamos, calcularInfoFinalizacion } from '../hooks/usePrestamos';
import { ajustesApi } from '../api/client';
import { formatearMoneda, redondearMoneda } from '../utils/formatters';
import type { CuentaItem, Prestamo } from '../types';
import ModalPrestamo from '../components/prestamos/ModalPrestamo';
import ModalHistorialPrestamo from '../components/prestamos/ModalHistorialPrestamo';
import ModalConfirmacion from '../components/general/ModalConfirmacion';

const ETIQUETAS_PERIODICIDAD: Record<string, string> = {
  MENSUAL: 'Mensual',
  ANUAL: 'Anual',
  QUINCENAL: 'Cada 15 Días',
  SEMANAL: 'Semanal',
  DIARIA: 'Diaria',
  '30_DIAS': 'Cada 30 Días',
};

export default function Prestamos() {
  const { prestamos, cargarPrestamos, eliminarPrestamo, procesarTotales } = usePrestamos();
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  const { totalInicial, totalPendiente, totalPagado, cargaMensual, porcentajeGlobal } = procesarTotales();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [prestamoAEditar, setPrestamoAEditar] = useState<Prestamo | null>(null);
  const [prestamoHistorial, setPrestamoHistorial] = useState<Prestamo | null>(null);
  const [idAEliminar, setIdAEliminar] = useState<string | null>(null);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);

  useEffect(() => {
    ajustesApi.listarCuentas().then(setCuentas).catch(console.error);
  }, []);

  const formatDate = (fecha?: string | null) => (fecha ? fecha.split('-').reverse().join('/') : '—');

  const prestamosFinalizadosCount = prestamos.filter((p) => p.finalizado || p.cantidad_pendiente <= 0).length;
  const prestamosVisibles = prestamos.filter((p) =>
    mostrarFinalizados ? true : !p.finalizado && p.cantidad_pendiente > 0
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12 w-full">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6 border-b border-slate-200 dark:border-neutral-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-rose-100 to-orange-200 dark:from-rose-900/40 dark:to-orange-900/20 rounded-2xl shadow-sm border border-rose-200/50 dark:border-rose-800/50">
            <Landmark className="text-rose-600 dark:text-rose-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Préstamos y Deudas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Control de capital pendiente, amortizaciones y calendario de cuotas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {prestamosFinalizadosCount > 0 && (
            <button
              onClick={() => setMostrarFinalizados(!mostrarFinalizados)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition-all"
            >
              {mostrarFinalizados ? <EyeOff size={16} /> : <Eye size={16} />}
              {mostrarFinalizados ? 'Ocultar finalizados' : `Finalizados (${prestamosFinalizadosCount})`}
            </button>
          )}
          <button
            onClick={() => {
              setPrestamoAEditar(null);
              setModalAbierto(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all text-sm w-full sm:w-auto"
          >
            <Plus size={18} /> Añadir Préstamo
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendiente por Pagar</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatearMoneda(totalPendiente)} €
          </p>
          <p className="text-xs text-slate-400 mt-1">De {formatearMoneda(totalInicial)} € iniciales</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amortizado</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatearMoneda(totalPagado)} €
          </p>
          <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${porcentajeGlobal}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carga Mensual Eq.</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {formatearMoneda(cargaMensual)} €
          </p>
          <p className="text-xs text-slate-400 mt-1">Impacto mensual en liquidez</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progreso Global</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {porcentajeGlobal}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {prestamos.filter((p) => !p.finalizado && p.cantidad_pendiente > 0).length} préstamos activos
          </p>
        </div>
      </div>

      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="md:hidden space-y-4">
        {prestamosVisibles.map((p) => {
          const { cuotasRestantes, fechaFinEstimada, esFechaFija, ultimoPagoImporte } =
            calcularInfoFinalizacion(p);
          const pagado = redondearMoneda(Math.max(0, p.cantidad_inicial - p.cantidad_pendiente));
          const pct =
            p.cantidad_inicial > 0
              ? Math.min(100, Math.round((pagado / p.cantidad_inicial) * 100))
              : 0;

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3 ${
                p.finalizado ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{p.nombre}</h3>
                    {p.finalizado && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        <CheckCircle2 size={10} /> FINALIZADO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.cuenta_nombre} · Inicio: {formatDate(p.fecha_inicio)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPrestamoHistorial(p)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    title="Ver histórico de pagos"
                  >
                    <History size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setPrestamoAEditar(p);
                      setModalAbierto(true);
                    }}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Editar préstamo"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setIdAEliminar(p.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Eliminar préstamo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-neutral-800/50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">Pendiente</span>
                  <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                    {formatearMoneda(p.cantidad_pendiente)} €
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    de {formatearMoneda(p.cantidad_inicial)} €
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cuota ({ETIQUETAS_PERIODICIDAD[p.periodicidad] || p.periodicidad})</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {formatearMoneda(p.cuota_periodica)} €
                  </span>
                  {!esFechaFija && ultimoPagoImporte > 0 && ultimoPagoImporte < p.cuota_periodica && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 block">
                      Última cuota: {formatearMoneda(ultimoPagoImporte)} €
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Próx. pago: <strong>{p.finalizado ? '—' : formatDate(p.fecha_proximo_pago)}</strong>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Fin {esFechaFija ? 'fijo' : 'aprox.'}: <strong>{formatDate(fechaFinEstimada)}</strong> ({cuotasRestantes} cuotas)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {prestamosVisibles.length === 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No hay préstamos activos registrados.
          </div>
        )}
      </div>

      {/* VISTA ORDENADOR (TABLA) */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-700">
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Préstamo / Servicio
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Pendiente / Inicial
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100/50 dark:bg-neutral-800/30">
                  Cuota Periódica
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fecha Fin / Cuotas
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cuenta
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {prestamosVisibles.map((p) => {
                const { cuotasRestantes, fechaFinEstimada, esFechaFija, ultimoPagoImporte } =
                  calcularInfoFinalizacion(p);
                const pagado = redondearMoneda(Math.max(0, p.cantidad_inicial - p.cantidad_pendiente));
                const pct =
                  p.cantidad_inicial > 0
                    ? Math.min(100, Math.round((pagado / p.cantidad_inicial) * 100))
                    : 0;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors ${
                      p.finalizado ? 'opacity-55' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {p.nombre}
                        {p.finalizado && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                            FINALIZADO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> Inicio: {formatDate(p.fecha_inicio)}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-rose-600 dark:text-rose-400">
                        {formatearMoneda(p.cantidad_pendiente)} €
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          / {formatearMoneda(p.cantidad_inicial)} €
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-28 bg-slate-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {pct}% pagado
                        </span>
                      </div>
                    </td>

                    <td className="p-4 bg-slate-50 dark:bg-neutral-800/30">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatearMoneda(p.cuota_periodica)} €
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {ETIQUETAS_PERIODICIDAD[p.periodicidad] || p.periodicidad}
                        {!esFechaFija && ultimoPagoImporte > 0 && ultimoPagoImporte < p.cuota_periodica && (
                          <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Última cuota: {formatearMoneda(ultimoPagoImporte)} €
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {p.finalizado ? '—' : formatDate(p.fecha_proximo_pago)}
                    </td>

                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {formatDate(fechaFinEstimada)}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            esFechaFija
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}
                        >
                          {esFechaFija ? 'FIJA' : 'APROX'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {cuotasRestantes} {cuotasRestantes === 1 ? 'pago restante' : 'pagos restantes'}
                      </span>
                    </td>

                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{p.cuenta_nombre}</td>

                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => setPrestamoHistorial(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="Ver histórico de pagos"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setPrestamoAEditar(p);
                          setModalAbierto(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar préstamo"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setIdAEliminar(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar préstamo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {prestamosVisibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No hay préstamos activos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      <ModalPrestamo
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setPrestamoAEditar(null);
        }}
        onSuccess={cargarPrestamos}
        prestamoAEditar={prestamoAEditar}
        cuentas={cuentas}
      />

      <ModalHistorialPrestamo
        isOpen={Boolean(prestamoHistorial)}
        onClose={() => setPrestamoHistorial(null)}
        prestamo={prestamoHistorial}
      />

      <ModalConfirmacion
        isOpen={Boolean(idAEliminar)}
        onClose={() => setIdAEliminar(null)}
        onConfirm={() => {
          if (idAEliminar) eliminarPrestamo(idAEliminar);
          setIdAEliminar(null);
        }}
        titulo="Eliminar préstamo"
        mensaje="¿Estás seguro de que deseas eliminar este préstamo permanentemente? Los gastos ya registrados en tus operaciones se mantendrán."
      />
    </div>
  );
}
