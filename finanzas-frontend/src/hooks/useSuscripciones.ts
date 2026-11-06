import { useState, useEffect, useCallback } from 'react';
import { suscripcionesApi } from '../api/client';
import type { Suscripcion } from '../types';
import { obtenerFechaHoyEsp, redondearMoneda } from '../utils/formatters';

export function useSuscripciones() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);

  const cargarSuscripciones = useCallback(() => {
    suscripcionesApi.listar().then(setSuscripciones).catch(console.error);
  }, []);

  useEffect(() => {
    cargarSuscripciones();
  }, [cargarSuscripciones]);

  const eliminarSuscripcion = async (id: string) => {
    try {
      await suscripcionesApi.eliminar(id);
      cargarSuscripciones();
    } catch (error) {
      console.error(error);
    }
  };

  const procesarTotales = () => {
    let gastoMensual = 0;
    let gastoAnual = 0;
    let gastoMesCurso = 0;

    const hoyEsp = obtenerFechaHoyEsp();
    const [anioActualStr, mesActualStr] = hoyEsp.split('-');
    const anioActual = Number(anioActualStr);
    const mesActual = Number(mesActualStr);

    suscripciones.filter(s => Boolean(s.activo)).forEach(s => {
      let m = 0;
      let a = 0;
      let mc = 0;
      const cantidadNum = Number(s.cantidad);

      const [anioProxStr, mesProxStr] = s.fecha_proxima_renovacion.split('-');
      const anioProx = Number(anioProxStr);
      const mesProx = Number(mesProxStr);

      if (s.periodicidad === 'MENSUAL') {
        m = cantidadNum;
        a = m * 12;
        if (anioProx < anioActual || (anioProx === anioActual && mesProx <= mesActual) || (anioProx === anioActual && mesProx === mesActual + 1 && s.fecha_inicio <= hoyEsp) || (mesActual === 12 && anioProx === anioActual + 1 && mesProx === 1 && s.fecha_inicio <= hoyEsp)) {
          mc = m;
        }
      } else if (s.periodicidad === 'ANUAL') {
        a = cantidadNum;
        m = a / 12;
        const tocaEsteMes =
          (anioProx === anioActual && mesProx === mesActual) ||
          (anioProx === anioActual + 1 && mesProx === mesActual && s.fecha_inicio <= hoyEsp);
        if (tocaEsteMes) {
          mc = a;
        }
      } else if (s.periodicidad === '30_DIAS') {
        m = cantidadNum * (365 / 30) / 12;
        a = cantidadNum * (365 / 30);
        if (anioProx === anioActual && mesProx === mesActual) {
          mc = cantidadNum;
        } else if (s.fecha_inicio <= hoyEsp) {
          const fechaProx = new Date(`${s.fecha_proxima_renovacion}T12:00:00`);
          fechaProx.setDate(fechaProx.getDate() - 30);
          if (fechaProx.getFullYear() === anioActual && fechaProx.getMonth() + 1 === mesActual) {
            mc = cantidadNum;
          }
        }
      }

      gastoMensual += m;
      gastoAnual += a;
      gastoMesCurso += mc;
    });

    return {
      gastoMensual: redondearMoneda(gastoMensual),
      gastoAnual: redondearMoneda(gastoAnual),
      gastoMesCurso: redondearMoneda(gastoMesCurso),
    };
  };

  return { suscripciones, cargarSuscripciones, eliminarSuscripcion, procesarTotales };
}
