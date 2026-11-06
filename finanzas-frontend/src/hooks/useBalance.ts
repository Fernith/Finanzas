import { useState, useEffect, useMemo, useCallback } from 'react';
import { balanceApi, operacionesApi } from '../api/client';
import type { FilaCategoriaBalance, OperacionAnual, ResumenMesBalance } from '../types';
import { redondearMoneda } from '../utils/formatters';

export function useBalance() {
  const fechaActualObj = new Date();
  const anioActualReal = fechaActualObj.getFullYear();

  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActualReal);
  const anios = Array.from({ length: anioActualReal - 2025 + 1 }, (_, i) => 2025 + i);

  const [operaciones, setOperaciones] = useState<OperacionAnual[]>([]);
  const [operacionesAnterior, setOperacionesAnterior] = useState<OperacionAnual[]>([]);
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Estado para el mes en curso (no cambia aunque modifiques el año seleccionado)
  const [mesActualStats, setMesActualStats] = useState({ ingresos: 0, gastos: 0 });

  const cargarDatos = useCallback(() => {
    balanceApi.obtenerAnual(anioSeleccionado)
      .then(setOperaciones)
      .catch(() => setOperaciones([]));

    balanceApi.obtenerAnual(anioSeleccionado - 1)
      .then(setOperacionesAnterior)
      .catch(() => setOperacionesAnterior([]));
  }, [anioSeleccionado]);

  const cargarMesActual = useCallback(() => {
    const hoy = new Date();
    const m = hoy.getMonth() + 1;
    const y = hoy.getFullYear();

    Promise.all([
      operacionesApi.listar('INGRESO', m, y).catch(() => []),
      operacionesApi.listar('GASTO', m, y).catch(() => []),
    ]).then(([ingresosData, gastosData]) => {
      const ing = redondearMoneda(
        ingresosData.filter(t => !t.pendiente).reduce((acc, op) => acc + Number(op.cantidad), 0)
      );
      const gas = redondearMoneda(
        gastosData.filter(t => !t.pendiente).reduce((acc, op) => acc + Number(op.cantidad), 0)
      );
      setMesActualStats({ ingresos: ing, gastos: gas });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    cargarMesActual();
  }, [cargarMesActual]);

  useEffect(() => {
    const handler = () => {
      cargarDatos();
      cargarMesActual();
    };
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarDatos, cargarMesActual]);

  const {
    resumenMensual,
    tablaCategoriasGastos,
    tablaCategoriasIngresos,
    totalGastosAnual,
    totalIngresosAnual,
    coloresCategorias,
  } = useMemo(() => {
    const resumen: ResumenMesBalance[] = Array.from({ length: 12 }, (_, i) => ({
      mes: mesesNombres[i],
      ingresos: 0,
      gastos: 0,
      balance: 0,
      categoriasGastos: {},
      categoriasIngresos: {},
    }));

    const gastosPorCat: Record<string, number[]> = {};
    const ingresosPorCat: Record<string, number[]> = {};
    const colores: Record<string, string> = {};
    let totalGastos = 0;
    let totalIngresos = 0;

    operaciones.forEach(op => {
      const mesIdx = parseInt(op.fecha.split('-')[1], 10) - 1;
      const cantidadNum = redondearMoneda(Number(op.cantidad));
      colores[op.categoria] = op.color_categoria || '#94a3b8';

      if (op.tipo_operacion_id === 'INGRESO') {
        resumen[mesIdx].ingresos = redondearMoneda(resumen[mesIdx].ingresos + cantidadNum);
        resumen[mesIdx].balance = redondearMoneda(resumen[mesIdx].balance + cantidadNum);
        resumen[mesIdx].categoriasIngresos[op.categoria] = redondearMoneda(
          (resumen[mesIdx].categoriasIngresos[op.categoria] || 0) + cantidadNum
        );
        if (!ingresosPorCat[op.categoria]) ingresosPorCat[op.categoria] = Array<number>(12).fill(0);
        ingresosPorCat[op.categoria][mesIdx] = redondearMoneda(ingresosPorCat[op.categoria][mesIdx] + cantidadNum);
        totalIngresos = redondearMoneda(totalIngresos + cantidadNum);
      } else if (op.tipo_operacion_id === 'GASTO') {
        resumen[mesIdx].gastos = redondearMoneda(resumen[mesIdx].gastos + cantidadNum);
        resumen[mesIdx].balance = redondearMoneda(resumen[mesIdx].balance - cantidadNum);
        resumen[mesIdx].categoriasGastos[op.categoria] = redondearMoneda(
          (resumen[mesIdx].categoriasGastos[op.categoria] || 0) + cantidadNum
        );
        if (!gastosPorCat[op.categoria]) gastosPorCat[op.categoria] = Array<number>(12).fill(0);
        gastosPorCat[op.categoria][mesIdx] = redondearMoneda(gastosPorCat[op.categoria][mesIdx] + cantidadNum);
        totalGastos = redondearMoneda(totalGastos + cantidadNum);
      }
    });

    const mesActualIdx = new Date().getMonth();

    const procesarTabla = (datosPorCat: Record<string, number[]>, totalGlobal: number): FilaCategoriaBalance[] => {
      return Object.entries(datosPorCat).map(([categoria, mesesArray]) => {
        const totalCat = redondearMoneda(mesesArray.reduce((acc, val) => acc + val, 0));
        // Para la media anual excluimos los meses futuros si el año seleccionado es el actual
        const mesesValidosParaMedia = mesesArray.filter(
          (monto, idx) => monto > 0 && !(anioSeleccionado === anioActualReal && idx > mesActualIdx)
        );
        const media = mesesValidosParaMedia.length > 0
          ? redondearMoneda(mesesValidosParaMedia.reduce((a, b) => a + b, 0) / mesesValidosParaMedia.length)
          : 0;
        const porcentaje = totalGlobal > 0 ? (totalCat / totalGlobal) * 100 : 0;
        return { categoria, meses: mesesArray, total: totalCat, media, porcentaje, color: colores[categoria] };
      }).sort((a, b) => b.total - a.total);
    };

    return {
      resumenMensual: resumen,
      tablaCategoriasGastos: procesarTabla(gastosPorCat, totalGastos),
      tablaCategoriasIngresos: procesarTabla(ingresosPorCat, totalIngresos),
      totalGastosAnual: totalGastos,
      totalIngresosAnual: totalIngresos,
      coloresCategorias: colores,
    };
  }, [operaciones, anioSeleccionado, anioActualReal]);

  const flujoNetoActual = redondearMoneda(totalIngresosAnual - totalGastosAnual);
  const flujoNetoAnterior = useMemo(() => {
    let ing = 0;
    let gas = 0;
    operacionesAnterior.forEach(op => {
      if (op.tipo_operacion_id === 'INGRESO') ing = redondearMoneda(ing + Number(op.cantidad));
      if (op.tipo_operacion_id === 'GASTO') gas = redondearMoneda(gas + Number(op.cantidad));
    });
    return redondearMoneda(ing - gas);
  }, [operacionesAnterior]);

  return {
    anioSeleccionado,
    setAnioSeleccionado,
    anios,
    mesesNombres,
    resumenMensual,
    tablaCategoriasGastos,
    tablaCategoriasIngresos,
    totalGastosAnual,
    totalIngresosAnual,
    coloresCategorias,
    flujoNetoActual,
    flujoNetoAnterior,
    mesActualStats,
  };
}
