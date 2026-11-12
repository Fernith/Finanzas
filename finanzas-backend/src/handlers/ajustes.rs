use axum::{
    extract::{Path, State},
    Json, response::IntoResponse,
    http::StatusCode,
};
use sqlx::{PgPool, Row};
use crate::error::AppError;
use crate::dtos::ajustes::*;

// --- CATEGORIAS ---
pub async fn listar_categorias(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<CategoriaItemDTO> = sqlx::query_as(
        r#"SELECT 
            c.id::text as id, 
            c.nombre as nombre, 
            c.tipo_operacion_id::text as tipo_operacion_id,
            c.grupo_id::text as grupo_id,
            g.nombre as grupo_nombre,
            c.color as color, 
            g.color as color_grupo,
            COALESCE(c.activo, true) as activo, 
            COALESCE(c.orden, 0) as orden 
           FROM categorias c
           LEFT JOIN grupos g ON c.grupo_id = g.id
           ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await?;

    Ok(Json(rows))
}

pub async fn crear_categoria(State(pool): State<PgPool>, Json(payload): Json<UpsertCategoriaDTO>) -> Result<impl IntoResponse, AppError> {
    let max_orden_opt: Option<i32> = sqlx::query_scalar("SELECT MAX(orden) FROM categorias WHERE tipo_operacion_id = $1::tipo_operacion_enum")
        .bind(&payload.tipo_operacion_id).fetch_one(&pool).await?;
        
    let max_orden = max_orden_opt.unwrap_or(0);
    let orden_final = payload.orden.unwrap_or(max_orden + 1);
    let grupo_id = payload.grupo_id.as_deref().filter(|s| !s.trim().is_empty());

    sqlx::query("INSERT INTO categorias (nombre, tipo_operacion_id, grupo_id, activo, orden, color) VALUES ($1, $2::tipo_operacion_enum, $3::uuid, true, $4, $5)")
        .bind(&payload.nombre)
        .bind(&payload.tipo_operacion_id)
        .bind(grupo_id)
        .bind(orden_final)
        .bind(&payload.color)
        .execute(&pool).await?;

    Ok((StatusCode::CREATED, "OK"))
}

pub async fn modificar_categoria(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertCategoriaDTO>) -> Result<impl IntoResponse, AppError> {
    let grupo_id = payload.grupo_id.as_deref().filter(|s| !s.trim().is_empty());

    sqlx::query("UPDATE categorias SET nombre = $1, tipo_operacion_id = $2::tipo_operacion_enum, grupo_id = $3::uuid, color = COALESCE($4, color) WHERE id = $5::uuid")
        .bind(&payload.nombre)
        .bind(&payload.tipo_operacion_id)
        .bind(grupo_id)
        .bind(&payload.color)
        .bind(&id)
        .execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn eliminar_categoria_logico(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE categorias SET activo = false WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reactivar_categoria(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE categorias SET activo = true WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reordenar_categorias(State(pool): State<PgPool>, Json(payload): Json<Vec<ReordenarDTO>>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    for item in payload {
        sqlx::query("UPDATE categorias SET orden = $1 WHERE id = $2::uuid")
            .bind(item.orden)
            .bind(&item.id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok((StatusCode::OK, "OK"))
}

// --- CUENTAS ---
pub async fn listar_cuentas(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as!(
        CuentaItemDTO,
        r#"SELECT 
            c.id::text as "id!", 
            c.nombre as "nombre!", 
            c.color as "color?", 
            COALESCE(c.activo, true) as "activo!", 
            COALESCE(c.orden, 0) as "orden!",
            COALESCE(array_agg(ct.tipo_operacion_id::text) FILTER (WHERE ct.tipo_operacion_id IS NOT NULL), ARRAY[]::text[]) as "tipos_operacion!"
           FROM cuentas c
           LEFT JOIN cuentas_tipos_operacion ct ON c.id = ct.cuenta_id
           GROUP BY c.id ORDER BY c.orden ASC, c.nombre ASC"#
    ).fetch_all(&pool).await?;

    Ok(Json(rows))
}

pub async fn crear_cuenta(State(pool): State<PgPool>, Json(payload): Json<UpsertCuentaDTO>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    
    let max_orden_opt: Option<i32> = sqlx::query_scalar("SELECT MAX(orden) FROM cuentas").fetch_one(&mut *tx).await?;
    let max_orden = max_orden_opt.unwrap_or(0);
    let orden_final = payload.orden.unwrap_or(max_orden + 1);
    
    let row = sqlx::query("INSERT INTO cuentas (nombre, color, activo, orden) VALUES ($1, $2, true, $3) RETURNING id::text")
        .bind(&payload.nombre).bind(&payload.color).bind(orden_final).fetch_one(&mut *tx).await?;
        
    let cuenta_id: String = row.try_get("id")?;
    for tipo in payload.tipos_operacion {
        sqlx::query("INSERT INTO cuentas_tipos_operacion (cuenta_id, tipo_operacion_id) VALUES ($1::uuid, $2::tipo_operacion_enum)")
            .bind(&cuenta_id).bind(tipo).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn modificar_cuenta(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertCuentaDTO>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    
    sqlx::query("UPDATE cuentas SET nombre = $1, color = $2 WHERE id = $3::uuid").bind(&payload.nombre).bind(&payload.color).bind(&id).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM cuentas_tipos_operacion WHERE cuenta_id = $1::uuid").bind(&id).execute(&mut *tx).await?;
        
    for tipo in payload.tipos_operacion {
        sqlx::query("INSERT INTO cuentas_tipos_operacion (cuenta_id, tipo_operacion_id) VALUES ($1::uuid, $2::tipo_operacion_enum)")
            .bind(&id).bind(tipo).execute(&mut *tx).await?;
    }
    
    tx.commit().await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn eliminar_cuenta_logico(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE cuentas SET activo = false WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reactivar_cuenta(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE cuentas SET activo = true WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reordenar_cuentas(State(pool): State<PgPool>, Json(payload): Json<Vec<ReordenarDTO>>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    for item in payload {
        sqlx::query("UPDATE cuentas SET orden = $1 WHERE id = $2::uuid")
            .bind(item.orden)
            .bind(&item.id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok((StatusCode::OK, "OK"))
}

// --- GRUPOS ---
pub async fn listar_grupos(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows = sqlx::query_as!(GrupoDTO, r#"SELECT id::text as "id!", nombre as "nombre!", color, activo as "activo!", orden as "orden!" FROM grupos ORDER BY orden ASC, nombre ASC"#).fetch_all(&pool).await?;
    Ok(Json(rows))
}

pub async fn crear_grupo(State(pool): State<PgPool>, Json(payload): Json<UpsertGrupoDTO>) -> Result<impl IntoResponse, AppError> {
    let max_orden_opt: Option<i32> = sqlx::query_scalar("SELECT MAX(orden) FROM grupos").fetch_one(&pool).await?;
    let max_orden = max_orden_opt.unwrap_or(0);
    sqlx::query("INSERT INTO grupos (nombre, color, activo, orden) VALUES ($1, $2, true, $3)")
        .bind(&payload.nombre).bind(&payload.color).bind(payload.orden.unwrap_or(max_orden + 1)).execute(&pool).await?;
    Ok((StatusCode::CREATED, "OK"))
}

pub async fn modificar_grupo(State(pool): State<PgPool>, Path(id): Path<String>, Json(payload): Json<UpsertGrupoDTO>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE grupos SET nombre = $1, color = $2 WHERE id = $3::uuid").bind(&payload.nombre).bind(&payload.color).bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn eliminar_grupo_logico(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE grupos SET activo = false WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reactivar_grupo(State(pool): State<PgPool>, Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    sqlx::query("UPDATE grupos SET activo = true WHERE id = $1::uuid").bind(&id).execute(&pool).await?;
    Ok((StatusCode::OK, "OK"))
}

pub async fn reordenar_grupos(State(pool): State<PgPool>, Json(payload): Json<Vec<ReordenarDTO>>) -> Result<impl IntoResponse, AppError> {
    let mut tx = pool.begin().await?;
    for item in payload {
        sqlx::query("UPDATE grupos SET orden = $1 WHERE id = $2::uuid")
            .bind(item.orden)
            .bind(&item.id)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok((StatusCode::OK, "OK"))
}

// --- AJUSTES ---
pub async fn listar_ajustes(State(pool): State<PgPool>) -> Result<impl IntoResponse, AppError> {
    let rows: Vec<AjusteDTO> = sqlx::query_as(
        "SELECT clave, valor FROM ajustes ORDER BY clave ASC"
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(rows))
}

pub async fn actualizar_ajuste(State(pool): State<PgPool>, Json(payload): Json<AjusteDTO>) -> Result<impl IntoResponse, AppError> {
    sqlx::query(
        "INSERT INTO ajustes (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor"
    )
    .bind(&payload.clave)
    .bind(&payload.valor)
    .execute(&pool)
    .await?;

    Ok((StatusCode::OK, "OK"))
}