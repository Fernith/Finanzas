use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::liquidez::*;

pub async fn obtener_saldos_actuales(State(pool): State<PgPool>) -> Result<Json<Vec<CuentaLiquidezDTO>>, AppError> {
    // 🚀 MAGIA SQL: Toda la lógica de "buscar último saldo y sumar operaciones posteriores" en 1 sola consulta
    let resultados: Vec<CuentaLiquidezDTO> = sqlx::query_as(
        r#"
        WITH UltimoActualizar AS (
            SELECT cuenta_id, cantidad::float8 as saldo_base, fecha as fecha_base,
                   ROW_NUMBER() OVER(PARTITION BY cuenta_id ORDER BY fecha DESC, created_at DESC) as rn
            FROM saldos_cuentas
            WHERE COALESCE(accion, 'actualizar') = 'actualizar'
        ),
        BaseActualizar AS (
            SELECT cuenta_id, saldo_base, fecha_base FROM UltimoActualizar WHERE rn = 1
        ),
        MovimientosPosteriores AS (
            SELECT sc.cuenta_id,
                   SUM(sc.cantidad)::float8 as variacion_movimientos,
                   MAX(sc.fecha) as ultima_fecha_mov
            FROM saldos_cuentas sc
            LEFT JOIN BaseActualizar b ON sc.cuenta_id = b.cuenta_id
            WHERE sc.accion IN ('agregar', 'quitar')
              AND (b.fecha_base IS NULL OR sc.fecha >= b.fecha_base)
            GROUP BY sc.cuenta_id
        ),
        SaldosActuales AS (
            SELECT c.id as cuenta_id,
                   (COALESCE(b.saldo_base, 0.0) + COALESCE(m.variacion_movimientos, 0.0))::float8 as saldo_inicial,
                   b.fecha_base as fecha_saldo,
                   COALESCE(b.fecha_base, m.ultima_fecha_mov) as fecha_mostrar
            FROM cuentas c
            LEFT JOIN BaseActualizar b ON c.id = b.cuenta_id
            LEFT JOIN MovimientosPosteriores m ON c.id = m.cuenta_id
            WHERE c.activo = true
        ),
        OperacionesPosteriores AS (
            SELECT o.cuenta_id, 
                   SUM(CASE WHEN o.tipo_operacion_id = 'INGRESO' THEN o.cantidad ELSE -o.cantidad END)::float8 as variacion
            FROM operaciones o
            LEFT JOIN SaldosActuales s ON o.cuenta_id = s.cuenta_id
            WHERE o.pendiente = false 
              AND o.tipo_operacion_id IN ('INGRESO', 'GASTO')
              AND (s.fecha_saldo IS NULL OR o.fecha >= s.fecha_saldo)
            GROUP BY o.cuenta_id
        )
        SELECT 
            c.id::text as cuenta_id, c.nombre as nombre, c.color as color, 
            COALESCE(s.saldo_inicial, 0.0)::float8 as ultimo_saldo_manual,
            s.fecha_mostrar::text as fecha_actualizacion,
            (COALESCE(s.saldo_inicial, 0.0) + COALESCE(op.variacion, 0.0))::float8 as saldo_calculado
        FROM cuentas c
        LEFT JOIN SaldosActuales s ON c.id = s.cuenta_id
        LEFT JOIN OperacionesPosteriores op ON c.id = op.cuenta_id
        WHERE c.activo = true
        ORDER BY c.orden ASC, c.nombre ASC
        "#
    ).fetch_all(&pool).await?;

    let dto = resultados.into_iter().map(|r| CuentaLiquidezDTO {
        cuenta_id: r.cuenta_id,
        nombre: r.nombre,
        color: r.color,
        ultimo_saldo_manual: (r.ultimo_saldo_manual * 100.0).round() / 100.0,
        fecha_actualizacion: r.fecha_actualizacion,
        saldo_calculado: (r.saldo_calculado * 100.0).round() / 100.0,
    }).collect();

    Ok(Json(dto)) // El error se maneja solo gracias a AppError
}

pub async fn obtener_historial_cuenta(State(pool): State<PgPool>, Path(cuenta_id): Path<String>) -> Result<Json<Vec<HistorialSaldoDTO>>, AppError> {
    let rows: Vec<HistorialSaldoDTO> = sqlx::query_as(
        r#"SELECT id::text as id, fecha::text as fecha, cantidad::float8 as cantidad, COALESCE(accion, 'actualizar') as accion
           FROM saldos_cuentas WHERE cuenta_id = $1::text::uuid ORDER BY fecha DESC, created_at DESC"#
    )
    .bind(&cuenta_id)
    .fetch_all(&pool)
    .await?;
    let rows_redondeadas = rows.into_iter().map(|mut h| {
        h.cantidad = (h.cantidad * 100.0).round() / 100.0;
        h
    }).collect();
    Ok(Json(rows_redondeadas))
}

pub async fn registrar_saldo(State(pool): State<PgPool>, Json(payload): Json<NuevoSaldoDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query("INSERT INTO saldos_cuentas (cuenta_id, fecha, cantidad, accion) VALUES ($1::text::uuid, $2::text::date, $3::float8, 'actualizar')")
        .bind(&payload.cuenta_id)
        .bind(&payload.fecha)
        .bind(cantidad_redondeada)
        .execute(&pool)
        .await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn mover_dinero(State(pool): State<PgPool>, Json(payload): Json<MoverDineroDTO>) -> Result<impl IntoResponse, AppError> {
    if payload.cuenta_origen_id == payload.cuenta_destino_id {
        return Err(AppError::Internal("La cuenta de origen y destino no pueden ser la misma".to_string()));
    }
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    if cantidad_redondeada <= 0.0 {
        return Err(AppError::Internal("La cantidad a mover debe ser mayor que 0".to_string()));
    }

    let mut tx = pool.begin().await?;

    sqlx::query("INSERT INTO saldos_cuentas (cuenta_id, fecha, cantidad, accion) VALUES ($1::text::uuid, $2::text::date, $3::float8, 'quitar')")
        .bind(&payload.cuenta_origen_id)
        .bind(&payload.fecha)
        .bind(-cantidad_redondeada)
        .execute(&mut *tx)
        .await?;

    sqlx::query("INSERT INTO saldos_cuentas (cuenta_id, fecha, cantidad, accion) VALUES ($1::text::uuid, $2::text::date, $3::float8, 'agregar')")
        .bind(&payload.cuenta_destino_id)
        .bind(&payload.fecha)
        .bind(cantidad_redondeada)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok((StatusCode::CREATED, "OK"))
}