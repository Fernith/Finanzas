use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct PrestamoDTO {
    pub id: String,
    pub nombre: String,
    pub cantidad_inicial: f64,
    pub cantidad_pendiente: f64,
    pub cuota_periodica: f64,
    pub periodicidad: String,
    pub cuenta_id: String,
    pub cuenta_nombre: String,
    pub fecha_inicio: String,
    pub fecha_proximo_pago: String,
    pub fecha_fin: Option<String>,
    pub finalizado: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct UpsertPrestamoDTO {
    pub nombre: String,
    pub cantidad_inicial: f64,
    pub cantidad_pendiente: f64,
    pub cuota_periodica: f64,
    pub periodicidad: String,
    pub cuenta_id: String,
    pub fecha_inicio: String,
    pub fecha_proximo_pago: String,
    pub fecha_fin: Option<String>,
    pub finalizado: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct PagoPrestamoDTO {
    pub id: String,
    pub fecha: String,
    pub cantidad: f64,
    pub cuenta_id: String,
    pub cuenta_nombre: String,
    pub descripcion: Option<String>,
    pub es_cuota_prestamo: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AmortizarPrestamoDTO {
    pub fecha: String,
    pub cantidad: f64,
    pub cuenta_id: String,
}
