import { useState, useEffect } from 'react';
import { Users, Save, Check } from 'lucide-react';
import { ajustesApi } from '../../api/client';
import { useConfig } from '../../context/ConfigContext';
import type { PerfilApp } from '../../context/ConfigContext';

export default function AjustesTipoAplicacion() {
  const { perfil, setPerfil } = useConfig();

  const [seleccionPerfil, setSeleccionPerfil] = useState<PerfilApp>(perfil);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  useEffect(() => {
    setSeleccionPerfil(perfil);
  }, [perfil]);

  const handleGuardar = async () => {
    setGuardando(true);
    setGuardadoExito(false);
    try {
      await ajustesApi.actualizarAjuste({
        clave: 'perfil',
        valor: seleccionPerfil,
      });
      setPerfil(seleccionPerfil);
      setGuardadoExito(true);
      setTimeout(() => setGuardadoExito(false), 2500);
    } catch {
      alert('Error de conexión al guardar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4 h-full">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users size={20} className="text-emerald-500" /> Perfil
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Selecciona el perfil de configuración para adaptar el comportamiento de la aplicación.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
        <select
          value={seleccionPerfil}
          onChange={(e) => setSeleccionPerfil(e.target.value === 'Tipo B' ? 'Tipo B' : 'Tipo A')}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        >
          <option value="Tipo A">Alicia</option>
          <option value="Tipo B">Fernando</option>
        </select>

        <div className="flex justify-end">
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
    </div>
  );
}
