use serde::{Deserialize, Serialize};

// --- CATEGORIAS ---
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct CategoriaItemDTO {
    pub id: String,
    pub nombre: String,
    pub tipo_operacion_id: String,
    pub grupo_id: Option<String>,
    pub grupo_nombre: Option<String>,
    pub color: Option<String>,
    pub color_grupo: Option<String>,
    pub activo: bool,
    pub orden: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct UpsertCategoriaDTO {
    pub nombre: String,
    pub tipo_operacion_id: String,
    pub grupo_id: Option<String>,
    pub orden: Option<i32>,
    pub color: Option<String>,
}

// --- CUENTAS ---
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct CuentaItemDTO {
    pub id: String,
    pub nombre: String,
    pub color: Option<String>, // Opcional por seguridad
    pub activo: bool,
    pub orden: i32,
    pub tipos_operacion: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct UpsertCuentaDTO {
    pub nombre: String,
    pub color: Option<String>,
    pub orden: Option<i32>,
    pub tipos_operacion: Vec<String>,
}

// --- GRUPOS ---
#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct GrupoDTO {
    pub id: String,
    pub nombre: String,
    pub color: Option<String>,
    pub activo: bool,
    pub orden: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct UpsertGrupoDTO {
    pub nombre: String,
    pub color: Option<String>,
    pub orden: Option<i32>,
}

// --- AJUSTES ---
#[derive(Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "snake_case")]
pub struct AjusteDTO {
    pub clave: String,
    pub valor: String,
}

// --- COMUNES ---
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ReordenarDTO {
    pub id: String,
    pub orden: i32,
}