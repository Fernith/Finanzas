use axum::{
    extract::{Query, State},
    Json, response::IntoResponse,
};
use sqlx::PgPool;
use crate::error::AppError;
use crate::dtos::balance::*;

pub async fn obtener_balance_anual(
    State(pool): State<PgPool>,
    Query(filtro): Query<FiltroAnio>,
) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as::<_, OperacionAnualDTO>(
        r#"
        SELECT 
            o.fecha::text AS fecha, 
            o.cantidad::float8 AS cantidad, 
            o.tipo_operacion_id::text AS tipo_operacion_id, 
            c.nombre AS categoria,
            c.color AS color_categoria,
            g.color AS color_grupo,
            COALESCE(c.orden, 0)::int4 AS orden_categoria
        FROM operaciones o
        JOIN categorias c ON o.categoria_id = c.id
        LEFT JOIN grupos g ON c.grupo_id = g.id
        WHERE EXTRACT(YEAR FROM o.fecha) = $1 AND o.pendiente = false
        ORDER BY c.orden ASC, c.nombre ASC, o.fecha ASC
        "#
    )
    .bind(filtro.anio as f64)
    .fetch_all(&pool)
    .await?;

    let ops: Vec<OperacionAnualDTO> = rows
        .into_iter()
        .map(|mut op| {
            op.cantidad = (op.cantidad * 100.0).round() / 100.0;
            op
        })
        .collect();

    Ok(Json(ops))
}