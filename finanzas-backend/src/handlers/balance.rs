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
    let rows = sqlx::query_as!(
        OperacionAnualDTO,
        r#"
        SELECT 
            o.fecha::text as "fecha!", 
            o.cantidad::float as "cantidad!", 
            o.tipo_operacion_id::text as "tipo_operacion_id!", 
            c.nombre as "categoria!",
            c.color as "color_categoria?"
        FROM operaciones o
        JOIN categorias c ON o.categoria_id = c.id
        WHERE EXTRACT(YEAR FROM o.fecha) = $1 AND o.pendiente = false
        ORDER BY o.fecha ASC
        "#,
        filtro.anio as f64
    )
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