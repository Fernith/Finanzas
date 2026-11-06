use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct SuscripcionDTO {
    pub id: String,
    pub nombre: String,
    pub cantidad: f64,
    pub cuenta_id: String,
    pub cuenta_nombre: String,
    pub fecha_inicio: String,
    pub fecha_proxima_renovacion: String,
    pub periodicidad: String,
    pub activo: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct UpsertSuscripcionDTO {
    pub nombre: String,
    pub cantidad: f64,
    pub cuenta_id: String,
    pub fecha_inicio: String,
    pub fecha_proxima_renovacion: String,
    pub periodicidad: String,
    pub activo: bool,
}