use axum::{
    extract::{Path, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct MovimientoMetaDTO {
    pub id: String,
    pub fecha: String,
    pub cantidad: f64,
}

#[derive(Serialize)]
pub struct MetaAhorroDTO {
    pub id: String,
    pub nombre: String,
    pub objetivo: f64,
    pub color: String,
    pub ahorrado: f64,
    pub movimientos: Vec<MovimientoMetaDTO>,
}

#[derive(Deserialize)]
pub struct UpsertMetaDTO {
    pub nombre: String,
    pub objetivo: f64,
    pub color: String,
}

#[derive(Deserialize)]
pub struct NuevoMovimientoMetaDTO {
    pub fecha: String,
    pub cantidad: f64,
}

#[derive(Serialize)]
pub struct ResumenAhorrosDTO {
    pub dinero_liquido: f64,
    pub dinero_invertido: f64,
}

#[derive(Deserialize)]
pub struct FinalizarMetaDTO {
    pub fecha: String,
    pub cuenta_id: String,
    pub categoria_id: String,
}

#[derive(Serialize)]
pub struct OpcionesFinalizarDTO {
    pub categorias: Vec<MaestroDTO>,
    pub cuentas: Vec<MaestroDTO>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct MaestroDTO {
    pub id: String,
    pub nombre: String,
}

// --- 1. RESUMEN GLOBAL ---
pub async fn obtener_resumen(State(pool): State<PgPool>) -> impl IntoResponse {
    // IGNORAMOS pendientes en el capital invertido real
    let dinero_invertido: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(cantidad), 0)::float FROM operaciones WHERE tipo_operacion_id = 'AHORRO' AND pendiente = false")
        .fetch_one(&pool).await.unwrap_or(0.0);

    let cuentas_ids: Vec<String> = sqlx::query_scalar("SELECT id::text FROM cuentas WHERE activo = true")
        .fetch_all(&pool).await.unwrap_or_default();

    let mut dinero_liquido = 0.0;

    for cuenta_id in cuentas_ids {
        let saldo_opt: Option<(f64, String)> = sqlx::query_as("SELECT cantidad::float, fecha::text FROM saldos_cuentas WHERE cuenta_id = $1::uuid ORDER BY fecha DESC, created_at DESC LIMIT 1")
            .bind(&cuenta_id)
            .fetch_optional(&pool).await.unwrap_or(None);

        let (mut saldo_base, fecha_base) = match saldo_opt {
            Some((cant, f)) => (cant, Some(f)),
            None => (0.0, None),
        };

        // IGNORAMOS pendientes en las fluctuaciones de liquidez
        let query_str = match &fecha_base {
            Some(f) => format!("SELECT tipo_operacion_id, cantidad::float FROM operaciones WHERE cuenta_id = '{}' AND fecha >= '{}' AND pendiente = false AND tipo_operacion_id IN ('INGRESO', 'GASTO')", cuenta_id, f),
            None => format!("SELECT tipo_operacion_id, cantidad::float FROM operaciones WHERE cuenta_id = '{}' AND pendiente = false AND tipo_operacion_id IN ('INGRESO', 'GASTO')", cuenta_id),
        };

        let ops: Vec<(String, f64)> = sqlx::query_as(&query_str).fetch_all(&pool).await.unwrap_or_default();
        
        for (tipo, cantidad) in ops {
            if tipo == "INGRESO" { saldo_base += cantidad; } 
            else if tipo == "GASTO" { saldo_base -= cantidad; }
        }
        dinero_liquido += saldo_base;
    }

    Json(ResumenAhorrosDTO { dinero_liquido, dinero_invertido }).into_response()
}

// --- 2. GESTIÓN DE METAS ---
pub async fn listar_metas(State(pool): State<PgPool>) -> impl IntoResponse {
    let metas_db: Vec<(String, String, f64, String)> = sqlx::query_as("SELECT id::text, nombre, objetivo::float, color FROM metas_ahorro ORDER BY nombre ASC")
        .fetch_all(&pool).await.unwrap_or_default();
    
    let mut resultado = Vec::new();

    for (id, nombre, objetivo, color) in metas_db {
        let movs: Vec<(String, String, f64)> = sqlx::query_as("SELECT id::text, fecha::text, cantidad::float FROM movimientos_metas WHERE meta_id = $1::uuid ORDER BY fecha DESC")
            .bind(&id)
            .fetch_all(&pool).await.unwrap_or_default();
        
        let mut ahorrado = 0.0;
        let mut movimientos_dto = Vec::new();
        for (mov_id, fecha, cantidad) in movs {
            ahorrado += cantidad;
            movimientos_dto.push(MovimientoMetaDTO { id: mov_id, fecha, cantidad });
        }

        resultado.push(MetaAhorroDTO { id, nombre, objetivo, color, ahorrado, movimientos: movimientos_dto });
    }
    Json(resultado).into_response()
}

pub async fn crear_meta(State(pool): State<PgPool>, Json(payload): Json<UpsertMetaDTO>) -> impl IntoResponse {
    sqlx::query("INSERT INTO metas_ahorro (nombre, objetivo, color) VALUES ($1, $2, $3)")
        .bind(&payload.nombre).bind(payload.objetivo).bind(&payload.color).execute(&pool).await.ok();
    StatusCode::CREATED
}

pub async fn modificar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertMetaDTO>) -> impl IntoResponse {
    sqlx::query("UPDATE metas_ahorro SET nombre = $1, objetivo = $2, color = $3 WHERE id = $4::uuid")
        .bind(&payload.nombre).bind(payload.objetivo).bind(&payload.color).bind(&id).execute(&pool).await.ok();
    StatusCode::OK
}

pub async fn eliminar_meta(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    sqlx::query("DELETE FROM metas_ahorro WHERE id = $1::uuid").bind(&id).execute(&pool).await.ok();
    StatusCode::OK
}

pub async fn agregar_movimiento_meta(State(pool): State<PgPool>, Path(meta_id): Path<String>, Json(payload): Json<NuevoMovimientoMetaDTO>) -> impl IntoResponse {
    sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, $3::float)")
        .bind(&meta_id).bind(&payload.fecha).bind(payload.cantidad).execute(&pool).await.ok();
    StatusCode::CREATED
}

