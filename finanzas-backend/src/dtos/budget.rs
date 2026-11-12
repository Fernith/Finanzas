use serde::{Deserialize, Serialize};
use crate::dtos::ajustes::CategoriaItemDTO;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct BudgetCategoriaGastoConfigDTO {
    pub categoria_id: String,
    pub activo: bool,
    pub monto_fijo: f64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct BudgetConfigDTO {
    pub modo_ingreso: String,
    pub ingreso_manual: f64,
    pub categorias_ingresos_seleccionadas: Vec<String>,
    pub ingresos_seleccionados: Vec<String>,
    pub categorias_gastos: Vec<BudgetCategoriaGastoConfigDTO>,
}

impl Default for BudgetConfigDTO {
    fn default() -> Self {
        Self {
            modo_ingreso: "APP".to_string(),
            ingreso_manual: 0.0,
            categorias_ingresos_seleccionadas: Vec::new(),
            ingresos_seleccionados: Vec::new(),
            categorias_gastos: Vec::new(),
        }
    }
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct IngresoBudgetDTO {
    pub id: String,
    pub fecha: String,
    pub cantidad: f64,
    pub categoria_id: String,
    pub categoria: String,
    pub color_categoria: Option<String>,
    pub color_grupo: Option<String>,
    pub cuenta: String,
    pub descripcion: Option<String>,
    pub pendiente: bool,
}

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct GastoCategoriaRealDTO {
    pub categoria_id: String,
    pub total_real: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct BudgetDatosDTO {
    pub config: BudgetConfigDTO,
    pub categorias_ingresos: Vec<CategoriaItemDTO>,
    pub categorias_gastos: Vec<CategoriaItemDTO>,
    pub ingresos_ultimos_30_dias: Vec<IngresoBudgetDTO>,
    pub gastos_mes_actual: Vec<GastoCategoriaRealDTO>,
}
