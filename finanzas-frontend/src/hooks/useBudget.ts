import { useState, useEffect, useCallback, useRef } from 'react';
import { budgetApi } from '../api/client';
import type {
  BudgetConfig,
  CategoriaItem,
  GastoCategoriaReal,
  IngresoBudget,
} from '../types';

export type EstadoGuardadoBudget = 'inactivo' | 'guardando' | 'guardado' | 'error';

const CONFIG_INICIAL: BudgetConfig = {
  modo_ingreso: 'APP',
  ingreso_manual: 0,
  categorias_ingresos_seleccionadas: [],
  ingresos_seleccionados: [],
  categorias_gastos: [],
};

export function useBudget() {
  const [config, setConfig] = useState<BudgetConfig>(CONFIG_INICIAL);
  const [categoriasIngresos, setCategoriasIngresos] = useState<CategoriaItem[]>([]);
  const [categoriasGastos, setCategoriasGastos] = useState<CategoriaItem[]>([]);
  const [ingresosUltimos30Dias, setIngresosUltimos30Dias] = useState<IngresoBudget[]>([]);
  const [gastosMesActual, setGastosMesActual] = useState<GastoCategoriaReal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardadoBudget>('inactivo');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetEstadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const datos = await budgetApi.obtenerDatos();
      const modoNormalizado = datos.config.modo_ingreso === 'MANUAL' ? 'MANUAL' : 'APP';
      setConfig({
        ...datos.config,
        modo_ingreso: modoNormalizado,
      });
      setCategoriasIngresos(datos.categorias_ingresos);
      setCategoriasGastos(datos.categorias_gastos);
      setIngresosUltimos30Dias(datos.ingresos_ultimos_30_dias);
      setGastosMesActual(datos.gastos_mes_actual);
    } catch (error) {
      console.error('Error al cargar datos de budget:', error);
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(false);
  }, [cargarDatos]);

  useEffect(() => {
    const handler = () => {
      cargarDatos(true);
    };
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarDatos]);

  const persistirConfig = useCallback((nuevoConfig: BudgetConfig, delayMs = 350) => {
    setConfig(nuevoConfig);
    setEstadoGuardado('guardando');

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (resetEstadoRef.current) {
      clearTimeout(resetEstadoRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        await budgetApi.guardarConfig(nuevoConfig);
        setEstadoGuardado('guardado');
        resetEstadoRef.current = setTimeout(() => {
          setEstadoGuardado('inactivo');
        }, 2000);
      } catch (error) {
        console.error('Error al guardar configuracion de budget:', error);
        setEstadoGuardado('error');
      }
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (resetEstadoRef.current) clearTimeout(resetEstadoRef.current);
    };
  }, []);

  return {
    config,
    categoriasIngresos,
    categoriasGastos,
    ingresosUltimos30Dias,
    gastosMesActual,
    loading,
    estadoGuardado,
    persistirConfig,
    recargar: cargarDatos,
  };
}
