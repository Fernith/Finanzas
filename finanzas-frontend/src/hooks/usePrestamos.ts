import { useState, useEffect, useCallback } from 'react';
import { prestamosApi } from '../api/client';
import type { PeriodicidadSuscripcion, Prestamo } from '../types';
import { obtenerFechaHoyEsp, redondearMoneda } from '../utils/formatters';

export function avanzarFechaPorPeriodicidad(
  fechaISO: string,
  periodicidad: PeriodicidadSuscripcion,
  pasos = 1
): string {
  if (!fechaISO || pasos <= 0) return fechaISO;
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) return fechaISO;
  const [anio, mes, dia] = partes;
  const d = new Date(anio, mes - 1, dia, 12, 0, 0);

  if (periodicidad === 'MENSUAL') {
    d.setMonth(d.getMonth() + pasos);
  } else if (periodicidad === 'ANUAL') {
    d.setFullYear(d.getFullYear() + pasos);
  } else if (periodicidad === '30_DIAS') {
    d.setDate(d.getDate() + 30 * pasos);
  } else if (periodicidad === 'QUINCENAL') {
    d.setDate(d.getDate() + 15 * pasos);
  } else if (periodicidad === 'SEMANAL') {
    d.setDate(d.getDate() + 7 * pasos);
  } else if (periodicidad === 'DIARIA') {
    d.setDate(d.getDate() + pasos);
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function contarPagosHastaFechaFin(
  fechaProximoPago: string,
  fechaFin: string,
  periodicidad: PeriodicidadSuscripcion
): number {
  if (!fechaProximoPago || !fechaFin) return 1;
  if (fechaFin <= fechaProximoPago) return 1;

  let count = 0;
  let cursor = fechaProximoPago;
  const maxIter = 5000;

  while (cursor <= fechaFin && count < maxIter) {
    count += 1;
    const siguiente = avanzarFechaPorPeriodicidad(cursor, periodicidad, 1);
    if (siguiente <= cursor) break;
    cursor = siguiente;
  }

  return Math.max(1, count);
}

export function calcularEquivalenteMensualPrestamo(p: Prestamo): number {
  const cuota = Math.min(p.cuota_periodica, p.cantidad_pendiente);
  if (p.periodicidad === 'MENSUAL') return cuota;
  if (p.periodicidad === 'ANUAL') return cuota / 12;
  if (p.periodicidad === 'QUINCENAL') return (cuota * (365 / 15)) / 12;
  if (p.periodicidad === 'SEMANAL') return (cuota * (365 / 7)) / 12;
  if (p.periodicidad === 'DIARIA') return (cuota * 365) / 12;
  return (cuota * (365 / 30)) / 12;
}

export function calcularInfoFinalizacion(p: Prestamo): {
  cuotasRestantes: number;
  fechaFinEstimada: string | null;
  esFechaFija: boolean;
  ultimoPagoImporte: number;
} {
  if (p.finalizado || p.cantidad_pendiente <= 0) {
    return {
      cuotasRestantes: 0,
      fechaFinEstimada: p.fecha_fin || null,
      esFechaFija: Boolean(p.fecha_fin),
      ultimoPagoImporte: 0,
    };
  }

  if (p.fecha_fin) {
    const cuotasRestantes = contarPagosHastaFechaFin(p.fecha_proximo_pago, p.fecha_fin, p.periodicidad);
    return {
      cuotasRestantes,
      fechaFinEstimada: p.fecha_fin,
      esFechaFija: true,
      ultimoPagoImporte: p.cuota_periodica,
    };
  }

  if (p.cuota_periodica <= 0) {
    return {
      cuotasRestantes: 0,
      fechaFinEstimada: null,
      esFechaFija: false,
      ultimoPagoImporte: 0,
    };
  }

  const pendiente = redondearMoneda(p.cantidad_pendiente);
  const cuota = redondearMoneda(p.cuota_periodica);
  const cuotasRestantes = Math.ceil(pendiente / cuota);
  const fechaFinEstimada = avanzarFechaPorPeriodicidad(
    p.fecha_proximo_pago,
    p.periodicidad,
    Math.max(0, cuotasRestantes - 1)
  );
  const resto = redondearMoneda(pendiente - (cuotasRestantes - 1) * cuota);

  return {
    cuotasRestantes,
    fechaFinEstimada,
    esFechaFija: false,
    ultimoPagoImporte: resto > 0 ? resto : cuota,
  };
}

export function usePrestamos() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarPrestamos = useCallback(() => {
    setCargando(true);
    prestamosApi
      .listar()
      .then(setPrestamos)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargarPrestamos();
    const handleActualizar = () => cargarPrestamos();
    window.addEventListener('actualizarTransacciones', handleActualizar);
    return () => window.removeEventListener('actualizarTransacciones', handleActualizar);
  }, [cargarPrestamos]);

  const eliminarPrestamo = async (id: string) => {
    try {
      await prestamosApi.eliminar(id);
      cargarPrestamos();
    } catch (error) {
      console.error(error);
    }
  };

  const procesarTotales = () => {
    const activos = prestamos.filter((p) => !p.finalizado && p.cantidad_pendiente > 0);
    let totalInicial = 0;
    let totalPendiente = 0;
    let cargaMensual = 0;
    let gastoMesCurso = 0;

    const hoyEsp = obtenerFechaHoyEsp();
    const [anioActualStr, mesActualStr] = hoyEsp.split('-');
    const anioActual = Number(anioActualStr);
    const mesActual = Number(mesActualStr);

    activos.forEach((p) => {
      const pendienteNum = Number(p.cantidad_pendiente);
      const cuotaNum = Math.min(Number(p.cuota_periodica), pendienteNum);

      totalInicial += Number(p.cantidad_inicial);
      totalPendiente += pendienteNum;
      cargaMensual += calcularEquivalenteMensualPrestamo(p);

      const [anioProxStr, mesProxStr] = p.fecha_proximo_pago.split('-');
      const anioProx = Number(anioProxStr);
      const mesProx = Number(mesProxStr);

      let mc = 0;
      if (p.periodicidad === 'MENSUAL') {
        if (
          anioProx < anioActual ||
          (anioProx === anioActual && mesProx <= mesActual) ||
          (anioProx === anioActual && mesProx === mesActual + 1 && p.fecha_inicio <= hoyEsp) ||
          (mesActual === 12 && anioProx === anioActual + 1 && mesProx === 1 && p.fecha_inicio <= hoyEsp)
        ) {
          mc = cuotaNum;
        }
      } else if (p.periodicidad === 'ANUAL') {
        const tocaEsteMes =
          (anioProx === anioActual && mesProx === mesActual) ||
          (anioProx === anioActual + 1 && mesProx === mesActual && p.fecha_inicio <= hoyEsp);
        if (tocaEsteMes) {
          mc = cuotaNum;
        }
      } else {
        const diasIntervalo =
          p.periodicidad === '30_DIAS'
            ? 30
            : p.periodicidad === 'QUINCENAL'
              ? 15
              : p.periodicidad === 'SEMANAL'
                ? 7
                : 1;
        if (anioProx === anioActual && mesProx === mesActual) {
          mc = Math.min(pendienteNum, cuotaNum * (diasIntervalo < 30 ? Math.floor(30 / diasIntervalo) : 1));
        } else if (p.fecha_inicio <= hoyEsp) {
          const fechaProx = new Date(`${p.fecha_proximo_pago}T12:00:00`);
          fechaProx.setDate(fechaProx.getDate() - diasIntervalo);
          if (fechaProx.getFullYear() === anioActual && fechaProx.getMonth() + 1 === mesActual) {
            mc = cuotaNum;
          }
        }
      }

      gastoMesCurso += mc;
    });

    const totalPagado = Math.max(0, totalInicial - totalPendiente);
    const porcentajeGlobal = totalInicial > 0 ? Math.min(100, Math.round((totalPagado / totalInicial) * 100)) : 0;

    return {
      totalInicial: redondearMoneda(totalInicial),
      totalPendiente: redondearMoneda(totalPendiente),
      totalPagado: redondearMoneda(totalPagado),
      cargaMensual: redondearMoneda(cargaMensual),
      gastoMesCurso: redondearMoneda(gastoMesCurso),
      porcentajeGlobal,
    };
  };

  return {
    prestamos,
    cargando,
    cargarPrestamos,
    eliminarPrestamo,
    procesarTotales,
  };
}
