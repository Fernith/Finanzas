use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sqlx::PgPool;
use crate::dtos::ajustes::CategoriaItemDTO;
use crate::dtos::budget::*;
use crate::error::AppError;

fn redondear_dos_decimales(valor: f64) -> f64 {
    (valor * 100.0).round() / 100.0
}

pub async fn obtener_datos_budget(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, AppError> {
    let valor_config: Option<String> = sqlx::query_scalar(
        "SELECT valor FROM ajustes WHERE clave = 'budget_config'"
    )
    .fetch_optional(&pool)
    .await?;

    let config: BudgetConfigDTO = match valor_config {
        Some(json_str) => match serde_json::from_str::<BudgetConfigDTO>(&json_str) {
            Ok(parsed) => parsed,
            Err(_) => BudgetConfigDTO::default(),
        },
        None => BudgetConfigDTO::default(),
    };

    let todas_categorias: Vec<CategoriaItemDTO> = sqlx::query_as(
        r#"
        SELECT 
            c.id::text AS id, 
            c.nombre AS nombre, 
            c.tipo_operacion_id::text AS tipo_operacion_id,
            c.grupo_id::text AS grupo_id,
            g.nombre AS grupo_nombre,
            c.color AS color, 
            g.color AS color_grupo,
            COALESCE(c.activo, true) AS activo, 
            COALESCE(c.orden, 0) AS orden 
        FROM categorias c
        LEFT JOIN grupos g ON c.grupo_id = g.id
        WHERE COALESCE(c.activo, true) = true
        ORDER BY c.orden ASC, c.nombre ASC
        "#
    )
    .fetch_all(&pool)
    .await?;

    let mut categorias_ingresos = Vec::new();
    let mut categorias_gastos = Vec::new();

    for cat in todas_categorias {
        if cat.tipo_operacion_id == "INGRESO" {
            categorias_ingresos.push(cat);
        } else if cat.tipo_operacion_id == "GASTO" {
            categorias_gastos.push(cat);
        }
    }

    let ingresos_raw: Vec<IngresoBudgetDTO> = sqlx::query_as(
        r#"
        SELECT 
            o.id::text AS id,
            o.fecha::text AS fecha, 
            ROUND(o.cantidad::numeric, 2)::float8 AS cantidad,
            o.categoria_id::text AS categoria_id,
            c.nombre AS categoria,
            c.color AS color_categoria,
            g.color AS color_grupo,
            cu.nombre AS cuenta,
            o.descripcion AS descripcion,
            COALESCE(o.pendiente, false)::bool AS pendiente
        FROM operaciones o
        JOIN categorias c ON o.categoria_id = c.id
        LEFT JOIN grupos g ON c.grupo_id = g.id
        JOIN cuentas cu ON o.cuenta_id = cu.id
        WHERE o.tipo_operacion_id = 'INGRESO'::tipo_operacion_enum
          AND o.fecha >= (CURRENT_DATE - INTERVAL '30 days')::date
          AND (
              COALESCE(o.pendiente, false) = false
              OR EXISTS (
                  SELECT 1 FROM ajustes a
                  WHERE a.clave = 'pendientes' AND LOWER(TRIM(a.valor)) = 'true'
              )
          )
        ORDER BY o.fecha DESC, o.id DESC
        "#
    )
    .fetch_all(&pool)
    .await?;

    let ingresos_ultimos_30_dias: Vec<IngresoBudgetDTO> = ingresos_raw
        .into_iter()
        .map(|mut ing| {
            ing.cantidad = redondear_dos_decimales(ing.cantidad);
            ing
        })
        .collect();

    let gastos_raw: Vec<GastoCategoriaRealDTO> = sqlx::query_as(
        r#"
        SELECT 
            o.categoria_id::text AS categoria_id,
            COALESCE(ROUND(SUM(o.cantidad)::numeric, 2), 0)::float8 AS total_real
        FROM operaciones o
        WHERE o.tipo_operacion_id = 'GASTO'::tipo_operacion_enum
          AND COALESCE(o.pendiente, false) = false
          AND EXTRACT(MONTH FROM o.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM o.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY o.categoria_id
        "#
    )
    .fetch_all(&pool)
    .await?;

    let gastos_mes_actual: Vec<GastoCategoriaRealDTO> = gastos_raw
        .into_iter()
        .map(|mut g| {
            g.total_real = redondear_dos_decimales(g.total_real);
            g
        })
        .collect();

    Ok(Json(BudgetDatosDTO {
        config,
        categorias_ingresos,
        categorias_gastos,
        ingresos_ultimos_30_dias,
        gastos_mes_actual,
    }))
}

pub async fn guardar_config_budget(
    State(pool): State<PgPool>,
    Json(mut payload): Json<BudgetConfigDTO>,
) -> Result<impl IntoResponse, AppError> {
    payload.ingreso_manual = redondear_dos_decimales(payload.ingreso_manual);
    for item in &mut payload.categorias_gastos {
        item.monto_fijo = redondear_dos_decimales(item.monto_fijo);
    }

    let valor_json = serde_json::to_string(&payload)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query(
        "INSERT INTO ajustes (clave, valor) VALUES ('budget_config', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor"
    )
    .bind(&valor_json)
    .execute(&pool)
    .await?;

    Ok((StatusCode::OK, "OK"))
}
