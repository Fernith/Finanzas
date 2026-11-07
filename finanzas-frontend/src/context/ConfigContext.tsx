import React, { createContext, useContext, useState, useEffect } from 'react';
import { ajustesApi } from '../api/client';

export type TemaApp = 'oscuro' | 'claro';
export type TipoAplicacion = 'Tipo A' | 'Tipo B';

type ConfigContextType = {
  usarPendientes: boolean;
  setUsarPendientes: (val: boolean) => void;
  fuenteTexto: string;
  fuenteNumeros: string;
  temaDefecto: TemaApp;
  temaActual: TemaApp;
  tipoAplicacion: TipoAplicacion;
  setTipoAplicacion: (val: TipoAplicacion) => void;
  aplicarApariencia: (texto: string, numeros: string, tema: TemaApp) => void;
  alternarTemaTemporal: () => void;
};

const ConfigContext = createContext<ConfigContextType>({
  usarPendientes: false,
  setUsarPendientes: () => {},
  fuenteTexto: 'Inter',
  fuenteNumeros: 'igual',
  temaDefecto: 'oscuro',
  temaActual: 'oscuro',
  tipoAplicacion: 'Tipo A',
  setTipoAplicacion: () => {},
  aplicarApariencia: () => {},
  alternarTemaTemporal: () => {},
});

const aplicarFuentesDOM = (texto: string, numeros: string) => {
  const valorTexto = texto === 'system-ui' ? 'system-ui' : `'${texto}'`;
  const valorNumeros = numeros === 'igual' ? valorTexto : `'Num-${numeros}'`;
  document.documentElement.style.setProperty('--font-app', valorTexto);
  document.documentElement.style.setProperty('--font-numbers', valorNumeros);
};

const aplicarTemaDOM = (tema: TemaApp) => {
  document.documentElement.classList.toggle('dark', tema === 'oscuro');
};

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [usarPendientes, setUsarPendientes] = useState<boolean>(false);
  const [fuenteTexto, setFuenteTexto] = useState<string>('Inter');
  const [fuenteNumeros, setFuenteNumeros] = useState<string>('igual');
  const [temaDefecto, setTemaDefecto] = useState<TemaApp>('oscuro');
  const [temaActual, setTemaActual] = useState<TemaApp>('oscuro');
  const [tipoAplicacion, setTipoAplicacion] = useState<TipoAplicacion>('Tipo A');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    ajustesApi.listarAjustes()
      .then(data => {
        const mapa = new Map(data.map(a => [a.clave, a.valor.trim()]));

        const valPendientes = mapa.get('pendientes');
        const activoPendientes = valPendientes ? valPendientes.toLowerCase() === 'true' : false;

        const valFuenteTexto = mapa.get('fuente_texto') || 'Inter';
        const valFuenteNumeros = mapa.get('fuente_numeros') || 'igual';

        const valTema = mapa.get('tema_defecto')?.toLowerCase();
        const temaInicial: TemaApp = valTema === 'claro' ? 'claro' : 'oscuro';

        const valTipoApp = mapa.get('tipo_aplicacion');
        const tipoAppInicial: TipoAplicacion = valTipoApp === 'Tipo B' ? 'Tipo B' : 'Tipo A';

        setUsarPendientes(activoPendientes);
        setFuenteTexto(valFuenteTexto);
        setFuenteNumeros(valFuenteNumeros);
        setTemaDefecto(temaInicial);
        setTemaActual(temaInicial);
        setTipoAplicacion(tipoAppInicial);

        aplicarFuentesDOM(valFuenteTexto, valFuenteNumeros);
        aplicarTemaDOM(temaInicial);
        setCargando(false);
      })
      .catch(() => {
        aplicarFuentesDOM('Inter', 'igual');
        aplicarTemaDOM('oscuro');
        setCargando(false);
      });
  }, []);

  const aplicarApariencia = (texto: string, numeros: string, tema: TemaApp) => {
    setFuenteTexto(texto);
    setFuenteNumeros(numeros);
    setTemaDefecto(tema);
    setTemaActual(tema);
    aplicarFuentesDOM(texto, numeros);
    aplicarTemaDOM(tema);
  };

  const alternarTemaTemporal = () => {
    const siguiente: TemaApp = temaActual === 'oscuro' ? 'claro' : 'oscuro';
    setTemaActual(siguiente);
    aplicarTemaDOM(siguiente);
  };

  if (cargando) return null; // Esperamos a tener la config para pintar la app

  return (
    <ConfigContext.Provider
      value={{
        usarPendientes,
        setUsarPendientes,
        fuenteTexto,
        fuenteNumeros,
        temaDefecto,
        temaActual,
        tipoAplicacion,
        setTipoAplicacion,
        aplicarApariencia,
        alternarTemaTemporal,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
