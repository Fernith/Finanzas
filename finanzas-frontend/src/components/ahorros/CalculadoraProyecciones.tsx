import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calculator,
  Calendar,
  CalendarClock,
  CheckSquare,
  Square,
  Layers,
  Equal,
  CheckCircle2,
  Infinity as InfinityIcon,
  ArrowRight,
} from 'lucide-react';
import { obtenerFechaHoyEsp, redondearMoneda } from '../../utils/formatters';
import type { MetaAhorro } from '../../types';

type ModoCalculoProyeccion = 'constante' | 'escalonado';

interface TramoProyeccion {
  id: string;
  etiqueta: string;
  subtitulo: string;
  fechaFin: string | null;
  mesInicio: number;
  mesFin: number;
  mesesDuracionTramo: number;
  aportacionMensual: number;
  aportacionAnual: number;
  dineroEnEsteTramo: number;
  dineroAcumuladoHastaFecha: number;
  metasIncluidas: string[];
}

interface DetalleMetaEnPlan {
  meta: MetaAhorro;
  restante: number;
  tieneFechaEfectiva: boolean;
  tratadaComoNormalPorHorizonte: boolean;
  fechaFinOriginal: string | null;
  mesesLimiteEfectivo: number;
  cuotaMensualIndividualSimultanea: number;
  mesCompletadoSecuencial: number;
}

interface ResultadoPlanHorizonte {
  tramos: TramoProyeccion[];
  detallesMetas: DetalleMetaEnPlan[];
  cuotaMensualInicial: number;
  cuotaAnualInicial: number;
  esCuotaUnica: boolean;
  hayMetasConFechaDentroDelHorizonte: boolean;
}

function calcularDiasHastaFecha(fechaHoyStr: string, fechaFinStr: string): number {
  const [hAnio, hMes, hDia] = fechaHoyStr.split('-').map(Number);
  const [fAnio, fMes, fDia] = fechaFinStr.split('-').map(Number);
  const utcHoy = Date.UTC(hAnio, hMes - 1, hDia);
  const utcFin = Date.UTC(fAnio, fMes - 1, fDia);
  return Math.round((utcFin - utcHoy) / (1000 * 60 * 60 * 24));
}

function formatearFechaEsp(fechaIso: string): string {
  return fechaIso.split('-').reverse().join('/');
}

function formatearDuracionMeses(meses: number): string {
  const mesesRedondeados = Math.max(1, Math.round(meses));
  if (mesesRedondeados < 12) {
    return `${mesesRedondeados} ${mesesRedondeados === 1 ? 'mes' : 'meses'}`;
  }
  const anios = Math.floor(mesesRedondeados / 12);
  const restoMeses = mesesRedondeados % 12;
  const textoAnios = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  if (restoMeses === 0) return textoAnios;
  return `${textoAnios} y ${restoMeses} ${restoMeses === 1 ? 'mes' : 'meses'}`;
}

