import axios from 'axios';
import type {
  Activo,
  CategoriaItem,
  Configuracion,
  CuentaItem,
  CuentaLiquidez,
  FinalizarMetaPayload,
  HistorialSaldo,
  MetaAhorro,
  NuevoGastoPayload,
  NuevoIngresoPayload,
  NuevoMovimientoMetaPayload,
  NuevoSaldoPayload,
  OpcionesFinalizar,
  OperacionAnual,
  ReordenarItem,
  ResumenAhorros,
  Suscripcion,
  TransaccionInversion,
  Transaction,
  UpsertActivoPayload,
  UpsertCategoriaPayload,
  UpsertCuentaPayload,
  UpsertMetaPayload,
  UpsertSuscripcionPayload,
  UpsertTransaccionInversionPayload,
} from '../types';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const operacionesApi = {
  listar: async (tipo: 'GASTO' | 'INGRESO', mes: number, anio: number, buscar = ''): Promise<Transaction[]> => {
    const endpoint = tipo === 'GASTO' ? '/gastos' : '/ingresos';
    const { data } = await apiClient.get<Transaction[]>(endpoint, {
      params: { mes, anio, buscar },
    });
    return data;
  },
  crearGasto: async (payload: NuevoGastoPayload): Promise<void> => {
    await apiClient.post('/gastos', payload);
  },
  actualizarGasto: async (id: string, payload: NuevoGastoPayload): Promise<void> => {
    await apiClient.put(`/gastos/${id}`, payload);
  },
  crearIngreso: async (payload: NuevoIngresoPayload): Promise<void> => {
    await apiClient.post('/ingresos', payload);
  },
  actualizarIngreso: async (id: string, payload: NuevoIngresoPayload): Promise<void> => {
    await apiClient.put(`/ingresos/${id}`, payload);
  },
  completar: async (tipo: 'GASTO' | 'INGRESO', id: string): Promise<void> => {
    const endpoint = tipo === 'GASTO' ? `/gastos/${id}/completar` : `/ingresos/${id}/completar`;
    await apiClient.patch(endpoint);
  },
  eliminar: async (tipo: 'GASTO' | 'INGRESO', id: string): Promise<void> => {
    const endpoint = tipo === 'GASTO' ? `/gastos/${id}` : `/ingresos/${id}`;
    await apiClient.delete(endpoint);
  },
};

export const balanceApi = {
  obtenerAnual: async (anio: number): Promise<OperacionAnual[]> => {
    const { data } = await apiClient.get<OperacionAnual[]>('/balance/anual', {
      params: { anio },
    });
    return data;
  },
};

export const ahorrosApi = {
  listarMetas: async (): Promise<MetaAhorro[]> => {
    const { data } = await apiClient.get<MetaAhorro[]>('/ahorros/metas');
    return data;
  },
  obtenerResumen: async (): Promise<ResumenAhorros> => {
    const { data } = await apiClient.get<ResumenAhorros>('/ahorros/resumen');
    return data;
  },
  crearMeta: async (payload: UpsertMetaPayload): Promise<void> => {
    await apiClient.post('/ahorros/metas', payload);
  },
  modificarMeta: async (id: string, payload: UpsertMetaPayload): Promise<void> => {
    await apiClient.put(`/ahorros/metas/${id}`, payload);
  },
  eliminarMeta: async (id: string): Promise<void> => {
    await apiClient.delete(`/ahorros/metas/${id}`);
  },
  agregarMovimiento: async (metaId: string, payload: NuevoMovimientoMetaPayload): Promise<void> => {
    await apiClient.post(`/ahorros/metas/${metaId}/movimientos`, payload);
  },
  obtenerOpcionesFinalizar: async (): Promise<OpcionesFinalizar> => {
    const { data } = await apiClient.get<OpcionesFinalizar>('/ahorros/opciones-finalizar');
    return data;
  },
  finalizarMeta: async (metaId: string, payload: FinalizarMetaPayload): Promise<void> => {
    await apiClient.post(`/ahorros/metas/${metaId}/finalizar`, payload);
  },
};

export const liquidezApi = {
  obtenerSaldos: async (): Promise<CuentaLiquidez[]> => {
    const { data } = await apiClient.get<CuentaLiquidez[]>('/liquidez/saldos');
    return data;
  },
  obtenerHistorial: async (cuentaId: string): Promise<HistorialSaldo[]> => {
    const { data } = await apiClient.get<HistorialSaldo[]>(`/liquidez/saldos/${cuentaId}`);
    return data;
  },
  registrarSaldo: async (payload: NuevoSaldoPayload): Promise<void> => {
    await apiClient.post('/liquidez/saldos', payload);
  },
};

