import React, { createContext, useContext, useState, useEffect } from 'react';
import { ajustesApi } from '../api/client';

type ConfigContextType = {
  usarPendientes: boolean;
  setUsarPendientes: (val: boolean) => void;
};

const ConfigContext = createContext<ConfigContextType>({ usarPendientes: false, setUsarPendientes: () => {} });

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [usarPendientes, setUsarPendientes] = useState<boolean>(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    ajustesApi.obtenerConfiguracion()
      .then(data => {
        setUsarPendientes(data.usar_pendientes);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  if (cargando) return null; // Esperamos a tener la config para pintar la app

  return (
    <ConfigContext.Provider value={{ usarPendientes, setUsarPendientes }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
