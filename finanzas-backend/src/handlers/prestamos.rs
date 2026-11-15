use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use crate::cron::{obtener_o_crear_categoria_prestamos, procesar_prestamos_pendientes};
use crate::dtos::prestamos::{AmortizarPrestamoDTO, PagoPrestamoDTO, PrestamoDTO, UpsertPrestamoDTO};
use crate::error::AppError;

#[derive(sqlx::FromRow)]
struct PrestamoRow {
    id: String,
    nombre: String,
    cantidad_inicial: f64,
    cantidad_pendiente: f64,
    cuota_periodica: f64,
    periodicidad: String,
    cuenta_id: String,
    cuenta_nombre: String,
    fecha_inicio: String,
    fecha_proximo_pago: String,
    fecha_fin: Option<String>,
    finalizado: bool,
}

#[derive(sqlx::FromRow)]
struct PagoPrestamoRow {
    id: String,
    fecha: String,
    cantidad: f64,
    cuenta_id: String,
    cuenta_nombre: String,
    descripcion: Option<String>,
    es_cuota_prestamo: bool,
}

async fn contar_pagos_restantes<'e, E>(
    executor: E,
    fecha_proximo_pago: &str,
    fecha_fin: &str,
    periodicidad: &str,
) -> Result<i64, sqlx::Error>
where
    E: sqlx::Executor<'e, Database = sqlx::Postgres>,
{
    let n: i64 = sqlx::query_scalar(
        r#"SELECT GREATEST(COUNT(*), 1)::int8
           FROM generate_series(
               $1::date::timestamp,
               GREATEST($2::date, $1::date)::timestamp,
               CASE $3::text
                   WHEN 'DIARIA' THEN INTERVAL '1 day'
                   WHEN 'SEMANAL' THEN INTERVAL '7 days'
                   WHEN 'QUINCENAL' THEN INTERVAL '15 days'
                   WHEN '30_DIAS' THEN INTERVAL '30 days'
                   WHEN 'MENSUAL' THEN INTERVAL '1 month'
                   WHEN 'ANUAL' THEN INTERVAL '1 year'
                   ELSE INTERVAL '1 month'
               END
           )"#
    )
    .bind(fecha_proximo_pago)
    .bind(fecha_fin)
    .bind(periodicidad)
    .fetch_one(executor)
    .await?;

    Ok(n.max(1))
}

pub async fn listar_prestamos(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    procesar_prestamos_pendientes(&pool).await;

    let rows: Vec<PrestamoRow> = sqlx::query_as(
        r#"
        SELECT p.id::text AS id,
               p.nombre AS nombre,
               ROUND(p.cantidad_inicial::numeric, 2)::float8 AS cantidad_inicial,
               ROUND(p.cantidad_pendiente::numeric, 2)::float8 AS cantidad_pendiente,
               ROUND(p.cuota_periodica::numeric, 2)::float8 AS cuota_periodica,
               p.periodicidad::text AS periodicidad,
               p.cuenta_id::text AS cuenta_id,
               c.nombre AS cuenta_nombre,
               p.fecha_inicio::text AS fecha_inicio,
               p.fecha_proximo_pago::text AS fecha_proximo_pago,
               p.fecha_fin::text AS fecha_fin,
               COALESCE(p.finalizado, false) AS finalizado
        FROM prestamos p
        JOIN cuentas c ON p.cuenta_id = c.id
        ORDER BY p.finalizado ASC, p.fecha_proximo_pago ASC, p.nombre ASC
        "#
    )
    .fetch_all(&pool)
    .await?;

    let datos: Vec<PrestamoDTO> = rows
        .into_iter()
        .map(|r| PrestamoDTO {
            id: r.id,
            nombre: r.nombre,
            cantidad_inicial: (r.cantidad_inicial * 100.0).round() / 100.0,
            cantidad_pendiente: (r.cantidad_pendiente * 100.0).round() / 100.0,
            cuota_periodica: (r.cuota_periodica * 100.0).round() / 100.0,
            periodicidad: r.periodicidad,
            cuenta_id: r.cuenta_id,
            cuenta_nombre: r.cuenta_nombre,
            fecha_inicio: r.fecha_inicio,
            fecha_proximo_pago: r.fecha_proximo_pago,
            fecha_fin: r.fecha_fin,
            finalizado: r.finalizado,
        })
        .collect();

    Ok(Json(datos))
}

