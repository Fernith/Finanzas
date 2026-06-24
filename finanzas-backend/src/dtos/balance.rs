use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct FiltroAnio {
    pub anio: i32,
}

#[derive(Serialize)]
pub struct OperacionAnualDTO {
    pub fecha: String,
    pub cantidad: f64,
    pub tipo_operacion_id: String,
    pub categoria: String,
    pub color_categoria: Option<String>, // AÑADIMOS EL COLOR
}