function calcularPlanProyeccion(
  metasSeleccionadas: MetaAhorro[],
  aniosHorizonte: number,
  modo: ModoCalculoProyeccion,
  fechaHoy: string
): ResultadoPlanHorizonte {
  const mesesHorizonte = aniosHorizonte * 12;

  if (metasSeleccionadas.length === 0) {
    return {
      tramos: [],
      detallesMetas: [],
      cuotaMensualInicial: 0,
      cuotaAnualInicial: 0,
      esCuotaUnica: true,
      hayMetasConFechaDentroDelHorizonte: false,
    };
  }

  // 1. Clasificamos cada meta según si su fecha_fin caduca dentro del periodo establecido (mesesHorizonte)
  // Si no tiene fecha_fin o su fecha_fin >= mesesHorizonte, se considera como una meta normal con límite mesesHorizonte.
  const metasClasificadas = metasSeleccionadas
    .map(m => {
      const restante = Math.max(0, (Number(m.objetivo) || 0) - (Number(m.ahorrado) || 0));
      if (m.fecha_fin) {
        const dias = Math.max(1, calcularDiasHastaFecha(fechaHoy, m.fecha_fin));
        const mesesReales = Math.max(1, dias / 30.4375);
        if (mesesReales < mesesHorizonte - 0.05) {
          return {
            meta: m,
            restante,
            tieneFechaEfectiva: true,
            tratadaComoNormalPorHorizonte: false,
            fechaFinEfectiva: m.fecha_fin,
            fechaFinOriginal: m.fecha_fin,
            mesesEfectivos: mesesReales,
          };
        }
        return {
          meta: m,
          restante,
          tieneFechaEfectiva: false,
          tratadaComoNormalPorHorizonte: true,
          fechaFinEfectiva: null,
          fechaFinOriginal: m.fecha_fin,
          mesesEfectivos: mesesHorizonte,
        };
      }
      return {
        meta: m,
        restante,
        tieneFechaEfectiva: false,
        tratadaComoNormalPorHorizonte: false,
        fechaFinEfectiva: null,
        fechaFinOriginal: null,
        mesesEfectivos: mesesHorizonte,
      };
    })
    .sort((a, b) => {
      if (a.tieneFechaEfectiva && b.tieneFechaEfectiva) {
        return a.mesesEfectivos - b.mesesEfectivos;
      }
      if (a.tieneFechaEfectiva) return -1;
      if (b.tieneFechaEfectiva) return 1;
      return 0;
    });

  const hayMetasConFechaDentroDelHorizonte = metasClasificadas.some(m => m.tieneFechaEfectiva);

  // Agrupamos por puntos de corte (cada fecha_fin efectiva + el corte final del horizonte si hay metas normales)
  interface GrupoCorte {
    clave: string;
    fechaFin: string | null;
    meses: number;
    dineroGrupo: number;
    nombresMetas: string[];
    esHorizonteFinal: boolean;
  }

  const mapaCortes = new Map<string, GrupoCorte>();
  for (const item of metasClasificadas) {
    if (item.restante <= 0) continue;
    const clave = item.fechaFinEfectiva ?? '__HORIZONTE__';
    const existente = mapaCortes.get(clave);
    if (existente) {
      existente.dineroGrupo += item.restante;
      existente.nombresMetas.push(item.meta.nombre);
    } else {
      mapaCortes.set(clave, {
        clave,
        fechaFin: item.fechaFinEfectiva,
        meses: item.mesesEfectivos,
        dineroGrupo: item.restante,
        nombresMetas: [item.meta.nombre],
        esHorizonteFinal: item.fechaFinEfectiva === null,
      });
    }
  }

  const cortesOrdenados = Array.from(mapaCortes.values()).sort((a, b) => a.meses - b.meses);
  const tramos: TramoProyeccion[] = [];

  if (modo === 'constante') {
    // ==========================================================================
    // MODO 1 (POR DEFECTO): CUOTA FIJA / PRIORIDAD SECUENCIAL (100% A LA MÁS PRÓXIMA)
    // ==========================================================================
    // Buscamos la cuota más constante posible. Si una fecha límite exige más dinero
    // que la media global restante, se sube la cuota en ese tramo destinando el 100%
    // a esas metas urgentes, y el resto de metas se reparte en el tiempo sobrante.
    let indiceInicio = 0;
    let mesActual = 0;
    let acumuladoGlobal = 0;

    while (indiceInicio < cortesOrdenados.length) {
      let maxCuota = -1;
      let mejorIndice = indiceInicio;
      let dineroAcumuladoSubtramo = 0;
      let dineroMejorSubtramo = 0;

      for (let j = indiceInicio; j < cortesOrdenados.length; j++) {
        dineroAcumuladoSubtramo += cortesOrdenados[j].dineroGrupo;
        const mesesDisponiblesDesdeActual = Math.max(0.05, cortesOrdenados[j].meses - mesActual);
        const cuotaNecesaria = dineroAcumuladoSubtramo / mesesDisponiblesDesdeActual;

        // Si empatan o supera, preferimos abarcar el tramo más largo con la misma cuota fija
        if (cuotaNecesaria >= maxCuota - 0.0001) {
          maxCuota = cuotaNecesaria;
          mejorIndice = j;
          dineroMejorSubtramo = dineroAcumuladoSubtramo;
        }
      }

      const corteFin = cortesOrdenados[mejorIndice];
      const duracionTramo = Math.max(0.05, corteFin.meses - mesActual);
      const cuotaMensualTramo = dineroMejorSubtramo / duracionTramo;
      acumuladoGlobal += dineroMejorSubtramo;

      const metasEnEsteBloque: string[] = [];
      for (let k = indiceInicio; k <= mejorIndice; k++) {
        metasEnEsteBloque.push(...cortesOrdenados[k].nombresMetas);
      }

      const esTramoUnico = indiceInicio === 0 && mejorIndice === cortesOrdenados.length - 1;

      const etiqueta = corteFin.fechaFin
        ? `Hasta ${formatearFechaEsp(corteFin.fechaFin)}`
        : esTramoUnico
          ? `Durante los ${aniosHorizonte} ${aniosHorizonte === 1 ? 'año' : 'años'} (${formatearDuracionMeses(corteFin.meses)})`
          : `Resto hasta ${aniosHorizonte} ${aniosHorizonte === 1 ? 'año' : 'años'} (${formatearDuracionMeses(duracionTramo)} restantes)`;

      const subtitulo = esTramoUnico
        ? `100% secuencial por orden de urgencia: ${metasEnEsteBloque.join(' → ')}`
        : `100% del ahorro destinado a: ${metasEnEsteBloque.join(' → ')}`;

      tramos.push({
        id: `constante-${indiceInicio}-${mejorIndice}`,
        etiqueta,
        subtitulo,
        fechaFin: corteFin.fechaFin,
        mesInicio: mesActual,
        mesFin: corteFin.meses,
        mesesDuracionTramo: duracionTramo,
        aportacionMensual: redondearMoneda(cuotaMensualTramo),
        aportacionAnual: redondearMoneda(cuotaMensualTramo * 12),
        dineroEnEsteTramo: redondearMoneda(dineroMejorSubtramo),
        dineroAcumuladoHastaFecha: redondearMoneda(acumuladoGlobal),
        metasIncluidas: metasEnEsteBloque,
      });

      mesActual = corteFin.meses;
      indiceInicio = mejorIndice + 1;
    }
  } else {
    // ==========================================================================
    // MODO 2: SIMULTÁNEO POR META (MISMA CANTIDAD TODOS LOS MESES A CADA META)
    // ==========================================================================
    // Cada meta divide su restante entre su propio límite efectivo y se ahorra en
    // paralelo para todas las metas activas en cada tramo.
    let mesAnterior = 0;
    let acumuladoGlobal = 0;

    for (let idx = 0; idx < cortesOrdenados.length; idx++) {
      const corte = cortesOrdenados[idx];
      const duracionTramo = Math.max(0.05, corte.meses - mesAnterior);

      let cuotaMensualTramo = 0;
      const metasActivasEnTramo: string[] = [];

      for (const item of metasClasificadas) {
        if (item.restante <= 0) continue;
        if (item.mesesEfectivos >= corte.meses - 0.001) {
          cuotaMensualTramo += item.restante / item.mesesEfectivos;
          metasActivasEnTramo.push(item.meta.nombre);
        }
      }

      const dineroTramo = cuotaMensualTramo * duracionTramo;
      acumuladoGlobal += dineroTramo;

      const etiqueta = corte.fechaFin
        ? `Hasta ${formatearFechaEsp(corte.fechaFin)}`
        : cortesOrdenados.length === 1
          ? `Durante los ${aniosHorizonte} ${aniosHorizonte === 1 ? 'año' : 'años'}`
          : `Resto hasta ${aniosHorizonte} ${aniosHorizonte === 1 ? 'año' : 'años'}`;

      const subtitulo = corte.fechaFin
        ? `Finaliza ${corte.nombresMetas.join(', ')} (ahorrando a la vez en: ${metasActivasEnTramo.join(', ')})`
        : `Ahorrando en: ${metasActivasEnTramo.join(', ')}`;

      tramos.push({
        id: `escalonado-${idx}`,
        etiqueta,
        subtitulo,
        fechaFin: corte.fechaFin,
        mesInicio: mesAnterior,
        mesFin: corte.meses,
        mesesDuracionTramo: duracionTramo,
        aportacionMensual: redondearMoneda(cuotaMensualTramo),
        aportacionAnual: redondearMoneda(cuotaMensualTramo * 12),
        dineroEnEsteTramo: redondearMoneda(dineroTramo),
        dineroAcumuladoHastaFecha: redondearMoneda(acumuladoGlobal),
        metasIncluidas: metasActivasEnTramo,
      });

      mesAnterior = corte.meses;
    }
  }

  // Calculamos en qué mes exacto se termina de pagar cada meta en el modo secuencial (y su cuota individual en simultáneo)
  let dineroAcumuladoPrevio = 0;
  const detallesMetas: DetalleMetaEnPlan[] = metasClasificadas.map(item => {
    const objetivoAcumuladoMeta = dineroAcumuladoPrevio + item.restante;
    dineroAcumuladoPrevio = objetivoAcumuladoMeta;

    // Buscamos en los tramos del modo constante cuándo se alcanza objetivoAcumuladoMeta
    let mesCompletado = item.mesesEfectivos;
    if (modo === 'constante' && tramos.length > 0) {
      let prevAcum = 0;
      for (const t of tramos) {
        if (objetivoAcumuladoMeta <= t.dineroAcumuladoHastaFecha + 0.01) {
          const faltaEnTramo = Math.max(0, objetivoAcumuladoMeta - prevAcum);
          const mesesEnTramo =
            t.aportacionMensual > 0 ? faltaEnTramo / t.aportacionMensual : 0;
          mesCompletado = t.mesInicio + mesesEnTramo;
          break;
        }
        prevAcum = t.dineroAcumuladoHastaFecha;
      }
    }

    return {
      meta: item.meta,
      restante: redondearMoneda(item.restante),
      tieneFechaEfectiva: item.tieneFechaEfectiva,
      tratadaComoNormalPorHorizonte: item.tratadaComoNormalPorHorizonte,
      fechaFinOriginal: item.fechaFinOriginal,
      mesesLimiteEfectivo: item.mesesEfectivos,
      cuotaMensualIndividualSimultanea: redondearMoneda(item.restante / item.mesesEfectivos),
      mesCompletadoSecuencial: mesCompletado,
    };
  });

  const cuotaMensualInicial = tramos.length > 0 ? tramos[0].aportacionMensual : 0;
  const cuotaAnualInicial = redondearMoneda(cuotaMensualInicial * 12);

  return {
    tramos,
    detallesMetas,
    cuotaMensualInicial,
    cuotaAnualInicial,
    esCuotaUnica: tramos.length <= 1,
    hayMetasConFechaDentroDelHorizonte,
  };
}

