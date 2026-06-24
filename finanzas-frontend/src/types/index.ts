// ----------------------------------------------------
// OPERACIONES BASE (Gastos e Ingresos)
// ----------------------------------------------------
export interface TransaccionBase {
  id: string;
  fecha: string;
  cantidad: number;
  categoria_id: string; // Ahora usamos los IDs reales de Supabase
  categoria?: string;   // Nombre para mostrar en la UI
  cuenta_id: string;    // Ahora usamos los IDs reales de Supabase
  cuenta?: string;      // Nombre para mostrar en la UI
  descripcion?: string;
  pendiente: boolean;
}

export interface Transaction {
  id: string;
  fecha: string;
  cantidad: number;
  categoria: string;
  color_categoria?: string;
  campo_extra_ingreso?: string;
  cuenta: string;
  descripcion?: string;
  pendiente: boolean;
}

export interface Gasto extends Transaction {}
export interface Ingreso extends Transaction {}

// ----------------------------------------------------
// NUEVO MODELO DE INVERSIONES
// ----------------------------------------------------
export interface Activo {
  ticker: string;
  nombre: string;
  categoria_id?: string;
  categoria_nombre?: string;
  color?: string;
}

export interface TransaccionInversion {
  id: string;
  fecha_compra: string;
  euros_invertidos: number;
  activo_ticker: string;
}

// ----------------------------------------------------
// SUSCRIPCIONES Y METAS
// ----------------------------------------------------
export interface Suscripcion {
  id: string;
  nombre: string;
  cantidad: number;
  cuenta_id: string;
  cuenta_nombre?: string;
  fecha_inicio: string;
  fecha_proxima_renovacion: string;
  periodicidad: '30_DIAS' | 'MENSUAL' | 'ANUAL';
  activo: boolean;
}

export interface MetaAhorro {
  id: string;
  nombre: string;
  objetivo: number;
  color?: string;
}