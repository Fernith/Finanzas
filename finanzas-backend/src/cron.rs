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
                Ok(None) => match sqlx::query_scalar::<_, String>(
                    "INSERT INTO categorias (nombre, tipo_operacion_id, activo, orden) VALUES ('Suscripciones', 'GASTO'::tipo_operacion_enum, true, 999) RETURNING id::text"
                ).fetch_one(&pool).await {
                    Ok(id) => id,
                    Err(e) => {
                        println!("❌ [CRON] Error creando categoría Suscripciones: {:?}", e);
                        continue;
                    }
                },
                Err(e) => {
                    println!("❌ [CRON] Error consultando categoría Suscripciones: {:?}", e);
                    continue;
                }
            };

            if cat_id.is_empty() { continue; }

            let mut iteraciones_seguridad = 0;
            while iteraciones_seguridad < 100 {
                iteraciones_seguridad += 1;

                // Buscamos suscripciones que toca cobrar
                let rows = match sqlx::query!(
                    r#"SELECT id::text as "id!", nombre, cantidad::float as "cantidad!", cuenta_id::text as "cuenta_id!", periodicidad::text as "periodicidad!", fecha_proxima_renovacion::text as "fecha_proxima_renovacion!"
                       FROM suscripciones WHERE activo = true AND fecha_proxima_renovacion <= CURRENT_DATE"#
                ).fetch_all(&pool).await {
                    Ok(r) => r,
                    Err(e) => {
                        println!("❌ [CRON] Error obteniendo suscripciones pendientes: {:?}", e);
                        break;
                    }
                };

                if rows.is_empty() { break; } 

                let mut hubo_error = false;

                for row in rows {
                    let desc = format!("Renovación: {}", row.nombre);
                    let cantidad_redondeada = (row.cantidad * 100.0).round() / 100.0;

                    let mut tx = match pool.begin().await {
                        Ok(t) => t,
                        Err(e) => {
                            println!("❌ [CRON] Error iniciando transacción para {}: {:?}", row.nombre, e);
                            hubo_error = true;
                            break;
                        }
                    };
                    
                    // 1. Insertamos el gasto real
                    let insert_res = sqlx::query(
                        "INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente) VALUES ('GASTO'::tipo_operacion_enum, $1::date, ROUND($2::float8::numeric, 2), $3::uuid, $4::uuid, $5, false)"
                    )
                    .bind(&row.fecha_proxima_renovacion)
                    .bind(cantidad_redondeada)
                    .bind(&cat_id)
                    .bind(&row.cuenta_id)
                    .bind(&desc)
                    .execute(&mut *tx).await;

                    if let Err(e) = insert_res {
                        println!("❌ [CRON] Error insertando gasto de suscripción {}: {:?}", row.nombre, e);
                        hubo_error = true;
                        break;
                    }

                    // 2. Actualizamos la próxima fecha de renovación de la suscripción
                    let update_res = sqlx::query(
                        r#"UPDATE suscripciones SET fecha_proxima_renovacion = CASE 
                            WHEN periodicidad = '30_DIAS' THEN fecha_proxima_renovacion + INTERVAL '30 days'
                            WHEN periodicidad = 'MENSUAL' THEN fecha_proxima_renovacion + INTERVAL '1 month'
                            WHEN periodicidad = 'ANUAL' THEN fecha_proxima_renovacion + INTERVAL '1 year'
                            ELSE fecha_proxima_renovacion + INTERVAL '1 month' END 
                           WHERE id = $1::uuid"#
                    ).bind(&row.id).execute(&mut *tx).await;

                    match update_res {
                        Ok(res) if res.rows_affected() > 0 => {
                            if let Err(e) = tx.commit().await {
                                println!("❌ [CRON] Error confirmando transacción de {}: {:?}", row.nombre, e);
                                hubo_error = true;
                                break;
                            }
                            println!("✅ [CRON] Cobrada suscripción: {}", row.nombre);
                        }
                        Ok(_) => {
                            println!("❌ [CRON] No se pudo avanzar la fecha de la suscripción {}", row.nombre);
                            hubo_error = true;
                            break;
                        }
                        Err(e) => {
                            println!("❌ [CRON] Error actualizando fecha de suscripción {}: {:?}", row.nombre, e);
                            hubo_error = true;
                            break;
                        }
                    }
                }

                if hubo_error {
                    break;
                }
            }
        }
    });
}