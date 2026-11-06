use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub enum AppError {
    Database(sqlx::Error),
    Internal(String),
}

// Permite que un sqlx::Error se convierta automáticamente en nuestro AppError (usando el operador `?`)
impl From<sqlx::Error> for AppError {
    fn from(inner: sqlx::Error) -> Self {
        AppError::Database(inner)
    }
}

impl From<axum::http::header::InvalidHeaderValue> for AppError {
    fn from(inner: axum::http::header::InvalidHeaderValue) -> Self {
        AppError::Internal(inner.to_string())
    }
}

// Le decimos a Axum cómo convertir este error en una respuesta HTTP JSON
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(err) => {
                println!("❌ ERROR DE BBDD: {:?}", err);
                (StatusCode::INTERNAL_SERVER_ERROR, "Error interno en la base de datos".to_string())
            }
            AppError::Internal(msg) => {
                println!("❌ ERROR INTERNO: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
        };

        let body = Json(json!({ "error": error_message }));
        (status, body).into_response()
    }
}