import { useState, useEffect, useCallback } from 'react';
import { ajustesApi } from '../api/client';
import type { CategoriaItem, CuentaItem, GrupoItem } from '../types';

export function useAjustes() {
  const [grupos, setGrupos] = useState<GrupoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);

  const cargarGrupos = useCallback(() => {
    ajustesApi.listarGrupos().then(setGrupos).catch(console.error);
  }, []);

  const cargarCategorias = useCallback(() => {
    ajustesApi.listarCategorias().then(setCategorias).catch(console.error);
  }, []);

  const cargarCuentas = useCallback(() => {
    ajustesApi.listarCuentas().then(setCuentas).catch(console.error);
  }, []);

  useEffect(() => {
    cargarGrupos();
    cargarCategorias();
    cargarCuentas();
  }, [cargarGrupos, cargarCategorias, cargarCuentas]);

  const ejecutarAccionEstado = async (target: 'grupos' | 'categorias' | 'cuentas', id: string, tipo: 'activar' | 'desactivar') => {
    try {
      if (target === 'grupos') {
        if (tipo === 'desactivar') await ajustesApi.desactivarGrupo(id);
        else await ajustesApi.activarGrupo(id);
        cargarGrupos();
      } else if (target === 'categorias') {
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

  return { grupos, setGrupos, cargarGrupos, categorias, setCategorias, cuentas, setCuentas, cargarCategorias, cargarCuentas, ejecutarAccionEstado };
}