pub async fn crear_prestamo(
    State(pool): State<PgPool>,
    Json(payload): Json<UpsertPrestamoDTO>,
) -> Result<impl IntoResponse, AppError> {
    let inicial = ((payload.cantidad_inicial * 100.0).round() / 100.0).max(0.01);
    let pendiente = ((payload.cantidad_pendiente * 100.0).round() / 100.0).max(0.0);
    let fecha_fin_limpia = payload
        .fecha_fin
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let cuota_final = if let Some(ff) = fecha_fin_limpia {
        let num_pagos = contar_pagos_restantes(&pool, &payload.fecha_proximo_pago, ff, &payload.periodicidad).await?;
        ((pendiente / (num_pagos as f64)) * 100.0).round() / 100.0
    } else {
        ((payload.cuota_periodica * 100.0).round() / 100.0).max(0.01)
    };

    let finalizado = pendiente <= 0.001 || payload.finalizado.unwrap_or(false);

    sqlx::query(
        r#"INSERT INTO prestamos (
               nombre, cantidad_inicial, cantidad_pendiente, cuota_periodica,
               periodicidad, cuenta_id, fecha_inicio, fecha_proximo_pago, fecha_fin, finalizado
           )
           VALUES (
               $1,
               ROUND($2::float8::numeric, 2),
               ROUND($3::float8::numeric, 2),
               ROUND($4::float8::numeric, 2),
               $5::tipo_periodicidad,
               $6::uuid,
               $7::date,
               $8::date,
               $9::date,
               $10
           )"#
    )
    .bind(&payload.nombre)
    .bind(inicial)
    .bind(if finalizado { 0.0 } else { pendiente })
    .bind(cuota_final)
    .bind(&payload.periodicidad)
    .bind(&payload.cuenta_id)
    .bind(&payload.fecha_inicio)
    .bind(&payload.fecha_proximo_pago)
    .bind(fecha_fin_limpia)
    .bind(finalizado)
    .execute(&pool)
    .await?;

    procesar_prestamos_pendientes(&pool).await;

    Ok(StatusCode::CREATED)
}

pub async fn modificar_prestamo(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<UpsertPrestamoDTO>,
) -> Result<impl IntoResponse, AppError> {
    let inicial = ((payload.cantidad_inicial * 100.0).round() / 100.0).max(0.01);
    let pendiente = ((payload.cantidad_pendiente * 100.0).round() / 100.0).max(0.0);
    let fecha_fin_limpia = payload
        .fecha_fin
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let cuota_input = (payload.cuota_periodica * 100.0).round() / 100.0;
    let cuota_final = if cuota_input > 0.0 {
        cuota_input
    } else if let Some(ff) = fecha_fin_limpia {
        let num_pagos = contar_pagos_restantes(&pool, &payload.fecha_proximo_pago, ff, &payload.periodicidad).await?;
        ((pendiente / (num_pagos as f64)) * 100.0).round() / 100.0
    } else {
        0.01
    };

    let finalizado = pendiente <= 0.001 || payload.finalizado.unwrap_or(false);

    sqlx::query(
        r#"UPDATE prestamos
           SET nombre = $1,
               cantidad_inicial = ROUND($2::float8::numeric, 2),
               cantidad_pendiente = ROUND($3::float8::numeric, 2),
               cuota_periodica = ROUND($4::float8::numeric, 2),
               periodicidad = $5::tipo_periodicidad,
               cuenta_id = $6::uuid,
               fecha_inicio = $7::date,
               fecha_proximo_pago = $8::date,
               fecha_fin = $9::date,
               finalizado = $10
           WHERE id = $11::uuid"#
    )
    .bind(&payload.nombre)
    .bind(inicial)
    .bind(if finalizado { 0.0 } else { pendiente })
    .bind(cuota_final)
    .bind(&payload.periodicidad)
    .bind(&payload.cuenta_id)
    .bind(&payload.fecha_inicio)
    .bind(&payload.fecha_proximo_pago)
    .bind(fecha_fin_limpia)
    .bind(finalizado)
    .bind(&id)
    .execute(&pool)
    .await?;

    procesar_prestamos_pendientes(&pool).await;

    Ok(StatusCode::OK)
}

pub async fn eliminar_prestamo(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM prestamos WHERE id = $1::uuid")
        .bind(&id)
        .execute(&pool)
        .await?;
    Ok(StatusCode::OK)
}

