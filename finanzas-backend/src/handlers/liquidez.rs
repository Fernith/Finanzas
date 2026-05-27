use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct CuentaLiquidezDTO {
    pub cuenta_id: String, pub nombre: String, pub color: String, pub ultimo_saldo_manual: f64, pub fecha_actualizacion: Option<String>, pub saldo_calculado: f64,
}

#[derive(Serialize)]
pub struct HistorialSaldoDTO {
    pub id: String, pub fecha: String, pub cantidad: f64,
}

#[derive(Deserialize)]
pub struct NuevoSaldoDTO {
    pub cuenta_id: String, pub fecha: String, pub cantidad: f64,
}

pub async fn obtener_saldos_actuales(State(pool): State<PgPool>) -> impl IntoResponse {
    let cuentas: Vec<(String, String, String)> = sqlx::query_as("SELECT id::text, nombre, color FROM cuentas WHERE activo = true ORDER BY nombre").fetch_all(&pool).await.unwrap_or_default();
    let mut resultado = Vec::new();

    for (id, nombre, color) in cuentas {
        let saldo_opt: Option<(f64, String)> = sqlx::query_as("SELECT cantidad::float, fecha::text FROM saldos_cuentas WHERE cuenta_id = $1::uuid ORDER BY fecha DESC, created_at DESC LIMIT 1")
            .bind(&id).fetch_optional(&pool).await.unwrap_or(None);

        let (ultimo_manual, fecha_act) = match saldo_opt {
            Some((cant, f)) => (cant, Some(f)),
            None => (0.0, None),
        };

        let mut saldo_calculado = ultimo_manual;

        // FILTRADO CLAVE: AND pendiente = false (Las operaciones pendientes no alteran el saldo bancario actual)
        let query_str = match &fecha_act {
            Some(f) => format!("SELECT tipo_operacion_id, cantidad::float FROM operaciones WHERE cuenta_id = '{}' AND fecha >= '{}' AND pendiente = false AND tipo_operacion_id IN ('INGRESO', 'GASTO')", id, f),
            None => format!("SELECT tipo_operacion_id, cantidad::float FROM operaciones WHERE cuenta_id = '{}' AND pendiente = false AND tipo_operacion_id IN ('INGRESO', 'GASTO')", id),
        };

        let ops: Vec<(String, f64)> = sqlx::query_as(&query_str).fetch_all(&pool).await.unwrap_or_default();
        for (tipo, cantidad) in ops {
            if tipo == "INGRESO" { saldo_calculado += cantidad; }
            else if tipo == "GASTO" { saldo_calculado -= cantidad; }
        }

        resultado.push(CuentaLiquidezDTO { cuenta_id: id, nombre, color, ultimo_saldo_manual: ultimo_manual, fecha_actualizacion: fecha_act, saldo_calculado });
    }
    Json(resultado)
}

pub async fn obtener_historial_cuenta(State(pool): State<PgPool>, Path(cuenta_id): Path<String>) -> impl IntoResponse {
    let rows: Vec<(String, String, f64)> = sqlx::query_as("SELECT id::text, fecha::text, cantidad::float FROM saldos_cuentas WHERE cuenta_id = $1::uuid ORDER BY fecha DESC, created_at DESC").bind(&cuenta_id).fetch_all(&pool).await.unwrap_or_default();
    let hist: Vec<HistorialSaldoDTO> = rows.into_iter().map(|(id, fecha, cantidad)| HistorialSaldoDTO { id, fecha, cantidad }).collect();
    Json(hist)
}

pub async fn registrar_saldo(State(pool): State<PgPool>, Json(payload): Json<NuevoSaldoDTO>) -> impl IntoResponse {
    sqlx::query("INSERT INTO saldos_cuentas (cuenta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, $3::float)").bind(&payload.cuenta_id).bind(&payload.fecha).bind(payload.cantidad).execute(&pool).await.ok();
    StatusCode::CREATED
}