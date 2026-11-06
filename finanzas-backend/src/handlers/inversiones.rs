use axum::{
    extract::{Path, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::transacciones::*;

// ==========================================
// MÓDULO DE ACTIVOS
// ==========================================

pub async fn listar_activos(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as!(
        ActivoDTO,
        r#"
        SELECT 
            a.ticker as "ticker!", 
            a.nombre as "nombre!", 
            a.categoria_id::text as "categoria_id?", 
            c.nombre as "categoria_nombre?",
            c.color as "color?"
        FROM activos a
        LEFT JOIN categorias c ON a.categoria_id = c.id
        ORDER BY a.nombre ASC
        "#
    ).fetch_all(&pool).await?;

    Ok(Json(rows))
}

pub async fn crear_activo(State(pool): State<PgPool>, Json(payload): Json<UpsertActivoDTO>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("INSERT INTO activos (ticker, nombre, categoria_id) VALUES ($1, $2, $3::uuid)")
        .bind(&payload.ticker)
        .bind(&payload.nombre)
        .bind(&payload.categoria_id)
        .execute(&pool).await?;

    Ok(StatusCode::CREATED)
}

pub async fn modificar_activo(State(pool): State<PgPool>, Path(ticker_param): Path<String>, Json(payload): Json<UpsertActivoDTO>) -> Result<impl IntoResponse, AppError> {
    // Nota: Modificamos nombre y categoría, pero NO el ticker porque es la Clave Primaria.
    sqlx::query("UPDATE activos SET nombre = $1, categoria_id = $2::uuid WHERE ticker = $3")
        .bind(&payload.nombre)
        .bind(&payload.categoria_id)
        .bind(&ticker_param)
        .execute(&pool).await?;

    Ok(StatusCode::OK)
}

pub async fn eliminar_activo(State(pool): State<PgPool>, Path(ticker_param): Path<String>) -> Result<impl IntoResponse, AppError> {
    // Al eliminar el activo, las transacciones se borrarán en cascada gracias a ON DELETE CASCADE
    sqlx::query("DELETE FROM activos WHERE ticker = $1").bind(&ticker_param).execute(&pool).await?;
    Ok(StatusCode::OK)
}

// ==========================================
// MÓDULO DE TRANSACCIONES (COMPRAS)
// ==========================================

pub async fn listar_transacciones(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query!(
        r#"SELECT id::text as "id!", fecha_compra::text as "fecha_compra!", euros_invertidos::float as "euros_invertidos!", activo_ticker as "activo_ticker!", cuenta_id::text as "cuenta_id!" 
           FROM transacciones ORDER BY fecha_compra DESC"#
    ).fetch_all(&pool).await?;

    let datos: Vec<TransaccionDTO> = rows.into_iter().map(|r| TransaccionDTO {
        id: r.id,
        fecha_compra: r.fecha_compra,
        euros_invertidos: (r.euros_invertidos * 100.0).round() / 100.0,
        activo_ticker: r.activo_ticker,
        cuenta_id: r.cuenta_id,
    }).collect();
    Ok(Json(datos))
}

pub async fn crear_transaccion(State(pool): State<PgPool>, Json(payload): Json<UpsertTransaccionDTO>) -> Result<impl IntoResponse, AppError> {
    let euros_redondeados = (payload.euros_invertidos * 100.0).round() / 100.0;
    sqlx::query("INSERT INTO transacciones (fecha_compra, euros_invertidos, activo_ticker, cuenta_id) VALUES ($1::date, ROUND($2::float8::numeric, 2), $3, $4::uuid)")
        .bind(&payload.fecha_compra).bind(euros_redondeados).bind(&payload.activo_ticker).bind(&payload.cuenta_id).execute(&pool).await?;

    Ok(StatusCode::CREATED)
}

pub async fn modificar_transaccion(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertTransaccionDTO>) -> Result<impl IntoResponse, AppError> {
    let euros_redondeados = (payload.euros_invertidos * 100.0).round() / 100.0;
    sqlx::query("UPDATE transacciones SET fecha_compra = $1::date, euros_invertidos = ROUND($2::float8::numeric, 2), activo_ticker = $3, cuenta_id = $4::uuid WHERE id = $5::uuid")
        .bind(&payload.fecha_compra).bind(euros_redondeados).bind(&payload.activo_ticker).bind(&payload.cuenta_id).bind(&id)
        .execute(&pool).await?;

    Ok(StatusCode::OK)
}

pub async fn eliminar_transaccion(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM transacciones WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok(StatusCode::OK)
}