export const inversionesApi = {
  listarActivos: async (): Promise<Activo[]> => {
    const { data } = await apiClient.get<Activo[]>('/inversiones/activos');
    return data;
  },
  crearActivo: async (payload: UpsertActivoPayload): Promise<void> => {
    await apiClient.post('/inversiones/activos', payload);
  },
  modificarActivo: async (ticker: string, payload: UpsertActivoPayload): Promise<void> => {
    await apiClient.put(`/inversiones/activos/${encodeURIComponent(ticker)}`, payload);
  },
  listarTransacciones: async (): Promise<TransaccionInversion[]> => {
    const { data } = await apiClient.get<TransaccionInversion[]>('/inversiones/transacciones');
    return data;
  },
  crearTransaccion: async (payload: UpsertTransaccionInversionPayload): Promise<void> => {
    await apiClient.post('/inversiones/transacciones', payload);
  },
  modificarTransaccion: async (id: string, payload: UpsertTransaccionInversionPayload): Promise<void> => {
    await apiClient.put(`/inversiones/transacciones/${id}`, payload);
  },
  eliminarTransaccion: async (id: string): Promise<void> => {
    await apiClient.delete(`/inversiones/transacciones/${id}`);
  },
};

export const suscripcionesApi = {
  listar: async (): Promise<Suscripcion[]> => {
    const { data } = await apiClient.get<Suscripcion[]>('/suscripciones');
    return data;
  },
  crear: async (payload: UpsertSuscripcionPayload): Promise<void> => {
    await apiClient.post('/suscripciones', payload);
  },
  modificar: async (id: string, payload: UpsertSuscripcionPayload): Promise<void> => {
    await apiClient.put(`/suscripciones/${id}`, payload);
  },
  eliminar: async (id: string): Promise<void> => {
    await apiClient.delete(`/suscripciones/${id}`);
  },
};

export const ajustesApi = {
  listarCategorias: async (): Promise<CategoriaItem[]> => {
    const { data } = await apiClient.get<CategoriaItem[]>('/ajustes/categorias');
    return data;
  },
  crearCategoria: async (payload: UpsertCategoriaPayload): Promise<void> => {
    await apiClient.post('/ajustes/categorias', payload);
  },
  modificarCategoria: async (id: string, payload: UpsertCategoriaPayload): Promise<void> => {
    await apiClient.put(`/ajustes/categorias/${id}`, payload);
  },
  desactivarCategoria: async (id: string): Promise<void> => {
    await apiClient.delete(`/ajustes/categorias/${id}`);
  },
  activarCategoria: async (id: string): Promise<void> => {
    await apiClient.put(`/ajustes/categorias/${id}/activar`);
  },
  reordenarCategorias: async (payload: ReordenarItem[]): Promise<void> => {
    await apiClient.put('/ajustes/categorias/reordenar', payload);
  },
  listarCuentas: async (): Promise<CuentaItem[]> => {
    const { data } = await apiClient.get<CuentaItem[]>('/ajustes/cuentas');
    return data;
  },
  crearCuenta: async (payload: UpsertCuentaPayload): Promise<void> => {
    await apiClient.post('/ajustes/cuentas', payload);
  },
  modificarCuenta: async (id: string, payload: UpsertCuentaPayload): Promise<void> => {
    await apiClient.put(`/ajustes/cuentas/${id}`, payload);
  },
  desactivarCuenta: async (id: string): Promise<void> => {
    await apiClient.delete(`/ajustes/cuentas/${id}`);
  },
  activarCuenta: async (id: string): Promise<void> => {
    await apiClient.put(`/ajustes/cuentas/${id}/activar`);
  },
  reordenarCuentas: async (payload: ReordenarItem[]): Promise<void> => {
    await apiClient.put('/ajustes/cuentas/reordenar', payload);
  },
  obtenerConfiguracion: async (): Promise<Configuracion> => {
    const { data } = await apiClient.get<Configuracion>('/configuracion');
    return data;
  },
  actualizarConfiguracion: async (payload: Configuracion): Promise<void> => {
    await apiClient.put('/configuracion', payload);
  },
};