pub async fn obtener_historial_prestamo(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<PagoPrestamoRow> = sqlx::query_as(
        r#"
        SELECT o.id::text AS id,
               o.fecha::text AS fecha,
               ROUND(o.cantidad::numeric, 2)::float8 AS cantidad,
               o.cuenta_id::text AS cuenta_id,
               cu.nombre AS cuenta_nombre,
               o.descripcion AS descripcion,
               COALESCE(o.es_cuota_prestamo, false) AS es_cuota_prestamo
        FROM operaciones o
        JOIN cuentas cu ON o.cuenta_id = cu.id
        WHERE o.prestamo_id = $1::uuid
        ORDER BY o.fecha DESC, o.id DESC
        "#
    )
    .bind(&id)
    .fetch_all(&pool)
    .await?;

    let historial: Vec<PagoPrestamoDTO> = rows
        .into_iter()
        .map(|r| PagoPrestamoDTO {
            id: r.id,
            fecha: r.fecha,
            cantidad: (r.cantidad * 100.0).round() / 100.0,
            cuenta_id: r.cuenta_id,
            cuenta_nombre: r.cuenta_nombre,
            descripcion: r.descripcion,
            es_cuota_prestamo: r.es_cuota_prestamo,
        })
        .collect();

    Ok(Json(historial))
}

pub async fn amortizar_prestamo(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<AmortizarPrestamoDTO>,
) -> Result<impl IntoResponse, AppError> {
    let cantidad_pago = (payload.cantidad * 100.0).round() / 100.0;
    if cantidad_pago <= 0.0 {
        return Err(AppError::Internal("La cantidad a pagar debe ser mayor que 0".to_string()));
    }

    let cat_id = obtener_o_crear_categoria_prestamos(&pool).await?;

    let mut tx = pool.begin().await?;

    let prestamo_opt: Option<(String, f64, f64, String, String, Option<String>, bool)> = sqlx::query_as(
        r#"SELECT nombre,
                  ROUND(cantidad_pendiente::numeric, 2)::float8,
                  ROUND(cuota_periodica::numeric, 2)::float8,
                  periodicidad::text,
                  fecha_proximo_pago::text,
                  fecha_fin::text,
                  COALESCE(finalizado, false)
           FROM prestamos
           WHERE id = $1::uuid
           FOR UPDATE"#
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await?;

    let Some((nombre, pendiente_actual, cuota_actual, periodicidad, fecha_proximo_pago, fecha_fin, finalizado_actual)) = prestamo_opt else {
        return Err(AppError::Internal("El préstamo seleccionado no existe".to_string()));
    };

    if finalizado_actual || pendiente_actual <= 0.0 {
        return Err(AppError::Internal("Este préstamo ya está finalizado".to_string()));
    }

    if cantidad_pago > pendiente_actual + 0.001 {
        return Err(AppError::Internal("La cantidad supera el dinero pendiente del préstamo".to_string()));
    }

    let importe_efectivo = cantidad_pago.min(pendiente_actual);
    let nueva_pendiente_raw = (((pendiente_actual - importe_efectivo) * 100.0).round() / 100.0).max(0.0);
    let nuevo_finalizado = nueva_pendiente_raw <= 0.001;
    let nueva_pendiente = if nuevo_finalizado { 0.0 } else { nueva_pendiente_raw };

    let nueva_cuota = if !nuevo_finalizado {
        if let Some(ref ff) = fecha_fin {
            let num_pagos = contar_pagos_restantes(&mut *tx, &fecha_proximo_pago, ff, &periodicidad).await?;
            ((nueva_pendiente / (num_pagos as f64)) * 100.0).round() / 100.0
        } else {
            cuota_actual
        }
    } else {
        cuota_actual
    };

    let desc = format!("Reducción préstamo {}", nombre);

    sqlx::query(
        r#"INSERT INTO operaciones (
               tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id,
               descripcion, pendiente, prestamo_id, es_cuota_prestamo
           )
           VALUES (
               'GASTO'::tipo_operacion_enum,
               $1::date,
               ROUND($2::float8::numeric, 2),
               $3::uuid,
               $4::uuid,
               $5,
               false,
               $6::uuid,
               false
           )"#
    )
    .bind(&payload.fecha)
    .bind(importe_efectivo)
    .bind(&cat_id)
    .bind(&payload.cuenta_id)
    .bind(&desc)
    .bind(&id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        r#"UPDATE prestamos
           SET cantidad_pendiente = ROUND($2::float8::numeric, 2),
               cuota_periodica = ROUND($3::float8::numeric, 2),
               finalizado = $4
           WHERE id = $1::uuid"#
    )
    .bind(&id)
    .bind(nueva_pendiente)
    .bind(nueva_cuota)
    .bind(nuevo_finalizado)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(StatusCode::CREATED)
}