pub async fn opciones_finalizar(State(pool): State<PgPool>) -> impl IntoResponse {
    let categorias: Vec<MaestroDTO> = sqlx::query_as::<_, MaestroDTO>("SELECT id::text, nombre FROM categorias WHERE tipo_operacion_id = 'GASTO' AND activo = true ORDER BY nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    let cuentas: Vec<MaestroDTO> = sqlx::query_as::<_, MaestroDTO>("SELECT id::text, nombre FROM cuentas WHERE activo = true ORDER BY nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    Json(OpcionesFinalizarDTO { categorias, cuentas }).into_response()
}

pub async fn finalizar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<FinalizarMetaDTO>) -> impl IntoResponse {
    let meta_res: Option<(String,)> = sqlx::query_as("SELECT nombre FROM metas_ahorro WHERE id = $1::uuid").bind(&id).fetch_optional(&pool).await.unwrap_or(None);
    if let Some((nombre_meta,)) = meta_res {
        let total_ahorrado: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(cantidad), 0)::float FROM movimientos_metas WHERE meta_id = $1::uuid").bind(&id).fetch_one(&pool).await.unwrap_or(0.0);
        if total_ahorrado > 0.0 {
            let notas = format!("Finalización de la meta {}", nombre_meta);
            // El gasto de finalización se inserta directamente completado (pendiente = false)
            sqlx::query("INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, notas, pendiente) VALUES ('GASTO', $1::date, $2::float, $3::uuid, $4::uuid, $5, false)")
                .bind(&payload.fecha).bind(total_ahorrado).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&notas).execute(&pool).await.ok();
            sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, $3::float)")
                .bind(&id).bind(&payload.fecha).bind(-total_ahorrado).execute(&pool).await.ok();
        }
    }
    StatusCode::OK
}