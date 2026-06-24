use serde::{Deserialize, Serialize};

// --- ACTIVOS (NUEVO MODELO DE INVERSIONES) ---
#[derive(Serialize, sqlx::FromRow)]
pub struct ActivoDTO {
    pub ticker: String,
    pub nombre: String,
    pub categoria_id: Option<String>,
    pub categoria_nombre: Option<String>, // Para mostrar en la tabla
    pub color: Option<String>,
}

#[derive(Deserialize)]
pub struct UpsertActivoDTO {
    pub ticker: String,
    pub nombre: String,
    pub categoria_id: Option<String>,
}

// --- TRANSACCIONES (COMPRAS DE ACTIVOS) ---
#[derive(Serialize, sqlx::FromRow)]
pub struct TransaccionDTO {
    pub id: String,
    pub fecha_compra: String,
    pub euros_invertidos: f64,
    pub activo_ticker: String,
    pub cuenta_id: String,
}

#[derive(Deserialize)]
pub struct UpsertTransaccionDTO {
    pub fecha_compra: String,
    pub euros_invertidos: f64,
    pub activo_ticker: String,
    pub cuenta_id: String,
}