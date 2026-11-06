import { useState, useEffect, useCallback, useMemo } from 'react';
import { inversionesApi } from '../api/client';
import type { Activo, ActivoConTransacciones, TransaccionInversion } from '../types';
import { redondearMoneda } from '../utils/formatters';

export function useInversiones() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionInversion[]>([]);

  const cargarDatos = useCallback(() => {
    inversionesApi.listarActivos().then(setActivos).catch(console.error);
    inversionesApi.listarTransacciones().then(setTransacciones).catch(console.error);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    const handler = () => cargarDatos();
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarDatos]);

  const eliminarTransaccion = async (id: string) => {
    try {
      await inversionesApi.eliminarTransaccion(id);
      cargarDatos();
    } catch (error) {
      console.error(error);
    }
  };

  const totalInvertido = useMemo(() => {
    return redondearMoneda(transacciones.reduce((acc, t) => acc + (Number(t.euros_invertidos) || 0), 0));
  }, [transacciones]);

  const activosConTransacciones = useMemo<ActivoConTransacciones[]>(() => {
    return activos.map(activo => {
      const transActivo = transacciones.filter(t => t.activo_ticker === activo.ticker);
      const total = redondearMoneda(transActivo.reduce((acc, t) => acc + (Number(t.euros_invertidos) || 0), 0));
      return { ...activo, transacciones: transActivo, total_invertido: total };
    }).sort((a, b) => b.total_invertido - a.total_invertido);
  }, [activos, transacciones]);

  const flujoMensual = useMemo(() => {
    const flow: Record<string, number> = {};
    transacciones.forEach(t => {
      const monthYear = t.fecha_compra.slice(0, 7);
      flow[monthYear] = redondearMoneda((flow[monthYear] || 0) + Number(t.euros_invertidos));
    });

    return Object.entries(flow)
      .map(([mes, cantidad]) => ({ mes, cantidad }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [transacciones]);

  return {
    activos,
    transacciones,
    activosConTransacciones,
    totalInvertido,
    flujoMensual,
    cargarDatos,
    eliminarTransaccion,
  };
}
