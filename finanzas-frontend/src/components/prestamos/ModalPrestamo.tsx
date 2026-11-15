import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { prestamosApi } from '../../api/client';
import { obtenerFechaHoyEsp, redondearMoneda, formatearMoneda } from '../../utils/formatters';
import { contarPagosHastaFechaFin } from '../../hooks/usePrestamos';
import type { CuentaItem, PeriodicidadSuscripcion, Prestamo } from '../../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prestamoAEditar: Prestamo | null;
  cuentas: CuentaItem[];
};

interface FormPrestamo {
  nombre: string;
  cantidad_inicial: string;
  cantidad_pendiente: string;
  cuota_periodica: string;
  periodicidad: PeriodicidadSuscripcion;
  cuenta_id: string;
  fecha_inicio: string;
  fecha_proximo_pago: string;
  fecha_fin: string;
}

export default function ModalPrestamo({ isOpen, onClose, onSuccess, prestamoAEditar, cuentas }: Props) {
  const hoy = obtenerFechaHoyEsp();
  const [pendienteEditadoManual, setPendienteEditadoManual] = useState(false);
  const [proxPagoEditadoManual, setProxPagoEditadoManual] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState<FormPrestamo>({
    nombre: '',
    cantidad_inicial: '',
    cantidad_pendiente: '',
    cuota_periodica: '',
    periodicidad: 'MENSUAL',
    cuenta_id: '',
    fecha_inicio: hoy,
    fecha_proximo_pago: hoy,
    fecha_fin: '',
  });

  const cuentasValidas = useMemo(() => {
    return [...cuentas]
      .filter(
        (c) =>
          (c.activo && c.tipos_operacion?.includes('GASTO')) ||
          (prestamoAEditar && c.id === prestamoAEditar.cuenta_id)
      )
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [cuentas, prestamoAEditar]);

  useEffect(() => {
    if (!isOpen) return;

    if (prestamoAEditar) {
      setPendienteEditadoManual(true);
      setProxPagoEditadoManual(true);
      setForm({
        nombre: prestamoAEditar.nombre,
        cantidad_inicial: String(prestamoAEditar.cantidad_inicial),
        cantidad_pendiente: String(prestamoAEditar.cantidad_pendiente),
        cuota_periodica: String(prestamoAEditar.cuota_periodica),
        periodicidad: prestamoAEditar.periodicidad,
        cuenta_id: prestamoAEditar.cuenta_id,
        fecha_inicio: prestamoAEditar.fecha_inicio,
        fecha_proximo_pago: prestamoAEditar.fecha_proximo_pago,
        fecha_fin: prestamoAEditar.fecha_fin || '',
      });
    } else {
      setPendienteEditadoManual(false);
      setProxPagoEditadoManual(false);
      setForm({
        nombre: '',
        cantidad_inicial: '',
        cantidad_pendiente: '',
        cuota_periodica: '',
        periodicidad: 'MENSUAL',
        cuenta_id: cuentasValidas.length > 0 ? cuentasValidas[0].id : '',
        fecha_inicio: hoy,
        fecha_proximo_pago: hoy,
        fecha_fin: '',
      });
    }
  }, [prestamoAEditar, isOpen, cuentasValidas, hoy]);

  // Recálculo automático de cuota_periodica cuando hay fecha_fin en creación
  const infoCalculadaPorFechaFin = useMemo(() => {
    if (!form.fecha_fin || !form.fecha_proximo_pago) return null;
    const pendienteNum = parseFloat(form.cantidad_pendiente.replace(',', '.'));
    if (isNaN(pendienteNum) || pendienteNum <= 0) return null;
    const nPagos = contarPagosHastaFechaFin(form.fecha_proximo_pago, form.fecha_fin, form.periodicidad);
    const cuota = redondearMoneda(pendienteNum / nPagos);
    return { nPagos, cuota };
  }, [form.fecha_fin, form.fecha_proximo_pago, form.cantidad_pendiente, form.periodicidad]);

  useEffect(() => {
    if (!prestamoAEditar && form.fecha_fin && infoCalculadaPorFechaFin) {
      setForm((prev) => ({
        ...prev,
        cuota_periodica: String(infoCalculadaPorFechaFin.cuota),
      }));
    }
  }, [prestamoAEditar, form.fecha_fin, infoCalculadaPorFechaFin]);

  if (!isOpen) return null;

  const tieneFechaFin = Boolean(form.fecha_fin.trim());
  const tieneCuotaSinFechaFin = !tieneFechaFin && Boolean(form.cuota_periodica.trim());

  const handleCambioCantidadInicial = (valor: string) => {
    setForm((prev) => ({
      ...prev,
      cantidad_inicial: valor,
      cantidad_pendiente: !prestamoAEditar && !pendienteEditadoManual ? valor : prev.cantidad_pendiente,
    }));
  };

  const handleCambioFechaInicio = (valor: string) => {
    setForm((prev) => ({
      ...prev,
      fecha_inicio: valor,
      fecha_proximo_pago: !prestamoAEditar && !proxPagoEditadoManual ? valor : prev.fecha_proximo_pago,
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const inicialNum = redondearMoneda(parseFloat(form.cantidad_inicial.replace(',', '.')));
    const pendienteNum = redondearMoneda(parseFloat(form.cantidad_pendiente.replace(',', '.')));
    const cuotaNum = infoCalculadaPorFechaFin && !prestamoAEditar
      ? infoCalculadaPorFechaFin.cuota
      : redondearMoneda(parseFloat(form.cuota_periodica.replace(',', '.')));

    if (isNaN(inicialNum) || inicialNum <= 0) {
      alert('Introduce una cantidad inicial válida mayor que 0.');
      return;
    }
    if (isNaN(pendienteNum) || pendienteNum < 0) {
      alert('Introduce una cantidad pendiente válida.');
      return;
    }
    if (!form.fecha_fin && (isNaN(cuotaNum) || cuotaNum <= 0)) {
      alert('Debes indicar una cuota periódica o una fecha de fin.');
      return;
    }
    if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        cantidad_inicial: inicialNum,
        cantidad_pendiente: pendienteNum,
        cuota_periodica: isNaN(cuotaNum) ? 0 : cuotaNum,
        periodicidad: form.periodicidad,
        cuenta_id: form.cuenta_id,
        fecha_inicio: form.fecha_inicio,
        fecha_proximo_pago: form.fecha_proximo_pago,
        fecha_fin: form.fecha_fin.trim() ? form.fecha_fin.trim() : null,
        finalizado: pendienteNum <= 0,
      };

      if (prestamoAEditar) {
        await prestamosApi.modificar(prestamoAEditar.id, payload);
      } else {
        await prestamosApi.crear(payload);
      }
      onSuccess();
      onClose();
    } catch {
      alert('Error al guardar el préstamo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-neutral-700 max-h-[92vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 dark:border-neutral-700 flex justify-between items-center bg-slate-50/50 dark:bg-neutral-900/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {prestamoAEditar ? 'Editar Préstamo' : 'Nuevo Préstamo'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Nombre / Servicio
            </label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white text-sm"
              placeholder="Ej: Hipoteca Casa, Préstamo Coche..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Cantidad Inicial (€)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.cantidad_inicial}
                onChange={(e) => handleCambioCantidadInicial(e.target.value)}
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Cantidad Pendiente (€)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.cantidad_pendiente}
                onChange={(e) => {
                  setPendienteEditadoManual(true);
                  setForm({ ...form, cantidad_pendiente: e.target.value });
                }}
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Periodicidad
              </label>
              <select
                value={form.periodicidad}
                onChange={(e) =>
                  setForm({ ...form, periodicidad: e.target.value as PeriodicidadSuscripcion })
                }
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white cursor-pointer text-sm"
              >
                <option value="MENSUAL">Mensual</option>
                <option value="ANUAL">Anual</option>
                <option value="QUINCENAL">Cada 15 Días</option>
                <option value="SEMANAL">Semanal</option>
                <option value="DIARIA">Diaria</option>
                <option value="30_DIAS">Cada 30 Días</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Cuenta de Cobro
              </label>
              <select
                required
                value={form.cuenta_id}
                onChange={(e) => setForm({ ...form, cuenta_id: e.target.value })}
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white cursor-pointer text-sm"
              >
                {cuentasValidas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Fecha de Inicio
              </label>
              <input
                required
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => handleCambioFechaInicio(e.target.value)}
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Fecha Próximo Pago
              </label>
              <input
                required
                type="date"
                value={form.fecha_proximo_pago}
                onChange={(e) => {
                  setProxPagoEditadoManual(true);
                  setForm({ ...form, fecha_proximo_pago: e.target.value });
                }}
                className="w-full p-2.5 bg-slate-100 dark:bg-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/50 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Modo de Amortización (elige Cuota o Fecha Fin)
              </span>
              {prestamoAEditar && tieneFechaFin && infoCalculadaPorFechaFin && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      cuota_periodica: String(infoCalculadaPorFechaFin.cuota),
                    }))
                  }
                  className="text-xs flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                  title="Recalcular cuota según fecha fin"
                >
                  <RotateCcw size={12} /> Recalcular ({formatearMoneda(infoCalculadaPorFechaFin.cuota)} €)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Cuota Periódica (€)
                  </label>
                  {!prestamoAEditar && tieneCuotaSinFechaFin && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, cuota_periodica: '' }))}
                      className="text-[11px] text-slate-400 hover:text-red-500"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={!prestamoAEditar && tieneFechaFin}
                  required={!tieneFechaFin}
                  value={form.cuota_periodica}
                  onChange={(e) => setForm({ ...form, cuota_periodica: e.target.value })}
                  className={`w-full p-2.5 rounded-lg outline-none text-sm ${
                    !prestamoAEditar && tieneFechaFin
                      ? 'bg-slate-200/70 dark:bg-neutral-900 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/50 border border-slate-200 dark:border-neutral-700'
                  }`}
                  placeholder="0.00"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Fecha Fin (Opcional)
                  </label>
                  {tieneFechaFin && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, fecha_fin: '', cuota_periodica: '' }))}
                      className="text-[11px] text-slate-400 hover:text-red-500"
                    >
                      Quitar fecha
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  disabled={!prestamoAEditar && tieneCuotaSinFechaFin}
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  className={`w-full p-2.5 rounded-lg outline-none text-sm ${
                    !prestamoAEditar && tieneCuotaSinFechaFin
                      ? 'bg-slate-200/70 dark:bg-neutral-900 text-slate-400 dark:text-neutral-600 cursor-not-allowed'
                      : 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/50 border border-slate-200 dark:border-neutral-700'
                  }`}
                />
              </div>
            </div>

            {tieneFechaFin && infoCalculadaPorFechaFin && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Con fecha fin fija ({infoCalculadaPorFechaFin.nPagos} cobros restantes), los pagos adelantados reducirán la cuota periódica.
              </p>
            )}
            {!tieneFechaFin && tieneCuotaSinFechaFin && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Con cuota periódica fija, los pagos adelantados mantendrán la cuota y adelantarán la fecha de fin estimada.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 rounded-xl font-bold shadow-md active:scale-95 transition-all"
          >
            <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar Préstamo'}
          </button>
        </form>
      </div>
    </div>
  );
}
