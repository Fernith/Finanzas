use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::liquidez::*;

pub async fn obtener_saldos_actuales(State(pool): State<PgPool>) -> Result<Json<Vec<CuentaLiquidezDTO>>, AppError> {
    // 🚀 MAGIA SQL: Toda la lógica de "buscar último saldo y sumar operaciones posteriores" en 1 sola consulta
    let resultados = sqlx::query!(
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
        SELECT 
            c.id::text as "cuenta_id!", c.nombre as "nombre!", c.color as "color!", 
            COALESCE(s.saldo_inicial, 0.0)::float as "ultimo_saldo_manual!",
            s.fecha_saldo::text as "fecha_actualizacion",
            (COALESCE(s.saldo_inicial, 0.0) + COALESCE(op.variacion, 0.0))::float as "saldo_calculado!"
        FROM cuentas c
        LEFT JOIN SaldosActuales s ON c.id = s.cuenta_id
        LEFT JOIN OperacionesPosteriores op ON c.id = op.cuenta_id
        WHERE c.activo = true
        ORDER BY c.nombre
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
    let rows = sqlx::query_as!(
        HistorialSaldoDTO,
        r#"SELECT id::text as "id!", fecha::text as "fecha!", cantidad::float as "cantidad!" 
           FROM saldos_cuentas WHERE cuenta_id = $1::text::uuid ORDER BY fecha DESC, created_at DESC"#,
        cuenta_id
    ).fetch_all(&pool).await?;
    let rows_redondeadas = rows.into_iter().map(|mut h| {
        h.cantidad = (h.cantidad * 100.0).round() / 100.0;
        h
    }).collect();
    Ok(Json(rows_redondeadas))
}

pub async fn registrar_saldo(State(pool): State<PgPool>, Json(payload): Json<NuevoSaldoDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query!("INSERT INTO saldos_cuentas (cuenta_id, fecha, cantidad) VALUES ($1::text::uuid, $2::text::date, $3::float)",
        payload.cuenta_id, payload.fecha, cantidad_redondeada
    ).execute(&pool).await?;
    Ok((StatusCode::CREATED, "OK"))
}