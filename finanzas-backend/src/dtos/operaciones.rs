use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct FiltroFecha { 
    pub mes: i32, 
    pub anio: i32, 
    pub buscar: Option<String>, 
    pub limit: Option<i64>, 
    pub offset: Option<i64> 
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct MaestroDTO { 
    pub id: String, 
    pub nombre: String, 
    pub color: Option<String>, 
    pub activo: Option<bool> 
}

// --- GASTOS ---
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct GastoDTO { 
    pub id: String, 
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria: String, 
    pub color_categoria: Option<String>, 
    pub cuenta: String, 
    pub descripcion: Option<String>, 
    pub pendiente: bool 
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct NuevoGastoDTO { 
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria_id: String, 
    pub cuenta_id: String, 
    pub descripcion: Option<String>, 
    pub pendiente: bool 
}

// --- INGRESOS ---
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct IngresoDTO { 
    pub id: String, 
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria: String, 
    pub color_categoria: Option<String>, 
    pub cuenta: String, 
    pub descripcion: Option<String>,
    pub pendiente: bool,
    pub campo_extra_ingreso: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct NuevoIngresoDTO { 
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria_id: String, 
    pub cuenta_id: String, 
    pub descripcion: Option<String>, 
    pub pendiente: bool,
    pub campo_extra_ingreso: Option<String>,
}