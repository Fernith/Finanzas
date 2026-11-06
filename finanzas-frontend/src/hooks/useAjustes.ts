import { useState, useEffect, useCallback } from 'react';
import { ajustesApi } from '../api/client';
import type { CategoriaItem, CuentaItem } from '../types';

export function useAjustes() {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);

  const cargarCategorias = useCallback(() => {
    ajustesApi.listarCategorias().then(setCategorias).catch(console.error);
  }, []);

  const cargarCuentas = useCallback(() => {
    ajustesApi.listarCuentas().then(setCuentas).catch(console.error);
  }, []);

  useEffect(() => {
    cargarCategorias();
    cargarCuentas();
  }, [cargarCategorias, cargarCuentas]);

  const ejecutarAccionEstado = async (target: 'categorias' | 'cuentas', id: string, tipo: 'activar' | 'desactivar') => {
    try {
      if (target === 'categorias') {
        if (tipo === 'desactivar') await ajustesApi.desactivarCategoria(id);
        else await ajustesApi.activarCategoria(id);
        cargarCategorias();
      } else {
        if (tipo === 'desactivar') await ajustesApi.desactivarCuenta(id);
        else await ajustesApi.activarCuenta(id);
        cargarCuentas();
      }
      return true;
    } catch {
      return false;
    }
  };

  return { categorias, setCategorias, cuentas, setCuentas, cargarCategorias, cargarCuentas, ejecutarAccionEstado };
}
