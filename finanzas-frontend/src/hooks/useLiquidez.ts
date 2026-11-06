import { useState, useEffect, useMemo, useCallback } from 'react';
import { liquidezApi } from '../api/client';
import type { CuentaLiquidez } from '../types';
import { redondearMoneda } from '../utils/formatters';

export function useLiquidez() {
  const [cuentas, setCuentas] = useState<CuentaLiquidez[]>([]);

  const cargarCuentas = useCallback(() => {
    liquidezApi.obtenerSaldos().then(setCuentas).catch(console.error);
  }, []);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  useEffect(() => {
    const handler = () => cargarCuentas();
    window.addEventListener('actualizarTransacciones', handler);
    return () => window.removeEventListener('actualizarTransacciones', handler);
  }, [cargarCuentas]);

  const totalCalculado = useMemo(
    () => redondearMoneda(cuentas.reduce((acc, c) => acc + c.saldo_calculado, 0)),
    [cuentas]
  );

  return { cuentas, totalCalculado, cargarCuentas };
}
