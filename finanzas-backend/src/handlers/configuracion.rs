use axum::{extract::State, Json, response::IntoResponse, http::StatusCode};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ConfiguracionDTO {
    pub usar_pendientes: bool,
}

pub async fn obtener_configuracion(State(pool): State<PgPool>) -> impl IntoResponse {
    let config_opt: Option<(bool,)> = sqlx::query_as("SELECT usar_pendientes FROM configuracion WHERE id = 1")
        .fetch_optional(&pool).await.unwrap_or(None);
        
    let usar_pendientes = match config_opt {
        Some((val,)) => val,
        None => false,
    };
    
    Json(ConfiguracionDTO { usar_pendientes })
}

pub async fn actualizar_configuracion(State(pool): State<PgPool>, Json(payload): Json<ConfiguracionDTO>) -> impl IntoResponse {
    sqlx::query("UPDATE configuracion SET usar_pendientes = $1 WHERE id = 1")
        .bind(payload.usar_pendientes)
        .execute(&pool).await.unwrap();
    StatusCode::OK
}