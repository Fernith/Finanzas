import { useState, useEffect, useMemo, useCallback } from 'react';

export function useBalance() {
  const fechaActualObj = new Date();
  const anioActualReal = fechaActualObj.getFullYear();
  
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActualReal);
  const años = Array.from({ length: anioActualReal - 2025 + 1 }, (_, i) => 2025 + i);

  const [operaciones, setOperaciones] = useState<any[]>([]);
  const [operacionesAnterior, setOperacionesAnterior] = useState<any[]>([]);
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // NUEVO: Estado estático para el mes en curso (no cambia aunque modifiques el año)
  const [mesActualStats, setMesActualStats] = useState({ ingresos: 0, gastos: 0 });

  const cargarDatos = useCallback(() => {
    fetch(`/api/balance/anual?anio=${anioSeleccionado}`)
      .then(res => res.json()).then(data => setOperaciones(data)).catch(() => setOperaciones([]));
      
    fetch(`/api/balance/anual?anio=${anioSeleccionado - 1}`)
      .then(res => res.json()).then(data => setOperacionesAnterior(data)).catch(() => setOperacionesAnterior([]));
  }, [anioSeleccionado]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // NUEVO: Efecto que se ejecuta SOLO UNA VEZ para calcular el mes en curso real
  useEffect(() => {
    const hoy = new Date();
    const m = hoy.getMonth() + 1;
    const y = hoy.getFullYear();

    Promise.all([
      fetch(`/api/ingresos?mes=${m}&anio=${y}`).then(res => res.ok ? res.json() : []),
      fetch(`/api/gastos?mes=${m}&anio=${y}`).then(res => res.ok ? res.json() : [])
    ]).then(([ingresosData, gastosData]) => {
      // Sumamos solo las operaciones que ya están completadas
      const ing = ingresosData.filter((t: any) => !t.pendiente).reduce((acc: number, op: any) => acc + Number(op.cantidad), 0);
      const gas = gastosData.filter((t: any) => !t.pendiente).reduce((acc: number, op: any) => acc + Number(op.cantidad), 0);
      setMesActualStats({ ingresos: ing, gastos: gas });
    }).catch(console.error);
  }, []);

  const { 
    resumenMensual, tablaCategoriasGastos, tablaCategoriasIngresos, 
    totalGastosAnual, totalIngresosAnual, coloresCategorias
  } = useMemo(() => {
    const resumen = Array.from({ length: 12 }, (_, i) => ({ 
      mes: mesesNombres[i], ingresos: 0, gastos: 0, balance: 0, 
      categoriasGastos: {} as Record<string, number>, categoriasIngresos: {} as Record<string, number>
    }));
    
    const gastosPorCat: Record<string, number[]> = {};
    const ingresosPorCat: Record<string, number[]> = {};
    const colores: Record<string, string> = {};
    let totalGastos = 0; let totalIngresos = 0;

    operaciones.forEach(op => {
      const mesIdx = parseInt(op.fecha.split('-')[1]) - 1;
      const cantidadStr = Number(op.cantidad);
      colores[op.categoria] = op.color_categoria || '#94a3b8';

      if (op.tipo_operacion_id === 'INGRESO') {
        resumen[mesIdx].ingresos += cantidadStr;
        resumen[mesIdx].balance += cantidadStr;
        resumen[mesIdx].categoriasIngresos[op.categoria] = (resumen[mesIdx].categoriasIngresos[op.categoria] || 0) + cantidadStr;
        if (!ingresosPorCat[op.categoria]) ingresosPorCat[op.categoria] = Array(12).fill(0);
        ingresosPorCat[op.categoria][mesIdx] += cantidadStr;
        totalIngresos += cantidadStr;
      } else if (op.tipo_operacion_id === 'GASTO') {
        resumen[mesIdx].gastos += cantidadStr;
        resumen[mesIdx].balance -= cantidadStr;
        resumen[mesIdx].categoriasGastos[op.categoria] = (resumen[mesIdx].categoriasGastos[op.categoria] || 0) + cantidadStr;
        if (!gastosPorCat[op.categoria]) gastosPorCat[op.categoria] = Array(12).fill(0);
        gastosPorCat[op.categoria][mesIdx] += cantidadStr;
        totalGastos += cantidadStr;
      }
    });

    const procesarTabla = (datosPorCat: Record<string, number[]>, totalGlobal: number) => {
      return Object.entries(datosPorCat).map(([categoria, mesesArray]) => {
        const totalCat = mesesArray.reduce((acc, val) => acc + val, 0);
        // Para la media anual excluimos los meses futuros si el año seleccionado es el actual
        const mesesValidosParaMedia = mesesArray.filter((monto, idx) => monto > 0 && !(anioSeleccionado === anioActualReal && idx > fechaActualObj.getMonth()));
        const media = mesesValidosParaMedia.length > 0 ? (mesesValidosParaMedia.reduce((a, b) => a + b, 0) / mesesValidosParaMedia.length) : 0;
        const porcentaje = totalGlobal > 0 ? (totalCat / totalGlobal) * 100 : 0;
        return { categoria, meses: mesesArray, total: totalCat, media, porcentaje, color: colores[categoria] };
      }).sort((a, b) => b.total - a.total);
    };

    return { 
      resumenMensual: resumen, 
      tablaCategoriasGastos: procesarTabla(gastosPorCat, totalGastos), 
      tablaCategoriasIngresos: procesarTabla(ingresosPorCat, totalIngresos), 
      totalGastosAnual: totalGastos, totalIngresosAnual: totalIngresos,
      coloresCategorias: colores
    };
  }, [operaciones, anioSeleccionado, anioActualReal]);

  const flujoNetoActual = totalIngresosAnual - totalGastosAnual;
  const flujoNetoAnterior = useMemo(() => {
    let ing = 0; let gas = 0;
    operacionesAnterior.forEach(op => {
      if(op.tipo_operacion_id === 'INGRESO') ing += Number(op.cantidad);
      if(op.tipo_operacion_id === 'GASTO') gas += Number(op.cantidad);
    });
    return ing - gas;
  }, [operacionesAnterior]);

  return {
    anioSeleccionado, setAnioSeleccionado, años, mesesNombres,
    resumenMensual, tablaCategoriasGastos, tablaCategoriasIngresos, 
    totalGastosAnual, totalIngresosAnual, coloresCategorias,
    flujoNetoActual, flujoNetoAnterior, mesActualStats
  };
}