export default function CalculadoraProyecciones({ metas }: { metas: MetaAhorro[] }) {
  // FILTRO: Nos quedamos únicamente con las metas que no están completadas ni canceladas,
  // ordenando primero las que tienen fecha límite más próxima
  const metasActivas = useMemo(() => {
    return metas
      .filter(m => m.ahorrado < m.objetivo)
      .sort((a, b) => {
        if (a.fecha_fin && b.fecha_fin) return a.fecha_fin.localeCompare(b.fecha_fin);
        if (a.fecha_fin) return -1;
        if (b.fecha_fin) return 1;
        return 0;
      });
  }, [metas]);

  const [selectedMetaIds, setSelectedMetaIds] = useState<Set<string>>(new Set());
  const [aniosSeleccionados, setAniosSeleccionados] = useState<number>(5);
  const [modoCalculo, setModoCalculo] = useState<ModoCalculoProyeccion>('constante');
  const inicializadoRef = useRef(false);

  useEffect(() => {
    if (metasActivas.length > 0 && !inicializadoRef.current) {
      setSelectedMetaIds(new Set(metasActivas.map(m => m.id)));
      inicializadoRef.current = true;
    }
  }, [metasActivas]);

  const todasSeleccionadas = useMemo(
    () => metasActivas.length > 0 && metasActivas.every(m => selectedMetaIds.has(m.id)),
    [metasActivas, selectedMetaIds]
  );

  const toggleMeta = (id: string) => {
    const next = new Set(selectedMetaIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMetaIds(next);
  };

  const toggleAll = () => {
    if (todasSeleccionadas) setSelectedMetaIds(new Set());
    else setSelectedMetaIds(new Set(metasActivas.map(m => m.id)));
  };

  const metasSeleccionadas = useMemo(
    () => metasActivas.filter(m => selectedMetaIds.has(m.id)),
    [metasActivas, selectedMetaIds]
  );

  const dineroRestante = useMemo(() => {
    return metasSeleccionadas.reduce((acc, m) => {
      const obj = Number(m.objetivo) || 0;
      const ah = Number(m.ahorrado) || 0;
      return acc + Math.max(0, obj - ah);
    }, 0);
  }, [metasSeleccionadas]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const fechaHoy = obtenerFechaHoyEsp();

  const planActual = useMemo(
    () => calcularPlanProyeccion(metasSeleccionadas, aniosSeleccionados, modoCalculo, fechaHoy),
    [metasSeleccionadas, aniosSeleccionados, modoCalculo, fechaHoy]
  );

  const hitos = [1, 3, 5, 10, 15, 20];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Calculadora de Proyecciones</h2>
            <p className="text-sm text-neutral-500">
              Planifica las aportaciones necesarias para alcanzar siempre tus metas a tiempo
            </p>
          </div>
        </div>

        {/* Selector de las 2 formas de distribución */}
        <div className="flex flex-col sm:flex-row bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setModoCalculo('constante')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              modoCalculo === 'constante'
                ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Equal size={15} />
            <span>Cuota Fija Mensual</span>
          </button>
          <button
            type="button"
            onClick={() => setModoCalculo('escalonado')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              modoCalculo === 'escalonado'
                ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers size={15} />
            <span>Por Fechas Límite (Simultáneo)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3">
              ¿Qué metas quieres proyectar?
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              <button
                onClick={toggleAll}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Todas las metas activas
                </span>
                {todasSeleccionadas ? (
                  <CheckSquare size={18} className="text-indigo-500 shrink-0" />
                ) : (
                  <Square size={18} className="text-neutral-400 shrink-0" />
                )}
              </button>

              {metasActivas.map(m => {
                const tieneFecha = Boolean(m.fecha_fin);
                const seleccionada = selectedMetaIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMeta(m.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors text-left ${
                      seleccionada
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        className="w-3 h-3 rounded-full shadow-inner shrink-0"
                        style={{ backgroundColor: m.color || '#ccc' }}
                      ></span>
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                          {m.nombre}
                        </span>
                        {tieneFecha && m.fecha_fin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100/80 dark:bg-purple-900/30 px-1.5 py-0.5 rounded mt-0.5">
                            <CalendarClock size={10} /> {formatearFechaEsp(m.fecha_fin)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                            <InfinityIcon size={10} /> Sin fecha límite
                          </span>
                        )}
                      </div>
                    </div>
                    {seleccionada ? (
                      <CheckSquare size={18} className="text-indigo-500 shrink-0" />
                    ) : (
                      <Square size={18} className="text-neutral-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {metasActivas.length === 0 && (
                <div className="text-xs text-neutral-500 text-center py-4">
                  No hay metas activas disponibles.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-2">
              <Calendar size={16} /> ¿En cuántos años quieres lograrlo?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              {modoCalculo === 'constante'
                ? 'Destina el 100% del ahorro mensual a la meta más próxima primero para mantener la cuota lo más fija posible.'
                : 'Aporta todos los meses una cuota fija individual a cada meta al mismo tiempo hasta su fecha límite.'}
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={aniosSeleccionados}
                onChange={e => setAniosSeleccionados(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 min-w-[4rem] text-center">
                {aniosSeleccionados} {aniosSeleccionados === 1 ? 'año' : 'años'}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta Resumen Principal */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12">
              <Calculator size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider mb-2">
                Dinero restante a financiar:{' '}
                <span className="font-bold text-white ml-1 text-lg">{formatCurrency(dineroRestante)}</span>
              </p>

              {planActual.esCuotaUnica ? (
                <h3 className="text-lg sm:text-xl font-bold mb-5">
                  Si quieres conseguirlo en{' '}
                  <span className="text-amber-300 text-2xl">
                    {aniosSeleccionados} {aniosSeleccionados === 1 ? 'año' : 'años'}
                  </span>
                  , necesitas una cuota constante de:
                </h3>
              ) : (
                <h3 className="text-lg sm:text-xl font-bold mb-5">
                  Para cumplir todas las fechas en un horizonte de{' '}
                  <span className="text-amber-300 text-2xl">
                    {aniosSeleccionados} {aniosSeleccionados === 1 ? 'año' : 'años'}
                  </span>
                  , empiezas aportando:
                </h3>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">
                    {planActual.esCuotaUnica ? 'Aportación Anual' : 'Aportación Anual (1er Tramo)'}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black">
                    {formatCurrency(planActual.cuotaAnualInicial)}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">
                    {planActual.esCuotaUnica ? 'Aportación Mensual' : 'Aportación Mensual (1er Tramo)'}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black">
                    {formatCurrency(planActual.cuotaMensualInicial)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por tramos y metas cuando hay metas seleccionadas */}
          {metasSeleccionadas.length > 0 && (planActual.hayMetasConFechaDentroDelHorizonte || !planActual.esCuotaUnica) && (
            <div className="space-y-4">
              {/* Tabla de Tramos de Pago */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-neutral-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    {modoCalculo === 'constante' ? (
                      <>
                        <Equal size={15} className="text-indigo-500" />
                        Tramos de Ahorro (100% del pago a la meta más próxima primero)
                      </>
                    ) : (
                      <>
                        <Layers size={15} className="text-indigo-500" />
                        Tramos de Ahorro (Pagando todas las metas a la vez mes a mes)
                      </>
                    )}
                  </h4>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> 100% de metas cumplidas en fecha
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-neutral-50/60 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 uppercase text-[11px] font-bold border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-3">Tramo / Fecha Límite</th>
                        <th className="px-4 py-3 text-right">Aportación Mensual</th>
                        <th className="px-4 py-3 text-right">Aportación Anual</th>
                        <th className="px-4 py-3 text-right">Total acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {planActual.tramos.map((tramo, i) => (
                        <tr
                          key={tramo.id}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300"
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-black shrink-0">
                                {i + 1}
                              </span>
                              {tramo.etiqueta}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-6.5 mt-0.5">
                              {tramo.subtitulo}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {formatCurrency(tramo.aportacionMensual)}/mes
                          </td>
                          <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                            {formatCurrency(tramo.aportacionAnual)}/año
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                            <div>{formatCurrency(tramo.dineroAcumuladoHastaFecha)}</div>
                            <div className="text-[10px] font-normal text-neutral-400">
                              ({formatCurrency(tramo.dineroEnEsteTramo)} en este tramo)
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen de cómo se financia cada meta individualmente según el modo */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-neutral-50 dark:bg-neutral-800/80 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    {modoCalculo === 'constante'
                      ? 'Orden de llenado (100% del ahorro mensual a una meta tras otra)'
                      : 'Reparto mensual simultáneo por cada meta'}
                  </h4>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {planActual.detallesMetas.map((det, idx) => (
                    <div
                      key={det.meta.id}
                      className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: det.meta.color }}
                        ></span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {det.meta.nombre}
                        </span>
                        <span className="text-neutral-400 shrink-0">
                          ({formatCurrency(det.restante)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:justify-end text-[11px] pl-7 sm:pl-0">
                        {det.tratadaComoNormalPorHorizonte && det.fechaFinOriginal ? (
                          <span className="text-neutral-400">
                            Límite {formatearFechaEsp(det.fechaFinOriginal)} &gt; {aniosSeleccionados}a (meta normal)
                          </span>
                        ) : det.tieneFechaEfectiva && det.fechaFinOriginal ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Límite {formatearFechaEsp(det.fechaFinOriginal)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Sin fecha límite</span>
                        )}
                        <ArrowRight size={12} className="text-neutral-400 shrink-0" />
                        {modoCalculo === 'constante' ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Completada en {formatearDuracionMeses(det.mesCompletadoSecuencial)}
                          </span>
                        ) : (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(det.cuotaMensualIndividualSimultanea)}/mes durante{' '}
                            {formatearDuracionMeses(det.mesesLimiteEfectivo)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabla comparativa de hitos de años */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 uppercase text-xs font-bold border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3.5">Tiempo Objetivo</th>
                  <th className="px-4 py-3.5 text-right">Aportación Anual</th>
                  <th className="px-4 py-3.5 text-right">Aportación Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {hitos.map(anio => {
                  const planHito = calcularPlanProyeccion(
                    metasSeleccionadas,
                    anio,
                    modoCalculo,
                    fechaHoy
                  );
                  const esDestacado = anio === aniosSeleccionados;
                  const ultimoTramo =
                    planHito.tramos.length > 1
                      ? planHito.tramos[planHito.tramos.length - 1]
                      : null;

                  return (
                    <tr
                      key={anio}
                      className={`transition-colors ${
                        esDestacado
                          ? 'bg-indigo-50/50 dark:bg-indigo-900/20'
                          : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <td
                        className={`px-4 py-3 font-semibold ${
                          esDestacado ? 'text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      >
                        {anio} {anio === 1 ? 'año' : 'años'}{' '}
                        {esDestacado && <span className="text-xs font-normal ml-1">(Tu selección)</span>}
                        {!planHito.esCuotaUnica && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                            {planHito.tramos.length} tramos
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <div>{formatCurrency(planHito.cuotaAnualInicial)}</div>
                        {ultimoTramo && (
                          <div className="text-[10px] text-neutral-400">
                            Luego {formatCurrency(ultimoTramo.aportacionAnual)}/año
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <div>{formatCurrency(planHito.cuotaMensualInicial)}</div>
                        {ultimoTramo && (
                          <div className="text-[10px] text-neutral-400">
                            Luego {formatCurrency(ultimoTramo.aportacionMensual)}/mes
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
