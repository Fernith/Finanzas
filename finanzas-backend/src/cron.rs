use sqlx::PgPool;
use tokio::time::{interval, Duration};

pub async fn iniciar_cron_suscripciones(pool: PgPool) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(60 * 60 * 12)); 

        loop {
            ticker.tick().await;
            println!("⏳ [CRON] Revisando suscripciones pendientes...");

            // Buscamos si existe la categoría "Suscripciones"
            let cat_id = match sqlx::query_scalar::<_, String>("SELECT id::text FROM categorias WHERE nombre ILIKE 'Suscripciones' LIMIT 1").fetch_optional(&pool).await {
                Ok(Some(id)) => id,
                // Si no existe, la creamos (sin color, con grupo_id a NULL)
                _ => sqlx::query_scalar::<_, String>(
                    "INSERT INTO categorias (nombre, tipo_operacion_id, grupo_id, activo, orden) VALUES ('Suscripciones', 'GASTO'::tipo_operacion_enum, NULL, true, 999) RETURNING id::text"
                ).fetch_one(&pool).await.unwrap_or_default()
            };

            if cat_id.is_empty() { continue; }

            loop {
                // Buscamos suscripciones que toca cobrar
                let rows = sqlx::query!(
                    r#"SELECT id::text as "id!", nombre, cantidad::float as "cantidad!", cuenta_id::text as "cuenta_id!", periodicidad::text as "periodicidad!", fecha_proxima_renovacion::text as "fecha_proxima_renovacion!"
                       FROM suscripciones WHERE activo = true AND fecha_proxima_renovacion <= CURRENT_DATE"#
                ).fetch_all(&pool).await.unwrap_or_default();

                if rows.is_empty() { break; } 

                for row in rows {
                    let desc = format!("Renovación: {}", row.nombre);
                    
                    // 1. Insertamos el gasto real
                    let _ = sqlx::query(
                        "INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente) VALUES ('GASTO'::tipo_operacion_enum, $1::date, $2::float8::numeric, $3::uuid, $4::uuid, $5, false)"
                    )
                    .bind(&row.fecha_proxima_renovacion)
                    .bind(row.cantidad)
                    .bind(&cat_id)
                    .bind(&row.cuenta_id)
                    .bind(&desc)
                    .execute(&pool).await;

                    // 2. Actualizamos la próxima fecha de renovación de la suscripción
                    let _ = sqlx::query(
                        r#"UPDATE suscripciones SET fecha_proxima_renovacion = CASE 
                            WHEN periodicidad = '30_DIAS' THEN fecha_proxima_renovacion + INTERVAL '30 days'
                            WHEN periodicidad = 'MENSUAL' THEN fecha_proxima_renovacion + INTERVAL '1 month'
                            WHEN periodicidad = 'ANUAL' THEN fecha_proxima_renovacion + INTERVAL '1 year' END 
                           WHERE id = $1::uuid"#
                    ).bind(&row.id).execute(&pool).await;
                    
                    println!("✅ [CRON] Cobrada suscripción: {}", row.nombre);
                }
            }
        }
    });
}