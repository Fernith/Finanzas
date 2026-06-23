use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::ahorros::*;

// --- 1. RESUMEN GLOBAL ---
pub async fn obtener_resumen(State(pool): State<PgPool>) -> Result<Json<ResumenAhorrosDTO>, AppError> {
    let dinero_invertido: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(cantidad), 0)::float FROM operaciones WHERE tipo_operacion_id = 'INVERSION' AND pendiente = false"
    ).fetch_one(&pool).await.unwrap_or(0.0);

    let dinero_liquido: f64 = sqlx::query_scalar!(
        r#"
        WITH UltimoSaldo AS (
            SELECT cuenta_id, cantidad as saldo_inicial, fecha as fecha_saldo,
                   -- AQUÍ DEVOLVEMOS EL CREATED_AT PARA EL DESEMPATE
                   ROW_NUMBER() OVER(PARTITION BY cuenta_id ORDER BY fecha DESC, created_at DESC) as rn
            FROM saldos_cuentas
        ),
        SaldosActuales AS (
            SELECT cuenta_id, saldo_inicial, fecha_saldo FROM UltimoSaldo WHERE rn = 1
        ),
        OperacionesPosteriores AS (
            SELECT o.cuenta_id, 
                   SUM(CASE WHEN o.tipo_operacion_id = 'INGRESO' THEN o.cantidad ELSE -o.cantidad END) as variacion
            FROM operaciones o
            LEFT JOIN SaldosActuales s ON o.cuenta_id = s.cuenta_id
            WHERE o.pendiente = false 
              AND o.tipo_operacion_id IN ('INGRESO', 'GASTO')
              AND (s.fecha_saldo IS NULL OR o.fecha >= s.fecha_saldo)
            GROUP BY o.cuenta_id
        )
        SELECT COALESCE(SUM(COALESCE(s.saldo_inicial, 0.0) + COALESCE(op.variacion, 0.0)), 0.0)::float as "total_liquido!"
        FROM cuentas c
        LEFT JOIN SaldosActuales s ON c.id = s.cuenta_id
        LEFT JOIN OperacionesPosteriores op ON c.id = op.cuenta_id
        WHERE c.activo = true
        "#
    ).fetch_one(&pool).await.unwrap_or(0.0);

    Ok(Json(ResumenAhorrosDTO { dinero_liquido, dinero_invertido }))
}

// --- 2. GESTIÓN DE METAS ---
pub async fn listar_metas(State(pool): State<PgPool>) -> impl IntoResponse {
    // Ya no ordenamos por nombre en el SQL, lo haremos en Rust por porcentaje
    let metas_db: Vec<(String, String, f64, String)> = sqlx::query_as(
        "SELECT id::text, nombre, objetivo::float, color FROM metas_ahorro"
    ).fetch_all(&pool).await.unwrap_or_default();
    
    let mut resultado = Vec::new();

    for (id, nombre, objetivo, color) in metas_db {
        let movs: Vec<(String, String, f64)> = sqlx::query_as(
            "SELECT id::text, fecha::text, cantidad::float FROM movimientos_metas WHERE meta_id = $1::uuid ORDER BY fecha DESC"
        )
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

    // --- NUEVO: ORDENACIÓN POR PORCENTAJE ---
    resultado.sort_by(|a, b| {
        // Calculamos el porcentaje de 'a' y 'b' (evitando división por cero)
        let porcentaje_a = if a.objetivo > 0.0 { a.ahorrado / a.objetivo } else { 0.0 };
        let porcentaje_b = if b.objetivo > 0.0 { b.ahorrado / b.objetivo } else { 0.0 };
        
        // Ordenamos de mayor a menor (descendente). 
        // Si quieres que las metas con menos % salgan arriba, cambia pct_b y pct_a de orden.
        porcentaje_b.partial_cmp(&porcentaje_a).unwrap_or(std::cmp::Ordering::Equal)
    });

    Json(resultado).into_response()
}

pub async fn crear_meta(State(pool): State<PgPool>, Json(payload): Json<UpsertMetaDTO>) -> impl IntoResponse {
    let result = sqlx::query("INSERT INTO metas_ahorro (nombre, objetivo, color) VALUES ($1, $2, $3)")
        .bind(&payload.nombre).bind(&payload.objetivo).bind(&payload.color).execute(&pool).await;
    match result { Ok(_) => (StatusCode::CREATED, "OK").into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn modificar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertMetaDTO>) -> impl IntoResponse {
    let result = sqlx::query("UPDATE metas_ahorro SET nombre = $1, objetivo = $2, color = $3 WHERE id = $4::uuid")
        .bind(&payload.nombre).bind(&payload.objetivo).bind(&payload.color).bind(&id).execute(&pool).await;
    match result { Ok(_) => (StatusCode::OK, "OK").into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn eliminar_meta(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM metas_ahorro WHERE id = $1::uuid").bind(&id).execute(&pool).await;
    match result { Ok(_) => (StatusCode::OK, "OK").into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn agregar_movimiento_meta(State(pool): State<PgPool>, Path(meta_id): Path<String>, Json(payload): Json<NuevoMovimientoMetaDTO>) -> impl IntoResponse {
    let result = sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, $3::float)")
        .bind(&meta_id).bind(&payload.fecha).bind(&payload.cantidad).execute(&pool).await;
    match result { Ok(_) => (StatusCode::CREATED, "OK").into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn opciones_finalizar(State(pool): State<PgPool>) -> impl IntoResponse {
    let categorias: Vec<MaestroDTO> = sqlx::query_as("SELECT id::text, nombre FROM categorias WHERE tipo_operacion_id = 'GASTO' AND activo = true ORDER BY nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    let cuentas: Vec<MaestroDTO> = sqlx::query_as("SELECT id::text, nombre FROM cuentas WHERE activo = true ORDER BY nombre")
        .fetch_all(&pool).await.unwrap_or_default();
    Json(OpcionesFinalizarDTO { categorias, cuentas }).into_response()
}

pub async fn finalizar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<FinalizarMetaDTO>) -> impl IntoResponse {
    let meta_res: Option<(String,)> = sqlx::query_as("SELECT nombre FROM metas_ahorro WHERE id = $1::uuid").bind(&id).fetch_optional(&pool).await.unwrap_or(None);
    if let Some((nombre_meta,)) = meta_res {
        let total_ahorrado: f64 = sqlx::query_scalar("SELECT COALESCE(SUM(cantidad), 0)::float FROM movimientos_metas WHERE meta_id = $1::uuid").bind(&id).fetch_one(&pool).await.unwrap_or(0.0);
        if total_ahorrado > 0.0 {
            let desc = format!("Finalización de la meta {}", nombre_meta);
            sqlx::query("INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente) VALUES ('GASTO', $1::date, $2::float, $3::uuid, $4::uuid, $5, false)")
                .bind(&payload.fecha).bind(total_ahorrado).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&desc).execute(&pool).await.ok();
            sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, $3::float)")
                .bind(&id).bind(&payload.fecha).bind(-total_ahorrado).execute(&pool).await.ok();
        }
    }
    StatusCode::OK.into_response()
}