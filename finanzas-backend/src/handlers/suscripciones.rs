use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::suscripciones::{SuscripcionDTO, UpsertSuscripcionDTO};

pub async fn listar_suscripciones(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query!(
        r#"
        SELECT s.id::text as "id!", s.nombre, s.cantidad::float as "cantidad!", 
               s.cuenta_id::text as "cuenta_id!", c.nombre as "cuenta_nombre!", 
               s.fecha_inicio::text as "fecha_inicio!", s.fecha_proxima_renovacion::text as "fecha_proxima_renovacion!", 
               s.periodicidad::text as "periodicidad!", s.activo 
        FROM suscripciones s
        JOIN cuentas c ON s.cuenta_id = c.id
        ORDER BY s.activo DESC, s.fecha_proxima_renovacion ASC
        "#
    ).fetch_all(&pool).await?;

    let datos: Vec<SuscripcionDTO> = rows.into_iter().map(|r| SuscripcionDTO {
        id: r.id,
        nombre: r.nombre,
        cantidad: (r.cantidad * 100.0).round() / 100.0,
        cuenta_id: r.cuenta_id,
        cuenta_nombre: r.cuenta_nombre,
        fecha_inicio: r.fecha_inicio,
        fecha_proxima_renovacion: r.fecha_proxima_renovacion,
        periodicidad: r.periodicidad,
        activo: r.activo,
    }).collect();
    Ok(Json(datos))
}

pub async fn crear_suscripcion(State(pool): State<PgPool>, Json(payload): Json<UpsertSuscripcionDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query(
        "INSERT INTO suscripciones (nombre, cantidad, cuenta_id, fecha_inicio, fecha_proxima_renovacion, periodicidad, activo) 
         VALUES ($1, ROUND($2::float8::numeric, 2), $3::uuid, $4::date, $5::date, $6::tipo_periodicidad, $7)"
    )
    .bind(&payload.nombre).bind(cantidad_redondeada).bind(&payload.cuenta_id).bind(&payload.fecha_inicio)
    .bind(&payload.fecha_proxima_renovacion).bind(&payload.periodicidad).bind(payload.activo)
    .execute(&pool).await?;

    Ok(StatusCode::CREATED)
}

pub async fn modificar_suscripcion(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertSuscripcionDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query(
        "UPDATE suscripciones SET nombre=$1, cantidad=ROUND($2::float8::numeric, 2), cuenta_id=$3::uuid, fecha_inicio=$4::date, fecha_proxima_renovacion=$5::date, periodicidad=$6::tipo_periodicidad, activo=$7 WHERE id=$8::uuid"
    )
    .bind(&payload.nombre).bind(cantidad_redondeada).bind(&payload.cuenta_id).bind(&payload.fecha_inicio)
    .bind(&payload.fecha_proxima_renovacion).bind(&payload.periodicidad).bind(payload.activo).bind(&id)
    .execute(&pool).await?;

    Ok(StatusCode::OK)
}

pub async fn eliminar_suscripcion(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM suscripciones WHERE id=$1::uuid").bind(&id).execute(&pool).await?;
    Ok(StatusCode::OK)
}