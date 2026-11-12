use axum::{
    extract::{Path, State, Query},
    Json, response::IntoResponse,
    http::{StatusCode, HeaderMap},
};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::operaciones::*;

#[derive(sqlx::FromRow)]
struct IngresoRow {
    id: String,
    fecha: String,
    cantidad: f64,
    categoria: String,
    color_categoria: Option<String>,
    color_grupo: Option<String>,
    orden_categoria: i32,
    cuenta: String,
    descripcion: Option<String>,
    pendiente: bool,
    campo_extra_ingreso: Option<String>,
    total_filas: i64,
}

pub async fn obtener_ingresos(
    State(pool): State<PgPool>,
    Query(filtro): Query<FiltroFecha>,
) -> Result<impl IntoResponse, AppError> {
    let search_term = filtro.buscar.unwrap_or_default();
    let limit = filtro.limit.unwrap_or(2000); 
    let offset = filtro.offset.unwrap_or(0);

    let rows: Vec<IngresoRow> = sqlx::query_as(
        r#"
        SELECT 
            o.id::text AS id,
            o.fecha::text AS fecha, 
            ROUND(o.cantidad::numeric, 2)::float8 AS cantidad,
            c.nombre AS categoria,
            c.color AS color_categoria,
            g.color AS color_grupo,
            COALESCE(c.orden, 0)::int4 AS orden_categoria,
            cu.nombre AS cuenta,
            o.descripcion AS descripcion,
            COALESCE(o.pendiente, false)::bool AS pendiente,
            o.campo_extra_ingreso AS campo_extra_ingreso,
            COUNT(*) OVER() AS total_filas
        FROM operaciones o
        JOIN categorias c ON o.categoria_id = c.id
        LEFT JOIN grupos g ON c.grupo_id = g.id
        JOIN cuentas cu ON o.cuenta_id = cu.id
        WHERE o.tipo_operacion_id = 'INGRESO'::tipo_operacion_enum
          AND (
              COALESCE(o.pendiente, false) = false
              OR EXISTS (
                  SELECT 1 FROM ajustes a
                  WHERE a.clave = 'pendientes' AND LOWER(TRIM(a.valor)) = 'true'
              )
          )
          AND (
              ($3::text != '' AND (
                  o.descripcion ILIKE '%' || $3::text || '%' OR 
                  c.nombre ILIKE '%' || $3::text || '%' OR 
                  cu.nombre ILIKE '%' || $3::text || '%'
              ))
              OR 
              ($3::text = '' AND ($1::float8 = 0 OR EXTRACT(MONTH FROM o.fecha) = $1::float8) AND EXTRACT(YEAR FROM o.fecha) = $2::float8)
          )
        ORDER BY o.fecha DESC
        LIMIT $4::int8 OFFSET $5::int8
        "#
    )
    .bind(filtro.mes as f64)
    .bind(filtro.anio as f64)
    .bind(&search_term)
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await?;

    let total_count = rows.first().map(|r| r.total_filas).unwrap_or(0);
    let ingresos: Vec<IngresoDTO> = rows.into_iter().map(|r| IngresoDTO {
        id: r.id,
        fecha: r.fecha,
        cantidad: (r.cantidad * 100.0).round() / 100.0,
        categoria: r.categoria,
        color_categoria: r.color_categoria,
        color_grupo: r.color_grupo,
        orden_categoria: r.orden_categoria,
        cuenta: r.cuenta,
        descripcion: r.descripcion,
        pendiente: r.pendiente,
        campo_extra_ingreso: r.campo_extra_ingreso,
    }).collect();

    let mut headers = HeaderMap::new();
    headers.insert("x-total-count", axum::http::HeaderValue::from_str(&total_count.to_string())?);
    Ok((headers, Json(ingresos)))
}

pub async fn obtener_categorias_ingresos(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as!(
        MaestroDTO,
        r#"SELECT c.id::text as "id!", c.nombre, c.color as "color", c.activo FROM categorias c WHERE c.tipo_operacion_id = 'INGRESO'::tipo_operacion_enum ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await?;
    Ok(Json(rows))
}

pub async fn obtener_cuentas_ingresos(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as!(
        MaestroDTO,
        r#"SELECT c.id::text as "id!", c.nombre, c.color, c.activo FROM cuentas c JOIN cuentas_tipos_operacion ct ON c.id = ct.cuenta_id WHERE ct.tipo_operacion_id = 'INGRESO'::tipo_operacion_enum ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await?;
    Ok(Json(rows))
}

pub async fn crear_ingreso(State(pool): State<PgPool>, Json(payload): Json<NuevoIngresoDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query(r#"INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente, campo_extra_ingreso) 
        VALUES ('INGRESO'::tipo_operacion_enum, $1::text::date, ROUND($2::float8::numeric, 2), $3::text::uuid, $4::text::uuid, $5, $6::boolean, $7)"#)
        .bind(&payload.fecha).bind(cantidad_redondeada).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.descripcion).bind(payload.pendiente).bind(payload.campo_extra_ingreso)
        .execute(&pool).await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn actualizar_ingreso(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<NuevoIngresoDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query(r#"UPDATE operaciones SET fecha = $1::text::date, cantidad = ROUND($2::float8::numeric, 2), categoria_id = $3::text::uuid, cuenta_id = $4::text::uuid, descripcion = $5, pendiente = $6::boolean, campo_extra_ingreso = $7
        WHERE id = $8::text::uuid AND tipo_operacion_id = 'INGRESO'::tipo_operacion_enum"#)
        .bind(&payload.fecha).bind(cantidad_redondeada).bind(&payload.categoria_id).bind(&payload.cuenta_id).bind(&payload.descripcion).bind(payload.pendiente).bind(payload.campo_extra_ingreso).bind(&id)
        .execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn eliminar_ingreso(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query!("DELETE FROM operaciones WHERE id = $1::text::uuid AND tipo_operacion_id = 'INGRESO'::tipo_operacion_enum", id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn completar_operacion(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    // Añadido ::text::uuid para asegurar la conversión correcta
    sqlx::query("UPDATE operaciones SET pendiente = false WHERE id = $1::text::uuid")
        .bind(&id)
        .execute(&pool)
        .await?;
        
    Ok((StatusCode::OK, "OK"))
}