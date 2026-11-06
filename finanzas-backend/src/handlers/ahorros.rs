use axum::{extract::{Path, State}, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::ahorros::*;

// --- 1. RESUMEN GLOBAL ---
pub async fn obtener_resumen(State(pool): State<PgPool>) -> Result<Json<ResumenAhorrosDTO>, AppError> {
    let dinero_invertido: f64 = sqlx::query_scalar(
        "SELECT COALESCE(ROUND(SUM(euros_invertidos)::numeric, 2), 0)::float8 FROM transacciones"
    ).fetch_one(&pool).await?;

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
    ).fetch_one(&pool).await?;

    Ok(Json(ResumenAhorrosDTO {
        dinero_liquido: (dinero_liquido * 100.0).round() / 100.0,
        dinero_invertido: (dinero_invertido * 100.0).round() / 100.0,
    }))
}

// --- 2. GESTIÓN DE METAS ---
pub async fn listar_metas(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    // Ya no ordenamos por nombre en el SQL, lo haremos en Rust por porcentaje
    let metas_db: Vec<(String, String, f64, String)> = sqlx::query_as(
        "SELECT id::text, nombre, ROUND(objetivo::numeric, 2)::float8, color FROM metas_ahorro"
    ).fetch_all(&pool).await?;
    
    let mut resultado = Vec::new();

    for (id, nombre, objetivo, color) in metas_db {
        let movs: Vec<(String, String, f64)> = sqlx::query_as(
            "SELECT id::text, fecha::text, ROUND(cantidad::numeric, 2)::float8 FROM movimientos_metas WHERE meta_id = $1::uuid ORDER BY fecha DESC"
        )
        .bind(&id)
        .fetch_all(&pool).await?;
        
        let mut ahorrado = 0.0;
        let mut movimientos_dto = Vec::new();
        for (mov_id, fecha, cantidad) in movs {
            let cantidad_redondeada = (cantidad * 100.0).round() / 100.0;
            ahorrado = ((ahorrado + cantidad_redondeada) * 100.0).round() / 100.0;
            movimientos_dto.push(MovimientoMetaDTO { id: mov_id, fecha, cantidad: cantidad_redondeada });
        }

        let objetivo_redondeado = (objetivo * 100.0).round() / 100.0;
        resultado.push(MetaAhorroDTO { id, nombre, objetivo: objetivo_redondeado, color, ahorrado, movimientos: movimientos_dto });
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

    Ok(Json(resultado))
}

pub async fn crear_meta(State(pool): State<PgPool>, Json(payload): Json<UpsertMetaDTO>) -> Result<impl IntoResponse, AppError> {
    let objetivo_redondeado = (payload.objetivo * 100.0).round() / 100.0;
    sqlx::query("INSERT INTO metas_ahorro (nombre, objetivo, color) VALUES ($1, ROUND($2::float8::numeric, 2), $3)")
        .bind(&payload.nombre).bind(objetivo_redondeado).bind(&payload.color).execute(&pool).await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn modificar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertMetaDTO>) -> Result<impl IntoResponse, AppError> {
    let objetivo_redondeado = (payload.objetivo * 100.0).round() / 100.0;
    sqlx::query("UPDATE metas_ahorro SET nombre = $1, objetivo = ROUND($2::float8::numeric, 2), color = $3 WHERE id = $4::uuid")
        .bind(&payload.nombre).bind(objetivo_redondeado).bind(&payload.color).bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn eliminar_meta(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM metas_ahorro WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn agregar_movimiento_meta(State(pool): State<PgPool>, Path(meta_id): Path<String>, Json(payload): Json<NuevoMovimientoMetaDTO>) -> Result<impl IntoResponse, AppError> {
    let cantidad_redondeada = (payload.cantidad * 100.0).round() / 100.0;
    sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, ROUND($3::float8::numeric, 2))")
        .bind(&meta_id).bind(&payload.fecha).bind(cantidad_redondeada).execute(&pool).await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn opciones_finalizar(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let categorias: Vec<MaestroDTO> = sqlx::query_as("SELECT id::text, nombre FROM categorias WHERE tipo_operacion_id = 'GASTO' AND activo = true ORDER BY nombre")
        .fetch_all(&pool).await?;
    let cuentas: Vec<MaestroDTO> = sqlx::query_as("SELECT id::text, nombre FROM cuentas WHERE activo = true ORDER BY nombre")
        .fetch_all(&pool).await?;
    Ok(Json(OpcionesFinalizarDTO { categorias, cuentas }))
}

pub async fn finalizar_meta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<FinalizarMetaDTO>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    let meta_res: Option<(String,)> = sqlx::query_as("SELECT nombre FROM metas_ahorro WHERE id = $1::uuid")
        .bind(&id)
        .fetch_optional(&mut *tx)
        .await?;

    if let Some((nombre_meta,)) = meta_res {
        let total_ahorrado: f64 = sqlx::query_scalar("SELECT COALESCE(ROUND(SUM(cantidad)::numeric, 2), 0)::float8 FROM movimientos_metas WHERE meta_id = $1::uuid")
            .bind(&id)
            .fetch_one(&mut *tx)
            .await?;
        let total_redondeado = (total_ahorrado * 100.0).round() / 100.0;

        if total_redondeado > 0.0 {
            let desc = format!("Finalización de la meta {}", nombre_meta);
            sqlx::query("INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente) VALUES ('GASTO'::tipo_operacion_enum, $1::date, ROUND($2::float8::numeric, 2), $3::uuid, $4::uuid, $5, false)")
                .bind(&payload.fecha)
                .bind(total_redondeado)
                .bind(&payload.categoria_id)
                .bind(&payload.cuenta_id)
                .bind(&desc)
                .execute(&mut *tx)
                .await?;
            sqlx::query("INSERT INTO movimientos_metas (meta_id, fecha, cantidad) VALUES ($1::uuid, $2::date, ROUND($3::float8::numeric, 2))")
                .bind(&id)
                .bind(&payload.fecha)
                .bind(-total_redondeado)
                .execute(&mut *tx)
                .await?;
        }
    }
    tx.commit().await?;
    Ok(StatusCode::OK)
}