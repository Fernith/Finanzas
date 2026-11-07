// ----------------------------------------------------
// OPERACIONES BASE (Gastos e Ingresos)
// ----------------------------------------------------
export type TipoOperacion = 'GASTO' | 'INGRESO' | 'INVERSION';

export interface TransaccionBase {
  id: string;
  fecha: string;
  cantidad: number;
  categoria_id: string;
  categoria?: string;
  cuenta_id: string;
  cuenta?: string;
  descripcion?: string | null;
  pendiente: boolean;
}

export interface Transaction {
  id: string;
  fecha: string;
  cantidad: number;
  categoria: string;
  color_categoria?: string | null;
  campo_extra_ingreso?: string | null;
  cuenta: string;
  descripcion?: string | null;
  pendiente: boolean;
  categoria_id?: string;
  cuenta_id?: string;
  tipo_operacion_id?: TipoOperacion;
}

export type Gasto = Transaction;
export type Ingreso = Transaction;

export interface NuevoGastoPayload {
  fecha: string;
  cantidad: number;
  categoria_id: string;
  cuenta_id: string;
  descripcion: string | null;
  pendiente: boolean;
}

export interface NuevoIngresoPayload extends NuevoGastoPayload {
  campo_extra_ingreso?: string | null;
}

export interface CategoriaStatOperacion {
  nombre: string;
  color: string;
  totalAnual: number;
  totalMes: number;
  media: number;
  evolucion: number;
}

export interface SankeyNode {
  name: string;
  fill: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export type BarraMesOperacion = { mes: string } & Record<string, string | number>;

export interface BarraMediaCategoria {
  categoria: string;
  Media: number;
  fill: string;
}

// ----------------------------------------------------
// AJUSTES Y CONFIGURACION
// ----------------------------------------------------
export interface GrupoItem {
  id: string;
  nombre: string;
  color?: string | null;
  activo: boolean;
  orden: number;
}

export interface CategoriaItem {
  id: string;
  nombre: string;
  tipo_operacion_id: string;
  color?: string | null;
  activo: boolean;
  orden: number;
}

export interface UpsertCategoriaPayload {
  nombre: string;
  tipo_operacion_id: string;
  orden?: number;
  color?: string | null;
}

export interface CuentaItem {
  id: string;
  nombre: string;
  color?: string | null;
  activo: boolean;
  orden: number;
  tipos_operacion: string[];
}

export interface UpsertCuentaPayload {
  nombre: string;
  color?: string | null;
  orden?: number;
  tipos_operacion: string[];
}

export type CatalogoItem = CategoriaItem | CuentaItem;

export interface AjusteItem {
  clave: string;
  valor: string;
}

export interface ReordenarItem {
  id: string;
  orden: number;
}

// ----------------------------------------------------
// BALANCE ANUAL
// ----------------------------------------------------
export interface OperacionAnual {
  fecha: string;
  cantidad: number;
  tipo_operacion_id: string;
  categoria: string;
  color_categoria?: string | null;
}

export interface ResumenMesBalance {
  mes: string;
  ingresos: number;
  gastos: number;
  balance: number;
  categoriasGastos: Record<string, number>;
  categoriasIngresos: Record<string, number>;
}

export interface FilaCategoriaBalance {
  categoria: string;
  meses: number[];
  total: number;
  media: number;
  porcentaje: number;
  color: string;
}

// ----------------------------------------------------
// INVERSIONES
// ----------------------------------------------------
export interface Activo {
  ticker: string;
  nombre: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  color?: string | null;
}

export interface UpsertActivoPayload {
  ticker: string;
  nombre: string;
  categoria_id: string | null;
}

export interface TransaccionInversion {
  id: string;
  fecha_compra: string;
  euros_invertidos: number;
  activo_ticker: string;
  cuenta_id: string;
}

export interface UpsertTransaccionInversionPayload {
  fecha_compra: string;
  euros_invertidos: number;
  activo_ticker: string;
  cuenta_id: string;
}

export interface ActivoConTransacciones extends Activo {
  transacciones: TransaccionInversion[];
  total_invertido: number;
}

// ----------------------------------------------------
// LIQUIDEZ
// ----------------------------------------------------
export interface CuentaLiquidez {
  cuenta_id: string;
  nombre: string;
  color: string;
  ultimo_saldo_manual: number;
  fecha_actualizacion?: string | null;
  saldo_calculado: number;
}

export interface HistorialSaldo {
  id: string;
  fecha: string;
  cantidad: number;
}

export interface NuevoSaldoPayload {
  cuenta_id: string;
  fecha: string;
  cantidad: number;
}

// ----------------------------------------------------
// SUSCRIPCIONES Y METAS DE AHORRO
// ----------------------------------------------------
export type PeriodicidadSuscripcion = '30_DIAS' | 'MENSUAL' | 'ANUAL';

export interface Suscripcion {
  id: string;
  nombre: string;
  cantidad: number;
  cuenta_id: string;
  cuenta_nombre: string;
  fecha_inicio: string;
  fecha_proxima_renovacion: string;
  periodicidad: PeriodicidadSuscripcion;
  activo?: boolean | null;
}

export interface UpsertSuscripcionPayload {
  nombre: string;
  cantidad: number;
  cuenta_id: string;
  fecha_inicio: string;
  fecha_proxima_renovacion: string;
  periodicidad: PeriodicidadSuscripcion;
  activo: boolean;
}

export interface MovimientoMeta {
  id: string;
  fecha: string;
  cantidad: number;
}

export interface MetaAhorro {
  id: string;
  nombre: string;
  objetivo: number;
  color: string;
  ahorrado: number;
  movimientos: MovimientoMeta[];
}

export interface UpsertMetaPayload {
  nombre: string;
  objetivo: number;
  color: string;
}

export interface NuevoMovimientoMetaPayload {
  fecha: string;
  cantidad: number;
}

export interface ResumenAhorros {
  dinero_liquido: number;
  dinero_invertido: number;
}

export interface MaestroBasico {
  id: string;
  nombre: string;
}

export interface OpcionesFinalizar {
  categorias: MaestroBasico[];
  cuentas: MaestroBasico[];
}

export interface FinalizarMetaPayload {
  fecha: string;
  cuenta_id: string;
  categoria_id: string;
}
