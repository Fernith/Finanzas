import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, CalendarClock, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ahorrosApi } from '../../api/client';
import { formatearMoneda, obtenerFechaHoyEsp, redondearMoneda } from '../../utils/formatters';
import type { MetaAhorro } from '../../types';

export type HitoAvisoMeta =
  | '1_ANO'
  | '6_MESES'
  | '1_MES'
  | '1_SEMANA'
  | '1_DIA'
  | 'DIA_FINAL'
  | 'COMPLETA_1_SEMANA'
  | 'COMPLETA_DIA_FINAL';

type NivelEsfuerzo = 'holgado' | 'normal' | 'exigente';

interface AvisoMetaItem {
  meta: MetaAhorro;
  hito: HitoAvisoMeta;
  diasRestantes: number;
  completada: boolean;
  cantidadPendiente: number;
  ahorroMensualNecesario: number;
  nivelColor: NivelEsfuerzo;
  titulo: string;
  mensaje: string;
}

function calcularDiasRestantes(fechaHoyStr: string, fechaFinStr: string): number {
  const [hAnio, hMes, hDia] = fechaHoyStr.split('-').map(Number);
  const [fAnio, fMes, fDia] = fechaFinStr.split('-').map(Number);
  const utcHoy = Date.UTC(hAnio, hMes - 1, hDia);
  const utcFin = Date.UTC(fAnio, fMes - 1, fDia);
  return Math.round((utcFin - utcHoy) / (1000 * 60 * 60 * 24));
}

function formatearTiempoRestante(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return '1 día';
  if (dias < 30) return `${dias} días`;
  const meses = Math.round(dias / 30.4375);
  if (meses <= 1) return `1 mes (${dias} días)`;
  if (meses < 12) return `${meses} meses (${dias} días)`;
  return `1 año (${dias} días)`;
}

