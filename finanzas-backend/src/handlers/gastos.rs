use axum::{
    extract::{Path, State, Query},
    Json, response::IntoResponse,
    http::{StatusCode, HeaderMap},
};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::operaciones::*;

pub async fn obtener_gastos(
    State(pool): State<PgPool>,
    Query(filtro): Query<FiltroFecha>,
) -> Result<impl IntoResponse, AppError> {
    let search_term = filtro.buscar.unwrap_or_default();
    let limit = filtro.limit.unwrap_or(2000); 
    let offset = filtro.offset.unwrap_or(0);

    let rows = sqlx::query!(
        r#"
        SELECT 
            o.id::text as "id!",
            o.fecha::text as "fecha!", 
            o.cantidad::float as "cantidad!",
            c.nombre as "categoria!",
            c.color as "color_categoria?",
            cu.nombre as "cuenta!",
            o.descripcion,
            COALESCE(o.pendiente, false)::bool as "pendiente!",
            COUNT(*) OVER() as "total_filas!"
        FROM operaciones o
        JOIN categorias c ON o.categoria_id = c.id
        JOIN cuentas cu ON o.cuenta_id = cu.id
        WHERE o.tipo_operacion_id = 'GASTO'::tipo_operacion_enum
          AND (
              ($3::text != '' AND (
                  o.descripcion ILIKE '%' || $3::text || '%' OR 
                  c.nombre ILIKE '%' || $3::text || '%' OR 
                  cu.nombre ILIKE '%' || $3::text || '%'
              ))
              OR 
              ($3::text = '' AND ($1::float = 0 OR EXTRACT(MONTH FROM o.fecha) = $1::float) AND EXTRACT(YEAR FROM o.fecha) = $2::float)
          )
        ORDER BY o.fecha DESC
        LIMIT $4 OFFSET $5
        "#,
        filtro.mes as f64, filtro.anio as f64, search_term, limit, offset
    ).fetch_all(&pool).await?;

    let total_count = rows.first().map(|r| r.total_filas).unwrap_or(0);
    let gastos: Vec<GastoDTO> = rows.into_iter().map(|r| GastoDTO {
        id: r.id, fecha: r.fecha, cantidad: r.cantidad, categoria: r.categoria, color_categoria: r.color_categoria, cuenta: r.cuenta, descripcion: r.descripcion, pendiente: r.pendiente
    }).collect();

    let mut headers = HeaderMap::new();
    headers.insert("x-total-count", axum::http::HeaderValue::from_str(&total_count.to_string()).unwrap());
    Ok((headers, Json(gastos)))
}

pub async fn obtener_categorias_gastos(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows = sqlx::query_as!(
        MaestroDTO,
        r#"SELECT c.id::text as "id!", c.nombre, c.color as "color", c.activo FROM categorias c  WHERE c.tipo_operacion_id = 'GASTO'::tipo_operacion_enum ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await;
    match rows { Ok(cats) => Json(cats).into_response(), Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response() }
}

pub async fn obtener_cuentas_gastos(State(pool): State<PgPool>) -> impl IntoResponse {
    let rows = sqlx::query_as!(
        MaestroDTO,
        r#"SELECT c.id::text as "id!", c.nombre, c.color, c.activo FROM cuentas c JOIN cuentas_tipos_operacion ct ON c.id = ct.cuenta_id WHERE ct.tipo_operacion_id = 'GASTO'::tipo_operacion_enum ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await;
    match rows { Ok(cuentas) => Json(cuentas).into_response(), Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() }
}

pub async fn crear_gasto(State(pool): State<PgPool>, Json(payload): Json<NuevoGastoDTO>) -> impl IntoResponse {
    let result = sqlx::query(r#"INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente) VALUES ('GASTO'::tipo_operacion_enum, $1::text::date, $2::float8::numeric, $3::text::uuid, $4::text::uuid, $5, $6::boolean)"#).bind(&payload.fecha).bind(payload.cantidad).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.descripcion).bind(payload.pendiente).execute(&pool).await;
    match result { Ok(_) => (StatusCode::CREATED, "OK").into_response(), Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response() }
}

pub async fn actualizar_gasto(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<NuevoGastoDTO>) -> impl IntoResponse {
    let result = sqlx::query(r#"UPDATE operaciones SET fecha = $1::text::date, cantidad = $2::float8::numeric, categoria_id = $3::text::uuid, cuenta_id = $4::text::uuid, descripcion = $5, pendiente = $6::boolean WHERE id = $7::text::uuid AND tipo_operacion_id = 'GASTO'::tipo_operacion_enum"#).bind(&payload.fecha).bind(payload.cantidad).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.descripcion).bind(payload.pendiente).bind(&id).execute(&pool).await;
    match result { Ok(_) => (StatusCode::OK, "OK").into_response(), Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response() }
}

pub async fn eliminar_gasto(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    let result = sqlx::query!("DELETE FROM operaciones WHERE id = $1::text::uuid AND tipo_operacion_id = 'GASTO'::tipo_operacion_enum", id).execute(&pool).await;
    match result { Ok(_) => (StatusCode::OK, "OK").into_response(), Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response() }
}

pub async fn completar_operacion(State(pool): State<PgPool>, Path(id): Path<String>) -> impl IntoResponse {
    // Añadido ::text::uuid para asegurar la conversión correcta
    let result = sqlx::query("UPDATE operaciones SET pendiente = false WHERE id = $1::text::uuid")
        .bind(&id)
        .execute(&pool)
        .await;
        
    match result { 
        Ok(_) => (StatusCode::OK, "OK").into_response(), 
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response() 
    }
}