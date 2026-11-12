import { useState, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Cloud,
  Check,
  Loader2,
  AlertCircle,
  Database,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useBudget } from '../hooks/useBudget';
import {
  formatearMoneda,
  obtenerColorTextoParaFondo,
  redondearMoneda,
} from '../utils/formatters';
import type {
  BudgetCategoriaGastoConfig,
  CategoriaItem,
  IngresoBudget,
  ModoIngresoBudget,
} from '../types';

interface InfoColorVisual {
  colorOriginal: string;
  colorVisible: string;
  textoBadge: string;
  bordeBadge: string;
  sombraBadge: string;
}

function analizarColorCategoria(
  rawHex: string | null | undefined,
   fallbackHex: string,
  esModoOscuro: boolean,
): InfoColorVisual {
  const hexLimpio = (rawHex && rawHex.trim() !== '' ? rawHex.trim() : fallbackHex).replace('#', '');
  const r = parseInt(
    hexLimpio.length === 3 ? hexLimpio.slice(0, 1).repeat(2) : hexLimpio.slice(0, 2),
    16,
  ) || 0;
  const g = parseInt(
    hexLimpio.length === 3 ? hexLimpio.slice(1, 2).repeat(2) : hexLimpio.slice(2, 4),
    16,
  ) || 0;
  const b = parseInt(
    hexLimpio.length === 3 ? hexLimpio.slice(2, 3).repeat(2) : hexLimpio.slice(4, 6),
    16,
  ) || 0;

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const colorOriginal = `#${hexLimpio.length === 3 ? hexLimpio.split('').map((c) => c + c).join('') : hexLimpio}`;
  const esMuyOscuro = yiq < 55;
  const esMuyClaro = yiq > 230;

  // Si el color es negro o muy oscuro y estamos en modo oscuro, creamos un acento visible luminoso
  // para barras, bordes e iconos, y anadimos un anillo claro al badge para que destaque sobre negro.
  if (esMuyOscuro && esModoOscuro) {
    const rClaro = Math.min(255, Math.max(r + 175, 190));
    const gClaro = Math.min(255, Math.max(g + 185, 200));
    const bClaro = Math.min(255, Math.max(b + 200, 215));
    const colorVisible = `rgb(${rClaro}, ${gClaro}, ${bClaro})`;
    return {
      colorOriginal,
      colorVisible,
      textoBadge: '#ffffff',
      bordeBadge: '1px solid rgba(255, 255, 255, 0.45)',
      sombraBadge: '0 0 10px rgba(255, 255, 255, 0.14)',
    };
  }

  if (esMuyClaro && !esModoOscuro) {
    return {
      colorOriginal,
      colorVisible: '#475569',
      textoBadge: '#0f172a',
      bordeBadge: '1px solid rgba(15, 23, 42, 0.25)',
      sombraBadge: '0 1px 2px rgba(0, 0, 0, 0.06)',
    };
  }

  return {
    colorOriginal,
    colorVisible: colorOriginal,
    textoBadge: obtenerColorTextoParaFondo(colorOriginal),
    bordeBadge: esModoOscuro
      ? '1px solid rgba(255, 255, 255, 0.15)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    sombraBadge: '0 1px 3px rgba(0, 0, 0, 0.12)',
  };
}

function normalizarEntradaDecimal(valor: string): string | null {
  const reemplazado = valor.replace(',', '.');
  if (reemplazado === '' || reemplazado === '-') return reemplazado;
  const regex = /^-?\d*(\.\d{0,2})?$/;
  if (!regex.test(reemplazado)) return null;
  return reemplazado;
}

function formatearInputNumero(valor: number): string {
  const redondeado = redondearMoneda(valor);
  if (Object.is(redondeado, -0)) return '0';
  return Number(redondeado.toFixed(2)).toString();
}

