import { useState, useEffect, useCallback, useRef } from 'react';
import { operacionesApi } from '../api/client';
import type { Transaction } from '../types';

export function useTransacciones(tipo: 'GASTO' | 'INGRESO', month: number, year: number) {
  const [transaccionesAnuales, setTransaccionesAnuales] = useState<Transaction[]>([]);
  const [transacciones, setTransacciones] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const ultimoTerminoBusqueda = useRef('');

  const fetchTransacciones = useCallback(async (searchTerm = '') => {
    ultimoTerminoBusqueda.current = searchTerm;
    setLoading(true);
    try {
      const data = await operacionesApi.listar(tipo, 0, year, searchTerm);
      setTransaccionesAnuales(data);

      if (searchTerm) {
        setTransacciones(data);
      } else {
        setTransacciones(data.filter((t: Transaction) => parseInt(t.fecha.split('-')[1], 10) === month));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [tipo, month, year]);

  useEffect(() => {
    fetchTransacciones(ultimoTerminoBusqueda.current);
  }, [fetchTransacciones]);

  useEffect(() => {
    const handler = () => {
      fetchTransacciones(ultimoTerminoBusqueda.current);
    };
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [fetchTransacciones]);

  const togglePendiente = async (id: string, searchTerm = '') => {
    try {
      await operacionesApi.completar(tipo, id);
      fetchTransacciones(searchTerm);
    } catch (e: unknown) {
      const detalle = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Error al activar operación:', e);
      alert(`No se pudo completar la operación. \nDetalle: ${detalle}`);
    }
  };

  const eliminarTransaccion = async (id: string, searchTerm = '') => {
    try {
      await operacionesApi.eliminar(tipo, id);
      fetchTransacciones(searchTerm);
    } catch (e: unknown) {
      const detalle = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Error al eliminar:', e);
      alert(`No se pudo eliminar la operación. \nDetalle: ${detalle}`);
    }
  };

  return { transaccionesAnuales, transacciones, loading, fetchTransacciones, togglePendiente, eliminarTransaccion };
}
