use axum::{
    extract::{Query, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use sqlx::PgPool;
use crate::dtos::balance::*;

pub async fn obtener_balance_anual(
    State(pool): State<PgPool>,
    Query(filtro): Query<FiltroAnio>,
) -> impl IntoResponse {
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
    .await;

    match rows {
        Ok(ops) => Json(ops).into_response(),
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()).into_response(),
    }
}