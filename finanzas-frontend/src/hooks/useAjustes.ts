import { useState, useEffect, useCallback } from 'react';

export function useAjustes() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);

  const cargarCategorias = useCallback(() => { fetch('/api/ajustes/categorias').then(res => res.json()).then(data => setCategorias(data)); }, []);
  const cargarCuentas = useCallback(() => { fetch('/api/ajustes/cuentas').then(res => res.json()).then(data => setCuentas(data)); }, []);

  useEffect(() => { cargarCategorias(); cargarCuentas(); }, [cargarCategorias, cargarCuentas]);

  const ejecutarAccionEstado = async (target: 'categorias' | 'cuentas', id: string, tipo: 'activar' | 'desactivar') => {
    const url = tipo === 'desactivar' ? `/api/ajustes/${target}/${id}` : `/api/ajustes/${target}/${id}/activar`;
    try {
      const res = await fetch(url, { method: tipo === 'desactivar' ? 'DELETE' : 'PUT' });
      if (res.ok) {
        if (target === 'categorias') cargarCategorias();
        if (target === 'cuentas') cargarCuentas();
        return true;
      }
      return false;
    } catch { return false; }
  };

  return { categorias, setCategorias, cuentas, setCuentas, cargarCategorias, cargarCuentas, ejecutarAccionEstado };
}