import { useState, useEffect, useMemo, useCallback } from 'react';
import { ahorrosApi } from '../api/client';
import type { MetaAhorro, ResumenAhorros } from '../types';
import { redondearMoneda } from '../utils/formatters';

export function useAhorros() {
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [resumen, setResumen] = useState<ResumenAhorros>({ dinero_liquido: 0, dinero_invertido: 0 });

  const cargarDatos = useCallback(() => {
    ahorrosApi.listarMetas().then(setMetas).catch(console.error);
    ahorrosApi.obtenerResumen().then(setResumen).catch(console.error);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const handler = () => cargarDatos();
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarDatos]);

  // Cálculos globales redondeados a 2 decimales
  const totalReservadoMetas = useMemo(
    () => redondearMoneda(metas.reduce((acc, m) => acc + (Number(m.ahorrado) || 0), 0)),
    [metas]
  );
  const dineroDisponibleGastar = redondearMoneda(resumen.dinero_liquido - totalReservadoMetas);

  // Métricas para la cabecera
  const objetivoTotal = useMemo(
    () => redondearMoneda(metas.reduce((acc, m) => acc + (Number(m.objetivo) || 0), 0)),
    [metas]
  );
  const dineroPorAhorrar = redondearMoneda(Math.max(0, objetivoTotal - totalReservadoMetas));
  const progresoGlobal = objetivoTotal > 0 ? (totalReservadoMetas / objetivoTotal) * 100 : 0;

  const eliminarMeta = async (id: string) => {
    try {
      await ahorrosApi.eliminarMeta(id);
      cargarDatos();
      return true;
    } catch {
      return false;
    }
  };

  return {
    metas,
    resumen,
    totalReservadoMetas,
    dineroDisponibleGastar,
    objetivoTotal,
    dineroPorAhorrar,
    progresoGlobal,
    cargarDatos,
    eliminarMeta,
  };
}