export default function Budget() {
  const { perfil, temaActual } = useConfig();
  const esModoOscuro = temaActual === 'oscuro';

  const {
    config,
    categoriasIngresos,
    categoriasGastos,
    ingresosUltimos30Dias,
    gastosMesActual,
    loading,
    estadoGuardado,
    persistirConfig,
  } = useBudget();

  // Estado para desplegables de categorias de ingresos
  const [categoriasDesplegadas, setCategoriasDesplegadas] = useState<Record<string, boolean>>({});

  // Estado local para edicion fluida de inputs sin perder el punto decimal ni el signo menos
  const [edicionManualIngreso, setEdicionManualIngreso] = useState<string | null>(null);
  const [edicionGasto, setEdicionGasto] = useState<{
    categoriaId: string;
    campo: 'EUR' | 'PCT';
    valorTexto: string;
  } | null>(null);

  const obtenerColorCat = (cat: CategoriaItem, fallback: string): InfoColorVisual => {
    const raw = perfil === 'Tipo A' ? (cat.color_grupo || cat.color) : cat.color;
    return analizarColorCategoria(raw, fallback, esModoOscuro);
  };

  // Agrupacion de ingresos de los ultimos 30 dias por categoria_id
  const ingresosPorCategoria = useMemo(() => {
    const mapa = new Map<string, IngresoBudget[]>();
    for (const ing of ingresosUltimos30Dias) {
      const lista = mapa.get(ing.categoria_id) ?? [];
      lista.push(ing);
      mapa.set(ing.categoria_id, lista);
    }
    return mapa;
  }, [ingresosUltimos30Dias]);

  // Determina si una operacion de ingreso individual esta seleccionada
  const estaIngresoSeleccionado = (ing: IngresoBudget): boolean => {
    return (
      config.categorias_ingresos_seleccionadas.includes(ing.categoria_id) ||
      config.ingresos_seleccionados.includes(ing.id)
    );
  };

  // Calculo de Ingresos Totales segun el modo ("APP" por defecto o "MANUAL")
  const ingresosTotales = useMemo(() => {
    if (config.modo_ingreso === 'MANUAL') {
      return redondearMoneda(config.ingreso_manual);
    }
    let suma = 0;
    for (const ing of ingresosUltimos30Dias) {
      if (
        config.categorias_ingresos_seleccionadas.includes(ing.categoria_id) ||
        config.ingresos_seleccionados.includes(ing.id)
      ) {
        suma = redondearMoneda(suma + ing.cantidad);
      }
    }
    return redondearMoneda(suma);
  }, [
    config.modo_ingreso,
    config.ingreso_manual,
    config.categorias_ingresos_seleccionadas,
    config.ingresos_seleccionados,
    ingresosUltimos30Dias,
  ]);

  // Mapa de gasto real del mes actual por categoria_id
  const mapaGastoReal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const g of gastosMesActual) {
      mapa.set(g.categoria_id, redondearMoneda(g.total_real));
    }
    return mapa;
  }, [gastosMesActual]);

  // Mapa de configuracion de categorias de gasto
  const mapaConfigGasto = useMemo(() => {
    const mapa = new Map<string, BudgetCategoriaGastoConfig>();
    for (const c of config.categorias_gastos) {
      mapa.set(c.categoria_id, c);
    }
    return mapa;
  }, [config.categorias_gastos]);

  // Totales de Gastos (Presupuestados y Reales de las categorias marcadas)
  const { gastosPresupuestadosTotales, gastosRealesTotales } = useMemo(() => {
    let sumaPresupuestado = 0;
    let sumaReal = 0;

    for (const cat of categoriasGastos) {
      const cfg = mapaConfigGasto.get(cat.id);
      if (cfg && cfg.activo) {
        sumaPresupuestado = redondearMoneda(sumaPresupuestado + cfg.monto_fijo);
        const realCat = mapaGastoReal.get(cat.id) ?? 0;
        sumaReal = redondearMoneda(sumaReal + realCat);
      }
    }

    return {
      gastosPresupuestadosTotales: redondearMoneda(sumaPresupuestado),
      gastosRealesTotales: redondearMoneda(sumaReal),
    };
  }, [categoriasGastos, mapaConfigGasto, mapaGastoReal]);

  // Superavit mensual y Tasa de ahorro (sin decimales)
  const superavitPresupuestado = redondearMoneda(ingresosTotales - gastosPresupuestadosTotales);
  const superavitReal = redondearMoneda(ingresosTotales - gastosRealesTotales);

  const tasaAhorroPresupuestada = useMemo(() => {
    if (ingresosTotales <= 0) {
      return gastosPresupuestadosTotales > 0 ? -100 : 0;
    }
    return Math.round(((ingresosTotales - gastosPresupuestadosTotales) / ingresosTotales) * 100);
  }, [ingresosTotales, gastosPresupuestadosTotales]);

  const tasaAhorroReal = useMemo(() => {
    if (ingresosTotales <= 0) {
      return gastosRealesTotales > 0 ? -100 : 0;
    }
    return Math.round(((ingresosTotales - gastosRealesTotales) / ingresosTotales) * 100);
  }, [ingresosTotales, gastosRealesTotales]);

  // Handlers de Ingresos
  const cambiarModoIngreso = (nuevoModo: ModoIngresoBudget) => {
    if (config.modo_ingreso === nuevoModo) return;
    persistirConfig(
      {
        ...config,
        modo_ingreso: nuevoModo,
      },
      150,
    );
  };

  const handleCambioIngresoManual = (valorRaw: string) => {
    const normalizado = normalizarEntradaDecimal(valorRaw);
    if (normalizado === null) return;
    setEdicionManualIngreso(normalizado);

    const numero =
      normalizado === '' || normalizado === '-' ? 0 : redondearMoneda( parseFloat(normalizado));
    if (Number.isNaN(numero)) return;

    persistirConfig(
      {
        ...config,
        ingreso_manual: numero,
      },
      400,
    );
  };

  const toggleDesplegableCategoriaIngreso = (categoriaId: string) => {
    setCategoriasDesplegadas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  const toggleCategoriaIngresoCompleta = (categoriaId: string) => {
    const opsCat = ingresosPorCategoria.get(categoriaId) ?? [];
    const idsOpsCat = opsCat.map((op) => op.id);

    const catEstabaMarcada = config.categorias_ingresos_seleccionadas.includes(categoriaId);
    const todasOpsSeleccionadas =
      opsCat.length > 0
        ? opsCat.every((op) => estaIngresoSeleccionado(op))
        : catEstabaMarcada;

    let nuevasCategoriasSel: string[];
    let nuevosIngresosSel: string[];

    if (todasOpsSeleccionadas) {
      // Desmarcar toda la categoria y sus ingresos
      nuevasCategoriasSel = config.categorias_ingresos_seleccionadas.filter(
        (id) => id !== categoriaId,
      );
      nuevosIngresosSel = config.ingresos_seleccionados.filter(
        (id) => !idsOpsCat.includes(id),
      );
    } else {
      // Marcar toda la categoria y todos sus ingresos de los ultimos 30 dias
      nuevasCategoriasSel = catEstabaMarcada
        ? [...config.categorias_ingresos_seleccionadas]
        : [...config.categorias_ingresos_seleccionadas, categoriaId];
      const setIngresos = new Set([...config.ingresos_seleccionados, ...idsOpsCat]);
      nuevosIngresosSel = Array.from(setIngresos);
    }

    persistirConfig(
      {
        ...config,
        categorias_ingresos_seleccionadas: nuevasCategoriasSel,
        ingresos_seleccionados: nuevosIngresosSel,
      },
      150,
    );
  };

  const toggleIngresoIndividual = (ingreso: IngresoBudget) => {
    const categoriaId = ingreso.categoria_id;
    const opsCat = ingresosPorCategoria.get(categoriaId) ?? [];
    const idsOpsCat = opsCat.map((op) => op.id);
    const catEstabaMarcada = config.categorias_ingresos_seleccionadas.includes(categoriaId);

    // Construimos el conjunto actual de IDs seleccionados asegurandonos de expandir la categoria si estaba marcada
    const setActual = new Set(config.ingresos_seleccionados);
    if (catEstabaMarcada) {
      for (const idOp of idsOpsCat) {
        setActual.add(idOp);
      }
    }

    if (setActual.has(ingreso.id)) {
      setActual.delete(ingreso.id);
    } else {
      setActual.add(ingreso.id);
    }

    const quedanTodosMarcados =
      idsOpsCat.length > 0 && idsOpsCat.every((idOp) => setActual.has(idOp));

    const nuevasCategoriasSel = quedanTodosMarcados
      ? Array.from(new Set([...config.categorias_ingresos_seleccionadas, categoriaId]))
      : config.categorias_ingresos_seleccionadas.filter((id) => id !== categoriaId);

    persistirConfig(
      {
        ...config,
        categorias_ingresos_seleccionadas: nuevasCategoriasSel,
        ingresos_seleccionados: Array.from(setActual),
      },
      150,
    );
  };

  // Handlers de Gastos
  const actualizarCategoriaGasto = (
    categoriaId: string,
    cambios: Partial<BudgetCategoriaGastoConfig>,
    delayMs = 350,
  ) => {
    const existente = mapaConfigGasto.get(categoriaId) ?? {
      categoria_id: categoriaId,
      activo: false,
      monto_fijo: 0,
    };

    const actualizado: BudgetCategoriaGastoConfig = {
      ...existente,
      ...cambios,
      monto_fijo: redondearMoneda(cambios.monto_fijo ?? existente.monto_fijo),
    };

    const resto = config.categorias_gastos.filter((c) => c.categoria_id !== categoriaId);
    persistirConfig(
      {
        ...config,
        categorias_gastos: [...resto, actualizado],
      },
      delayMs,
    );
  };

  const toggleCheckCategoriaGasto = (categoriaId: string) => {
    const existente = mapaConfigGasto.get(categoriaId);
    const nuevoEstado = !(existente?.activo ?? false);
    actualizarCategoriaGasto(categoriaId, { activo: nuevoEstado }, 150);
  };

  const handleCambioMontoFijoGasto = (categoriaId: string, valorRaw: string) => {
    const normalizado = normalizarEntradaDecimal(valorRaw);
    if (normalizado === null) return;

    setEdicionGasto({
      categoriaId,
      campo: 'EUR',
      valorTexto: normalizado,
    });

    const numeroEur =
      normalizado === '' || normalizado === '-' ? 0 : redondearMoneda(parseFloat(normalizado));
    if (Number.isNaN(numeroEur)) return;

    actualizarCategoriaGasto(categoriaId, { activo: true, monto_fijo: numeroEur }, 350);
  };

  const handleCambioPorcentajeGasto = (categoriaId: string, valorRaw: string) => {
    const normalizado = normalizarEntradaDecimal(valorRaw);
    if (normalizado === null) return;

    setEdicionGasto({
      categoriaId,
      campo: 'PCT',
      valorTexto: normalizado,
    });

    const numeroPct =
      normalizado === '' || normalizado === '-' ? 0 : redondearMoneda(parseFloat(normalizado));
    if (Number.isNaN(numeroPct)) return;

    // Si cambia el %, calculamos el dinero fijo en EUR = (porcentaje / 100) * ingresosTotales
    const nuevoMontoEur = redondearMoneda((numeroPct / 100) * ingresosTotales);
    actualizarCategoriaGasto(categoriaId, { activo: true, monto_fijo: nuevoMontoEur }, 350);
  };

  const formatearFechaCorta = (fechaStr: string) => {
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  // Segmentos para la barra visual de distribucion en el Resumen
  const segmentosDistribucion = useMemo(() => {
    if (ingresosTotales <= 0) return [];
    const lista: {
      id: string;
      nombre: string;
      monto: number;
      porcentaje: number;
      color: string;
    }[] = [];

    for (const cat of categoriasGastos) {
      const cfg = mapaConfigGasto.get(cat.id);
      if (cfg && cfg.activo && cfg.monto_fijo > 0) {
        const infoColor = obtenerColorCat(cat, '#ef4444');
        const pct = Math.min(100, Math.max(0, (cfg.monto_fijo / ingresosTotales) * 100));
        lista.push({
          id: cat.id,
          nombre: cat.nombre,
          monto: cfg.monto_fijo,
          porcentaje: redondearMoneda(pct),
          color: infoColor.colorVisible,
        });
      }
    }
    return lista;
  }, [categoriasGastos, mapaConfigGasto, ingresosTotales, perfil, esModoOscuro]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} />
        <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
          Cargando tu configuración de Budget...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16 w-full">
      {/* CABECERA PRINCIPAL + INDICADOR DE GUARDADO DINAMICO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-100 to-indigo-200 dark:from-cyan-900/40 dark:to-indigo-900/30 rounded-2xl shadow-sm border border-cyan-200/60 dark:border-cyan-800/50 shrink-0">
            <PieChart className="text-cyan-600 dark:text-cyan-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Budget Mensual
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
              Planifica la asignación de tus ingresos y compárala en tiempo real con tus gastos
            </p>
          </div>
        </div>

        {/* Estado de persistencia automatica */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xs text-xs font-semibold self-end sm:self-auto">
          {estadoGuardado === 'guardando' && (
            <>
              <Loader2 size={15} className="animate-spin text-indigo-500" />
              <span className="text-slate-600 dark:text-neutral-300">Guardando cambios...</span>
            </>
          )}
          {estadoGuardado === 'guardado' && (
            <>
              <Check size={15} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Guardado automáticamente</span>
            </>
          )}
          {estadoGuardado === 'error' && (
            <>
              <AlertCircle size={15} className="text-red-500" />
              <span className="text-red-600 dark:text-red-400">Error al sincronizar</span>
            </>
          )}
          {estadoGuardado === 'inactivo' && (
            <>
              <Cloud size={15} className="text-cyan-500" />
              <span className="text-slate-500 dark:text-neutral-400">Sincronizado en BBDD</span>
            </>
          )}
        </div>
      </div>

      {/* =====================================================================
          1. PARTE DE RESUMEN (ARRIBA DEL TODO)
         ===================================================================== */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* i. Ingresos Totales */}
          <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                Ingresos Totales
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={20} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {formatearMoneda(ingresosTotales)} €
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                {config.modo_ingreso === 'APP'
                  ? 'Calculado de la App (Últimos 30 días)'
                  : 'Importe fijo manual'}
              </div>
            </div>
          </div>

          {/* ii. Gastos Totales */}
          <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-red-500/30 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                Gastos Totales
              </span>
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <TrendingDown size={20} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                {formatearMoneda(gastosPresupuestadosTotales)} €
              </p>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400 border-t border-slate-100 dark:border-neutral-800 pt-2">
                <span>Real este mes:</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  {formatearMoneda(gastosRealesTotales)} €
                </span>
              </div>
            </div>
          </div>

          {/* iii. Superavit Mensual */}
          <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                Superávit Mensual
              </span>
              <div
                className={`p-2.5 rounded-xl ${
                  superavitPresupuestado >= 0
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                }`}
              >
                <Wallet size={20} />
              </div>
            </div>
            <div>
              <p
                className={`text-2xl sm:text-3xl font-black whitespace-nowrap ${
                  superavitPresupuestado >= 0
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {superavitPresupuestado > 0 ? '+' : ''}
                {formatearMoneda(superavitPresupuestado)} €
              </p>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400 border-t border-slate-100 dark:border-neutral-800 pt-2">
                <span>Real este mes:</span>
                <span
                  className={`font-bold ${
                    superavitReal >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {superavitReal > 0 ? '+' : ''}
                  {formatearMoneda(superavitReal)} €
                </span>
              </div>
            </div>
          </div>

          {/* iv. Tasa de Ahorro (sin decimales) */}
          <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-slate-200 dark:border-cyan-500/30 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between ring-1 ring-cyan-500/15">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-400">
                Tasa de Ahorro
              </span>
              <div
                className={`p-2.5 rounded-xl ${
                  tasaAhorroPresupuestada >= 0
                    ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                }`}
              >
                <Percent size={20} />
              </div>
            </div>
            <div>
              <p
                className={`text-2xl sm:text-3xl font-black whitespace-nowrap ${
                  tasaAhorroPresupuestada >= 0
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {tasaAhorroPresupuestada}%
              </p>
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400 border-t border-slate-100 dark:border-neutral-800 pt-2">
                <span>Real este mes:</span>
                <span
                  className={`font-bold ${
                    tasaAhorroReal >= 0
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {tasaAhorroReal}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra visual multicapa con los colores de las categorias presupuestadas */}
        {ingresosTotales > 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-500" />
                Distribución visual de tus ingresos
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-neutral-300">
                Asignado:{' '}
                {formatearMoneda(
                  ingresosTotales > 0 ? (gastosPresupuestadosTotales / ingresosTotales) * 100 : 0,
                )}
                % ({formatearMoneda(gastosPresupuestadosTotales)} € de{' '}
                {formatearMoneda(ingresosTotales)} €)
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden flex shadow-inner">
              {segmentosDistribucion.map((seg) => (
                <div
                  key={seg.id}
                  style={{
                    width: `${seg.porcentaje}%`,
                    backgroundColor: seg.color,
                  }}
                  className="h-full transition-all duration-300 first:rounded-l-full border-r border-black/10 dark:border-black/40"
                  title={`${seg.nombre}: ${formatearMoneda(seg.monto)} € (${formatearMoneda(seg.porcentaje)}%)`}
                />
              ))}
            </div>

            {segmentosDistribucion.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                {segmentosDistribucion.map((seg) => (
                  <div key={seg.id} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="font-semibold text-slate-700 dark:text-neutral-300">
                      {seg.nombre}:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatearMoneda(seg.porcentaje)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          2. PARTE DE INGRESOS
         ===================================================================== */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-emerald-500/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-neutral-800 bg-emerald-50/40 dark:bg-emerald-950/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Configuración de Ingresos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400">
                Elige si calcular tus ingresos desde las operaciones de los últimos 30 días o definir un valor fijo
              </p>
            </div>
          </div>

          {/* Selector de modo: Datos de la App (por defecto) vs Valor Manual */}
          <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-neutral-900 p-1 rounded-xl border border-slate-200 dark:border-neutral-800 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => cambiarModoIngreso('APP')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                config.modo_ingreso === 'APP'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database size={16} />
              <span>Datos de la App</span>
            </button>
            <button
              type="button"
              onClick={() => cambiarModoIngreso('MANUAL')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                config.modo_ingreso === 'MANUAL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenLine size={16} />
              <span>Introducir Valor</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {config.modo_ingreso === 'MANUAL' ? (
            <div className="max-w-xl bg-slate-50 dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                Ingreso Total Mensual (€)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    edicionManualIngreso !== null
                      ? edicionManualIngreso
                      : formatearInputNumero(config.ingreso_manual)
                  }
                  onChange={(e) => handleCambioIngresoManual(e.target.value)}
                  onBlur={() => setEdicionManualIngreso(null)}
                  placeholder="0.00"
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-neutral-950 border border-slate-300 dark:border-neutral-700 text-xl font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <span className="absolute right-4 text-base font-bold text-slate-400">€</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Este importe se utiliza directamente como base para calcular los porcentajes de tus gastos y tu tasa de ahorro.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Categorías de ingresos (Operaciones de los últimos 30 días)
                </p>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Total seleccionado: {formatearMoneda(ingresosTotales)} €
                </span>
              </div>

              {categoriasIngresos.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                  No hay categorías de ingresos activas configuradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {categoriasIngresos.map((cat) => {
                    const opsCat = ingresosPorCategoria.get(cat.id) ?? [];
                    const infoColor = obtenerColorCat(cat, '#10b981');
                    const desplegado = Boolean(categoriasDesplegadas[cat.id]);

                    const opsSeleccionadas = opsCat.filter((op) => estaIngresoSeleccionado(op));
                    const catMarcadaConfig = config.categorias_ingresos_seleccionadas.includes(cat.id);

                    const todasSeleccionadas =
                      opsCat.length > 0
                        ? opsSeleccionadas.length === opsCat.length
                        : catMarcadaConfig;
                    const seleccionParcial =
                      opsCat.length > 0 &&
                      opsSeleccionadas.length > 0 &&
                      opsSeleccionadas.length < opsCat.length;

                    const subtotalCategoria = redondearMoneda(
                      opsSeleccionadas.reduce((acc, op) => acc + op.cantidad, 0),
                    );

                    return (
                      <div
                        key={cat.id}
                        className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 overflow-hidden transition-all"
                        style={{
                          borderLeftWidth: '5px',
                          borderLeftColor: infoColor.colorVisible,
                        }}
                      >
                        {/* Cabecera de la categoria de ingreso */}
                        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleCategoriaIngresoCompleta(cat.id)}
                              className="text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                              title={
                                todasSeleccionadas
                                  ? 'Desmarcar todos los ingresos de esta categoría'
                                  : 'Seleccionar todos los ingresos de esta categoría'
                              }
                            >
                              {todasSeleccionadas ? (
                                <CheckSquare
                                  size={22}
                                  style={{ color: infoColor.colorVisible }}
                                />
                              ) : seleccionParcial ? (
                                <MinusSquare
                                  size={22}
                                  style={{ color: infoColor.colorVisible }}
                                />
                              ) : (
                                <Square size={22} />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleDesplegableCategoriaIngreso(cat.id)}
                              className="flex flex-wrap items-center gap-2.5 text-left min-w-0 cursor-pointer"
                            >
                              <span
                                className="px-3 py-1 rounded-lg text-xs font-bold tracking-wide truncate"
                                style={{
                                  backgroundColor: infoColor.colorOriginal,
                                  color: infoColor.textoBadge,
                                  border: infoColor.bordeBadge,
                                  boxShadow: infoColor.sombraBadge,
                                }}
                              >
                                {cat.nombre}
                              </span>
                              <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                                ({opsSeleccionadas.length}/{opsCat.length} en últimos 30 días)
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`text-sm sm:text-base font-black whitespace-nowrap ${
                                subtotalCategoria > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400 dark:text-neutral-500'
                              }`}
                            >
                              {formatearMoneda(subtotalCategoria)} €
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleDesplegableCategoriaIngreso(cat.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition-colors cursor-pointer"
                              aria-label="Desplegar categoría"
                            >
                              <ChevronDown
                                size={20}
                                className={`transition-transform duration-200 ${
                                  desplegado ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Lista desplegable de ingresos de los ultimos 30 dias */}
                        {desplegado && (
                          <div className="border-t border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-[#161616] divide-y divide-slate-100 dark:divide-neutral-800/70">
                            {opsCat.length === 0 ? (
                              <div className="p-4 text-xs text-slate-400 dark:text-neutral-500 italic text-center">
                                No hay ingresos registrados en esta categoría durante los últimos 30 días.
                              </div>
                            ) : (
                              opsCat.map((op) => {
                                const seleccionado = estaIngresoSeleccionado(op);
                                return (
                                  <div
                                    key={op.id}
                                    onClick={() => toggleIngresoIndividual(op)}
                                    className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                      seleccionado
                                        ? 'bg-emerald-50/40 dark:bg-emerald-950/15 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/25'
                                        : 'hover:bg-slate-50 dark:hover:bg-neutral-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="shrink-0">
                                        {seleccionado ? (
                                          <CheckSquare
                                            size={18}
                                            style={{ color: infoColor.colorVisible }}
                                          />
                                        ) : (
                                          <Square size={18} className="text-slate-400" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200 truncate">
                                          {op.descripcion && op.descripcion.trim() !== ''
                                            ? op.descripcion
                                            : op.categoria}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                                          {formatearFechaCorta(op.fecha)} · {op.cuenta}
                                        </p>
                                      </div>
                                    </div>

                                    <span
                                      className={`text-sm font-bold whitespace-nowrap ${
                                        seleccionado
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-slate-400 dark:text-neutral-500 line-through'
                                      }`}
                                    >
                                      {formatearMoneda(op.cantidad)} €
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          3. PARTE DE GASTOS
         ===================================================================== */}
      <section className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-red-500/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-neutral-800 bg-red-50/40 dark:bg-red-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
              <TrendingDown size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Presupuesto por Categorías de Gastos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400">
                Marca las categorías que deseas incluir en el cómputo y ajusta tu objetivo en € o %
              </p>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-neutral-400 self-end sm:self-auto">
            Categorías activas:{' '}
            <span className="text-slate-900 dark:text-white">
              {categoriasGastos.filter((c) => mapaConfigGasto.get(c.id)?.activo).length} /{' '}
              {categoriasGastos.length}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {categoriasGastos.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
              No hay categorías de gastos activas configuradas.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {categoriasGastos.map((cat) => {
                const cfg = mapaConfigGasto.get(cat.id);
                const estaMarcada = Boolean(cfg?.activo);
                const montoFijo = redondearMoneda(cfg?.monto_fijo ?? 0);
                const porcentajePresupuesto =
                  ingresosTotales > 0
                    ? redondearMoneda((montoFijo / ingresosTotales) * 100)
                    : 0;

                const gastoRealEur = redondearMoneda(mapaGastoReal.get(cat.id) ?? 0);
                const gastoRealPct =
                  ingresosTotales > 0
                    ? redondearMoneda((gastoRealEur / ingresosTotales) * 100)
                    : 0;

                const diferenciaEur = redondearMoneda(montoFijo - gastoRealEur);
                const diferenciaPct = redondearMoneda(porcentajePresupuesto - gastoRealPct);

                const infoColor = obtenerColorCat(cat, '#ef4444');

                const valorInputEur =
                  edicionGasto?.categoriaId === cat.id && edicionGasto.campo === 'EUR'
                    ? edicionGasto.valorTexto
                    : formatearInputNumero(montoFijo);

                const valorInputPct =
                  edicionGasto?.categoriaId === cat.id && edicionGasto.campo === 'PCT'
                    ? edicionGasto.valorTexto
                    : formatearInputNumero(porcentajePresupuesto);

                const porcentajeBarraReal =
                  montoFijo > 0
                    ? Math.min(100, Math.max(0, (gastoRealEur / montoFijo) * 100))
                    : gastoRealEur > 0
                      ? 100
                      : 0;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      estaMarcada
                        ? 'bg-white dark:bg-neutral-900/90 border-slate-200 dark:border-neutral-700 shadow-sm'
                        : 'bg-slate-50/60 dark:bg-neutral-900/30 border-slate-200/60 dark:border-neutral-800/60 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      borderLeftWidth: '6px',
                      borderLeftColor: infoColor.colorVisible,
                    }}
                  >
                    {/* Fila superior de la categoria: Check + Nombre con color + Estado rapido */}
                    <div className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCheckCategoriaGasto(cat.id)}
                        className="flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <div className="transition-transform group-hover:scale-105">
                          {estaMarcada ? (
                            <CheckSquare
                              size={22}
                              style={{ color: infoColor.colorVisible }}
                            />
                          ) : (
                            <Square size={22} className="text-slate-400 dark:text-neutral-500" />
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className="px-3 py-1 rounded-lg text-xs sm:text-sm font-bold tracking-wide"
                            style={{
                              backgroundColor: infoColor.colorOriginal,
                              color: infoColor.textoBadge,
                              border: infoColor.bordeBadge,
                              boxShadow: infoColor.sombraBadge,
                            }}
                          >
                            {cat.nombre}
                          </span>
                          {perfil === 'Tipo A' && cat.grupo_nombre && (
                            <span className="text-xs font-medium text-slate-400 dark:text-neutral-400">
                              ({cat.grupo_nombre})
                            </span>
                          )}
                        </div>
                      </button>

                      {estaMarcada ? (
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span
                            className={`px-2.5 py-1 rounded-lg border ${
                              diferenciaEur >= 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {diferenciaEur >= 0 ? 'Disponible: ' : 'Desviación: '}
                            {diferenciaEur > 0 ? '+' : ''}
                            {formatearMoneda(diferenciaEur)} € ({diferenciaPct > 0 ? '+' : ''}
                            {formatearMoneda(diferenciaPct)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 dark:text-neutral-500">
                          No incluida en el cómputo
                        </span>
                      )}
                    </div>

                    {/* Panel desplegado cuando la categoria esta marcada */}
                    {estaMarcada && (
                      <div className="px-4 pb-5 pt-2 sm:px-5 border-t border-slate-100 dark:border-neutral-800/80 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* BLOQUE 1: DOS INPUTS SINCRONIZADOS (Dinero que quiero gastarme en general) */}
                          <div
                            className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-950/60 space-y-3"
                            style={{
                              boxShadow: `inset 0 0 0 1px ${infoColor.colorVisible}22`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                                Objetivo Presupuestado (Lo que quiero gastar)
                              </span>
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: infoColor.colorVisible }}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Input 1: Dinero fijo en EUR */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1">
                                  Importe Fijo (€)
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={valorInputEur}
                                    onChange={(e) =>
                                      handleCambioMontoFijoGasto(cat.id, e.target.value)
                                    }
                                    onBlur={() => setEdicionGasto(null)}
                                    placeholder="0.00"
                                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-sm sm:text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                  />
                                  <span className="absolute right-3 text-xs font-bold text-slate-400">
                                    €
                                  </span>
                                </div>
                              </div>

                              {/* Input 2: Porcentaje (%) */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase mb-1">
                                  Porcentaje de Ingresos (%)
                                </label>
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={valorInputPct}
                                    onChange={(e) =>
                                      handleCambioPorcentajeGasto(cat.id, e.target.value)
                                    }
                                    onBlur={() => setEdicionGasto(null)}
                                    placeholder="0.00"
                                    className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 text-sm sm:text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                  />
                                  <span className="absolute right-3 text-xs font-bold text-slate-400">
                                    %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* BLOQUE 2: DOS CONTENEDORES DE REALIDAD (Lo que me he gastado en esa categoria) */}
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-950/60 space-y-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300">
                                Realidad del Mes (Lo que he gastado)
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">
                                Mes actual
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Contenedor 1: Gasto Real en numero (EUR) */}
                              <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                                  Gasto Real (€)
                                </span>
                                <span
                                  className={`text-sm sm:text-base font-black ${
                                    gastoRealEur > montoFijo && montoFijo > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {formatearMoneda(gastoRealEur)} €
                                </span>
                              </div>

                              {/* Contenedor 2: Gasto Real en % */}
                              <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-neutral-500">
                                  Gasto Real (%)
                                </span>
                                <span
                                  className={`text-sm sm:text-base font-black ${
                                    gastoRealPct > porcentajePresupuesto &&
                                    porcentajePresupuesto > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {formatearMoneda(gastoRealPct)} %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Barra de progreso comparativa de la categoria con su color visible */}
                        <div className="space-y-1.5">
                          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${porcentajeBarraReal}%`,
                                backgroundColor:
                                  gastoRealEur > montoFijo && montoFijo > 0
                                    ? '#ef4444'
                                    : infoColor.colorVisible,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
