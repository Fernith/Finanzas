use axum::{
    extract::{Path, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use sqlx::PgPool;
use crate::dtos::transacciones::*;

// ==========================================
// MÓDULO DE ACTIVOS
// ==========================================

pub async fn listar_activos(State(pool): State<PgPool>) -> impl IntoResponse {
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
    ).fetch_all(&pool).await;

    match rows {
        Ok(items) => Json(items).into_response(),
        Err(e) => {
            println!("❌ Error SQL en listar_activos: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn crear_activo(State(pool): State<PgPool>, Json(payload): Json<UpsertActivoDTO>) -> impl IntoResponse {
    let result = sqlx::query("INSERT INTO activos (ticker, nombre, categoria_id) VALUES ($1, $2, $3::uuid)")
        .bind(&payload.ticker)
        .bind(&payload.nombre)
        .bind(&payload.categoria_id)
        .execute(&pool).await;

    match result { 
        Ok(_) => StatusCode::CREATED.into_response(), 
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() 
    }
}

pub async fn modificar_activo(State(pool): State<PgPool>, Path(ticker_param): Path<String>, Json(payload): Json<UpsertActivoDTO>) -> impl IntoResponse {
    // Nota: Modificamos nombre y categoría, pero NO el ticker porque es la Clave Primaria.
    let result = sqlx::query("UPDATE activos SET nombre = $1, categoria_id = $2::uuid WHERE ticker = $3")
        .bind(&payload.nombre)
        .bind(&payload.categoria_id)
        .bind(&ticker_param)
        .execute(&pool).await;

    match result { 
        Ok(_) => StatusCode::OK.into_response(), 
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() 
    }
}

pub async fn eliminar_activo(State(pool): State<PgPool>, Path(ticker_param): Path<String>) -> impl IntoResponse {
    // Al eliminar el activo, las transacciones se borrarán en cascada gracias a ON DELETE CASCADE
    let result = sqlx::query("DELETE FROM activos WHERE ticker = $1").bind(&ticker_param).execute(&pool).await;
    match result { 
        Ok(_) => StatusCode::OK.into_response(), 
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() 
    }
}

// ==========================================
// MÓDULO DE TRANSACCIONES (COMPRAS)
// ==========================================

pub async fn listar_transacciones(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows = sqlx::query!(
        r#"SELECT id::text as "id!", fecha_compra::text as "fecha_compra!", euros_invertidos::float as "euros_invertidos!", activo_ticker as "activo_ticker!", cuenta_id::text as "cuenta_id!" 
           FROM transacciones ORDER BY fecha_compra DESC"#
    ).fetch_all(&pool).await;

    match rows {
        Ok(filas) => {
            let datos: Vec<TransaccionDTO> = filas.into_iter().map(|r| TransaccionDTO {
                id: r.id, fecha_compra: r.fecha_compra, euros_invertidos: r.euros_invertidos, activo_ticker: r.activo_ticker, cuenta_id: r.cuenta_id
            }).collect();
            Json(datos).into_response()
        },
        Err(e) => {
            println!("❌ Error SQL en listar_transacciones: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn crear_transaccion(State(pool): State<PgPool>, Json(payload): Json<UpsertTransaccionDTO>) -> impl IntoResponse {
    let result = sqlx::query("INSERT INTO transacciones (fecha_compra, euros_invertidos, activo_ticker, cuenta_id) VALUES ($1::date, $2::float8::numeric, $3, $4::uuid)")
        .bind(&payload.fecha_compra).bind(payload.euros_invertidos).bind(&payload.activo_ticker).bind(&payload.cuenta_id).execute(&pool).await;

    match result { Ok(_) => StatusCode::CREATED.into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn modificar_transaccion(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertTransaccionDTO>) -> impl IntoResponse {
    let result = sqlx::query("UPDATE transacciones SET fecha_compra = $1::date, euros_invertidos = $2::float8::numeric, activo_ticker = $3, cuenta_id = $4::uuid WHERE id = $5::uuid")
        .bind(&payload.fecha_compra).bind(payload.euros_invertidos).bind(&payload.activo_ticker).bind(&payload.cuenta_id).bind(&id)
        .execute(&pool).await;

    match result { Ok(_) => StatusCode::OK.into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn eliminar_transaccion(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    let result = sqlx::query("DELETE FROM transacciones WHERE id = $1::uuid").bind(&id).execute(&pool).await;
    match result { Ok(_) => StatusCode::OK.into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}