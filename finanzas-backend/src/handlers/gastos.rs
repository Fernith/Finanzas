use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Serialize, sqlx::FromRow)] 
pub struct GastoDTO {
    pub id: String, 
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria_id: String, 
    pub categoria: String, 
    pub cuenta_id: String, 
    pub cuenta: String, 
    pub notas: Option<String>, 
    pub color: String,
    pub pendiente: bool,
}

#[derive(Deserialize)]
pub struct UpsertGastoDTO {
    pub fecha: String, 
    pub cantidad: f64, 
    pub categoria_id: String, 
    pub cuenta_id: String, 
    pub notas: Option<String>,
    pub pendiente: bool, // <-- AÑADIDO
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MaestroDTO {
    pub id: String, 
    pub nombre: String, 
    pub color: Option<String>, 
    pub activo: Option<bool>,
}

pub async fn obtener_categorias_gastos(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows: Vec<MaestroDTO> = sqlx::query_as("SELECT id::text, nombre, color, activo FROM categorias WHERE tipo_operacion_id = 'GASTO' ORDER BY nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    Json(rows)
}

pub async fn obtener_cuentas_gastos(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows: Vec<MaestroDTO> = sqlx::query_as("SELECT c.id::text, c.nombre, c.color, c.activo FROM cuentas c JOIN cuentas_tipos_operacion ct ON c.id = ct.cuenta_id WHERE ct.tipo_operacion_id = 'GASTO' ORDER BY c.nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    Json(rows)
}

pub async fn listar_gastos(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows: Vec<GastoDTO> = sqlx::query_as(
        "SELECT o.id::text, o.fecha::text, o.cantidad::float, o.categoria_id::text, c.nombre as categoria, c.color, o.cuenta_id::text, cu.nombre as cuenta, o.notas, o.pendiente 
         FROM operaciones o JOIN categorias c ON o.categoria_id = c.id JOIN cuentas cu ON o.cuenta_id = cu.id 
         WHERE o.tipo_operacion_id = 'GASTO' ORDER BY o.fecha DESC"
    ).fetch_all(&pool).await.unwrap_or_default();
    Json(rows)
}

pub async fn crear_gasto(State(pool): State<PgPool>, Json(payload): Json<UpsertGastoDTO>) -> impl IntoResponse {
    sqlx::query("INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, notas, pendiente) VALUES ('GASTO', $1::date, $2::float, $3::uuid, $4::uuid, $5, $6::boolean)")
        .bind(&payload.fecha).bind(payload.cantidad).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.notas).bind(payload.pendiente).execute(&pool).await.ok();
    StatusCode::CREATED
}

pub async fn modificar_gasto(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertGastoDTO>) -> impl IntoResponse {
    sqlx::query("UPDATE operaciones SET fecha = $1::date, cantidad = $2::float, categoria_id = $3::uuid, cuenta_id = $4::uuid, notas = $5, pendiente = $6::boolean WHERE id = $7::uuid")
        .bind(&payload.fecha).bind(payload.cantidad).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.notas).bind(payload.pendiente).bind(&id).execute(&pool).await.ok();
    StatusCode::OK
}

pub async fn eliminar_gasto(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    // Borrado físico directo, sin usar "estado"
    sqlx::query("DELETE FROM operaciones WHERE id = $1::uuid").bind(&id).execute(&pool).await.ok();
    StatusCode::OK
}