function evaluarAvisoMeta(meta: MetaAhorro, fechaHoyStr: string): AvisoMetaItem | null {
  if (!meta.fecha_fin) return null;

  const diasRestantes = calcularDiasRestantes(fechaHoyStr, meta.fecha_fin);
  if (diasRestantes > 365) return null;

  const objetivo = redondearMoneda(Number(meta.objetivo) || 0);
  const ahorrado = redondearMoneda(Number(meta.ahorrado) || 0);
  const cantidadPendiente = Math.max(0, redondearMoneda(objetivo - ahorrado));
  const completada = cantidadPendiente <= 0 && objetivo > 0;

  // Si la meta está completa, solo se avisa cuando queda 1 semana y cuando llega el día
  if (completada) {
    let hitoCompleta: HitoAvisoMeta | null = null;
    if (diasRestantes <= 0) {
      hitoCompleta = 'COMPLETA_DIA_FINAL';
    } else if (diasRestantes <= 7) {
      hitoCompleta = 'COMPLETA_1_SEMANA';
    }

    if (!hitoCompleta || meta.ultimo_aviso_descartado === hitoCompleta) {
      return null;
    }

    const textoTiempo = diasRestantes === 1 ? '1 día' : `${diasRestantes} días`;
    const titulo =
      hitoCompleta === 'COMPLETA_DIA_FINAL'
        ? `¡Hoy finaliza el plazo de tu meta completada "${meta.nombre}"!`
        : `¡Última semana para la fecha de tu meta completada "${meta.nombre}"!`;

    const mensaje =
      hitoCompleta === 'COMPLETA_DIA_FINAL'
        ? `Ha llegado el día límite (${meta.fecha_fin.split('-').reverse().join('/')}) para "${meta.nombre}" y ya tienes el 100% ahorrado (${formatearMoneda(ahorrado)} € de ${formatearMoneda(objetivo)} €). Ya puedes finalizarla cuando quieras.`
        : `Quedan ${textoTiempo} (menos de 1 semana) para la fecha límite de "${meta.nombre}" y ya tienes los ${formatearMoneda(objetivo)} € completados. ¡Todo listo para el día final!`;

    return {
      meta,
      hito: hitoCompleta,
      diasRestantes,
      completada: true,
      cantidadPendiente: 0,
      ahorroMensualNecesario: 0,
      nivelColor: 'holgado',
      titulo,
      mensaje,
    };
  }

  // Meta incompleta: determinamos en cuál de los 6 hitos se encuentra
  let hito: HitoAvisoMeta;
  if (diasRestantes <= 0) {
    hito = 'DIA_FINAL';
  } else if (diasRestantes === 1) {
    hito = '1_DIA';
  } else if (diasRestantes <= 7) {
    hito = '1_SEMANA';
  } else if (diasRestantes <= 30) {
    hito = '1_MES';
  } else if (diasRestantes <= 180) {
    hito = '6_MESES';
  } else {
    hito = '1_ANO';
  }

  if (meta.ultimo_aviso_descartado === hito) {
    return null;
  }

  const mesesRestantes = diasRestantes > 0 ? Math.max(1, diasRestantes / 30.4375) : 1;
  const ahorroMensualNecesario = redondearMoneda(cantidadPendiente / mesesRestantes);

  let nivelColor: NivelEsfuerzo;
  if (diasRestantes <= 0) {
    nivelColor = 'exigente';
  } else if (ahorroMensualNecesario < 250) {
    nivelColor = 'holgado';
  } else if (ahorroMensualNecesario <= 350) {
    nivelColor = 'normal';
  } else {
    nivelColor = 'exigente';
  }

  const tiempoTexto = formatearTiempoRestante(diasRestantes);
  const montoPendienteStr = `${formatearMoneda(cantidadPendiente)} €`;
  const montoObjetivoStr = `${formatearMoneda(objetivo)} €`;
  const cuotaMesStr = `${formatearMoneda(ahorroMensualNecesario)} €/mes`;

  let titulo = '';
  let mensaje = '';

  switch (hito) {
    case '1_ANO':
      titulo = `Aviso de 1 año — Meta "${meta.nombre}"`;
      mensaje = `Queda ${tiempoTexto} para finalizar la meta "${meta.nombre}". Te faltan por ahorrar ${montoPendienteStr} (de ${montoObjetivoStr}), lo que supone unos ${cuotaMesStr}.`;
      break;
    case '6_MESES':
      titulo = `Aviso de 6 meses — Meta "${meta.nombre}"`;
      mensaje = `Quedan ${tiempoTexto} para el límite de "${meta.nombre}". Restan ${montoPendienteStr} para alcanzar los ${montoObjetivoStr} (ritmo necesario: ${cuotaMesStr}).`;
      break;
    case '1_MES':
      titulo = `Aviso de 1 mes — Meta "${meta.nombre}"`;
      mensaje = `Entras en el último mes (${tiempoTexto} restantes) para la meta "${meta.nombre}". Necesitas aportar ${montoPendienteStr} para completar los ${montoObjetivoStr}.`;
      break;
    case '1_SEMANA':
      titulo = `Aviso de 1 semana — Meta "${meta.nombre}"`;
      mensaje = `Recta final de 1 semana (quedan ${diasRestantes} días) para "${meta.nombre}". Aún faltan ${montoPendienteStr} para llegar al objetivo de ${montoObjetivoStr}.`;
      break;
    case '1_DIA':
      titulo = `¡Mañana finaliza la meta "${meta.nombre}"!`;
      mensaje = `Queda solo 1 día para la fecha límite de "${meta.nombre}" y faltan por cubrir ${montoPendienteStr} de los ${montoObjetivoStr} previstos.`;
      break;
    case 'DIA_FINAL':
      titulo =
        diasRestantes === 0
          ? `¡Hoy es el día límite de la meta "${meta.nombre}"!`
          : `Plazo vencido en la meta "${meta.nombre}"`;
      mensaje =
        diasRestantes === 0
          ? `Ha llegado el día para finalizar la meta "${meta.nombre}" y quedan pendientes ${montoPendienteStr} para completar los ${montoObjetivoStr}.`
          : `La fecha fin de "${meta.nombre}" se cumplió hace ${Math.abs(diasRestantes)} ${Math.abs(diasRestantes) === 1 ? 'día' : 'días'} y aún restan ${montoPendienteStr} de ${montoObjetivoStr}.`;
      break;
  }

  return {
    meta,
    hito,
    diasRestantes,
    completada: false,
    cantidadPendiente,
    ahorroMensualNecesario,
    nivelColor,
    titulo,
    mensaje,
  };
}

