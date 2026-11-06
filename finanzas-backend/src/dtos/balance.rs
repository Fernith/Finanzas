use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct FiltroAnio {
    pub anio: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct OperacionAnualDTO {
    pub fecha: String,
    pub cantidad: f64,
    pub tipo_operacion_id: String,
    pub categoria: String,
    pub color_categoria: Option<String>, // AÑADIMOS EL COLOR
}