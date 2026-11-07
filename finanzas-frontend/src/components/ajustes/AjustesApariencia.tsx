import { useState, useEffect } from 'react';
import { Type, Save, Check } from 'lucide-react';
import { ajustesApi } from '../../api/client';
import { useConfig } from '../../context/ConfigContext';
import type { TemaApp } from '../../context/ConfigContext';

const OPCIONES_FUENTE_TEXTO = [
  { valor: 'Inter', etiqueta: 'Inter (Por defecto)' },
  { valor: 'Plus Jakarta Sans', etiqueta: 'Plus Jakarta Sans' },
  { valor: 'Outfit', etiqueta: 'Outfit' },
  { valor: 'Roboto', etiqueta: 'Roboto' },
  { valor: 'Poppins', etiqueta: 'Poppins' },
  { valor: 'Playfair Display', etiqueta: 'Playfair Display' },
  { valor: 'Nunito Sans', etiqueta: 'Nunito Sans' },
  { valor: 'system-ui', etiqueta: 'System UI (Sistema)' },
];

const OPCIONES_FUENTE_NUMEROS = [
  { valor: 'igual', etiqueta: 'Igual que el texto' },
  { valor: 'JetBrains Mono', etiqueta: 'JetBrains Mono' },
  { valor: 'Space Grotesk', etiqueta: 'Space Grotesk' },
  { valor: 'Roboto Mono', etiqueta: 'Roboto Mono' },
  { valor: 'Outfit', etiqueta: 'Outfit' },
  { valor: 'Inter', etiqueta: 'Inter' },
];

export default function AjustesApariencia() {
  const { fuenteTexto, fuenteNumeros, temaDefecto, aplicarApariencia } = useConfig();

  const [seleccionTexto, setSeleccionTexto] = useState<string>(fuenteTexto);
  const [seleccionNumeros, setSeleccionNumeros] = useState<string>(fuenteNumeros);
  const [seleccionTema, setSeleccionTema] = useState<TemaApp>(temaDefecto);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  useEffect(() => {
    setSeleccionTexto(fuenteTexto);
    setSeleccionNumeros(fuenteNumeros);
    setSeleccionTema(temaDefecto);
  }, [fuenteTexto, fuenteNumeros, temaDefecto]);

  const handleGuardar = async () => {
    setGuardando(true);
    setGuardadoExito(false);
    try {
      await Promise.all([
        ajustesApi.actualizarAjuste({ clave: 'fuente_texto', valor: seleccionTexto }),
        ajustesApi.actualizarAjuste({ clave: 'fuente_numeros', valor: seleccionNumeros }),
        ajustesApi.actualizarAjuste({ clave: 'tema_defecto', valor: seleccionTema }),
      ]);
      aplicarApariencia(seleccionTexto, seleccionNumeros, seleccionTema);
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 2500);
    } catch {
      alert('Error de conexión al guardar los ajustes de apariencia');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Type size={20} className="text-indigo-500" /> Tipografía y Apariencia
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Personaliza la fuente general, la tipografía exclusiva para importes/números y el modo visual por defecto al iniciar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Fuente del Texto
          </label>
          <select
            value={seleccionTexto}
            onChange={(e) => setSeleccionTexto(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {OPCIONES_FUENTE_TEXTO.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Fuente de los Números
          </label>
          <select
            value={seleccionNumeros}
            onChange={(e) => setSeleccionNumeros(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {OPCIONES_FUENTE_NUMEROS.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Tema por Defecto
          </label>
          <select
            value={seleccionTema}
            onChange={(e) => setSeleccionTema(e.target.value === 'claro' ? 'claro' : 'oscuro')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="oscuro">Modo Oscuro</option>
            <option value="claro">Modo Claro</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all w-full sm:w-auto cursor-pointer disabled:opacity-50 ${
            guardadoExito
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
          }`}
        >
          {guardadoExito ? <Check size={16} /> : <Save size={16} />}
          {guardando ? 'Guardando...' : guardadoExito ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