export default function AvisosMetasBanner() {
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [descartandoIds, setDescartandoIds] = useState<Set<string>>(new Set());

  const cargarMetas = useCallback(() => {
    ahorrosApi
      .listarMetas()
      .then(setMetas)
      .catch(console.error);
  }, []);

  useEffect(() => {
    cargarMetas();
  }, [cargarMetas]);

  useEffect(() => {
    const handler = () => cargarMetas();
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarMetas]);

  const fechaHoy = obtenerFechaHoyEsp();

  const avisosActivos = useMemo(() => {
    const lista: AvisoMetaItem[] = [];
    for (const m of metas) {
      if (descartandoIds.has(m.id)) continue;
      const aviso = evaluarAvisoMeta(m, fechaHoy);
      if (aviso) lista.push(aviso);
    }
    return lista.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [metas, fechaHoy, descartandoIds]);

  const handleDescartar = async (aviso: AvisoMetaItem) => {
    setDescartandoIds(prev => new Set(prev).add(aviso.meta.id));
    try {
      await ahorrosApi.descartarAviso(aviso.meta.id, aviso.hito);
      setMetas(prev =>
        prev.map(m =>
          m.id === aviso.meta.id ? { ...m, ultimo_aviso_descartado: aviso.hito } : m
        )
      );
    } catch (err) {
      console.error('Error al descartar aviso de meta:', err);
    } finally {
      setDescartandoIds(prev => {
        const next = new Set(prev);
        next.delete(aviso.meta.id);
        return next;
      });
    }
  };

  if (avisosActivos.length === 0) return null;

  return (
    <div className="w-full bg-slate-100/80 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-6 py-2 space-y-2 z-50">
      <div className="max-w-7xl mx-auto space-y-1.5">
        {avisosActivos.map(aviso => {
          const estilosColor =
            aviso.nivelColor === 'holgado'
              ? {
                  contenedor:
                    'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200',
                  icono: 'text-emerald-600 dark:text-emerald-400',
                  badge:
                    'bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
                  etiquetaRitmo: aviso.completada ? 'Meta completada' : 'Ritmo holgado (< 250 €/mes)',
                }
              : aviso.nivelColor === 'normal'
                ? {
                    contenedor:
                      'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200',
                    icono: 'text-amber-600 dark:text-amber-400',
                    badge:
                      'bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
                    etiquetaRitmo: 'Ritmo medio (~300 €/mes)',
                  }
                : {
                    contenedor:
                      'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200',
                    icono: 'text-rose-600 dark:text-rose-400',
                    badge:
                      'bg-rose-200/70 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200',
                    etiquetaRitmo: 'Ritmo exigente (> 350 €/mes)',
                  };

          const IconoEstado = aviso.completada
            ? CheckCircle2
            : aviso.nivelColor === 'holgado'
              ? CalendarClock
              : aviso.nivelColor === 'normal'
                ? AlertTriangle
                : AlertCircle;

          return (
            <div
              key={`${aviso.meta.id}-${aviso.hito}`}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm shadow-xs transition-all ${estilosColor.contenedor}`}
            >
              <div className="flex items-start sm:items-center gap-2.5 w-full pr-6 sm:pr-0 relative">
                <IconoEstado size={18} className={`shrink-0 mt-0.5 sm:mt-0 ${estilosColor.icono}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <Bell size={13} className="inline" /> {aviso.titulo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${estilosColor.badge}`}>
                      {estilosColor.etiquetaRitmo}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">{aviso.mensaje}</p>
                </div>

                {/* Botón X móvil arriba a la derecha */}
                <button
                  onClick={() => handleDescartar(aviso)}
                  className="sm:hidden absolute top-0 right-0 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Ocultar aviso hasta el próximo hito"
                  aria-label="Cerrar aviso"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Botón X escritorio */}
              <button
                onClick={() => handleDescartar(aviso)}
                className="hidden sm:flex shrink-0 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors items-center justify-center"
                title="Ocultar aviso hasta el próximo hito"
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
