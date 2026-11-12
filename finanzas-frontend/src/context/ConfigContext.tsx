import React, { createContext, useContext, useState, useEffect } from 'react';
import { ajustesApi } from '../api/client';

export type TemaApp = 'oscuro' | 'claro';
export type PerfilApp = 'Tipo A' | 'Tipo B';

type ConfigContextType = {
  usarPendientes: boolean;
  setUsarPendientes: (val: boolean) => void;
  fuenteTexto: string;
  fuenteNumeros: string;
  temaDefecto: TemaApp;
  temaActual: TemaApp;
  perfil: PerfilApp;
  setPerfil: (val: PerfilApp) => void;
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
  perfil: 'Tipo A',
  setPerfil: () => {},
  aplicarApariencia: () => {},
  alternarTemaTemporal: () => {},
});

const aplicarFuentesDOM = (texto: string, numeros: string) => {
  const valorTexto =
    texto === 'system-ui'
      ? 'system-ui'
      : texto === 'Alicia'
        ? "'Playfair Display', 'Nunito Sans'"
        : `'${texto}'`;
  const valorNumeros = numeros === 'igual' ? valorTexto : `'Num-${numeros}'`;
  const usaAliciaNumeros =
    numeros === 'Alicia' || (numeros === 'igual' && texto === 'Alicia');

  document.documentElement.style.setProperty('--font-app', valorTexto);
  document.documentElement.style.setProperty('--font-numbers', valorNumeros);
  document.documentElement.style.setProperty(
    '--font-numeric-variant',
    usaAliciaNumeros ? 'normal' : 'tabular-nums',
  );
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
  const [perfil, setPerfil] = useState<PerfilApp>('Tipo A');
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

        const valPerfil = mapa.get('perfil');
        const perfilInicial: PerfilApp = valPerfil === 'Tipo B' ? 'Tipo B' : 'Tipo A';

        setUsarPendientes(activoPendientes);
        setFuenteTexto(valFuenteTexto);
        setFuenteNumeros(valFuenteNumeros);
        setTemaDefecto(temaInicial);
        setTemaActual(temaInicial);
        setPerfil(perfilInicial);

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
        perfil,
        setPerfil,
        aplicarApariencia,
        alternarTemaTemporal,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
