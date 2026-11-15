use sqlx::PgPool;
use tokio::time::{interval, Duration};

#[derive(sqlx::FromRow)]
struct PrestamoCronRow {
    id: String,
    nombre: String,
    cuenta_id: String,
    fecha_proximo_pago: String,
}

pub async fn obtener_o_crear_categoria_prestamos(pool: &PgPool) -> Result<String, sqlx::Error> {
    let cat_opt = sqlx::query_scalar::<_, String>(
        "SELECT id::text FROM categorias WHERE translate(LOWER(nombre), 'áéíóú', 'aeiou') = 'prestamos' AND tipo_operacion_id = 'GASTO'::tipo_operacion_enum LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    if let Some(id) = cat_opt {
        return Ok(id);
    }

    let id = sqlx::query_scalar::<_, String>(
        "INSERT INTO categorias (nombre, tipo_operacion_id, activo, orden) VALUES ('Préstamos', 'GASTO'::tipo_operacion_enum, true, 999) RETURNING id::text"
    )
    .fetch_one(pool)
    .await?;

    Ok(id)
}

pub async fn procesar_prestamos_pendientes(pool: &PgPool) {
    let cat_id = match obtener_o_crear_categoria_prestamos(pool).await {
        Ok(id) if !id.is_empty() => id,
        Ok(_) => return,
        Err(e) => {
            println!("❌ [CRON] Error consultando/creando categoría Préstamos: {:?}", e);
            return;
        }
    };

    let _ = sqlx::query(
        "UPDATE prestamos SET finalizado = true, cantidad_pendiente = 0 WHERE finalizado = false AND cantidad_pendiente <= 0"
    )
    .execute(pool)
    .await;

    let mut iteraciones_seguridad = 0;
    while iteraciones_seguridad < 100 {
        iteraciones_seguridad += 1;

        let rows: Vec<PrestamoCronRow> = match sqlx::query_as(
            r#"SELECT id::text AS id,
                      nombre,
                      cuenta_id::text AS cuenta_id,
                      fecha_proximo_pago::text AS fecha_proximo_pago
               FROM prestamos
               WHERE finalizado = false
                 AND cantidad_pendiente > 0
                 AND cuota_periodica > 0
                 AND fecha_proximo_pago <= CURRENT_DATE"#
        )
        .fetch_all(pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                println!("❌ [CRON] Error obteniendo préstamos pendientes: {:?}", e);
                break;
            }
        };

        if rows.is_empty() {
            break;
        }

        let mut hubo_error = false;
        let mut procesado_alguno = false;

        for row in rows {
            let mut tx = match pool.begin().await {
                Ok(t) => t,
                Err(e) => {
                    println!("❌ [CRON] Error iniciando transacción para préstamo {}: {:?}", row.nombre, e);
                    hubo_error = true;
                    break;
                }
            };

            let estado_actual: Option<(f64, f64, String)> = match sqlx::query_as(
                r#"SELECT ROUND(cantidad_pendiente::numeric, 2)::float8,
                          ROUND(cuota_periodica::numeric, 2)::float8,
                          fecha_proximo_pago::text
                   FROM prestamos
                   WHERE id = $1::uuid
                     AND finalizado = false
                     AND cantidad_pendiente > 0
                     AND fecha_proximo_pago = $2::date
                     AND fecha_proximo_pago <= CURRENT_DATE
                   FOR UPDATE SKIP LOCKED"#
            )
            .bind(&row.id)
            .bind(&row.fecha_proximo_pago)
            .fetch_optional(&mut *tx)
            .await
            {
                Ok(res) => res,
                Err(e) => {
                    println!("❌ [CRON] Error bloqueando préstamo {}: {:?}", row.nombre, e);
                    hubo_error = true;
                    break;
                }
            };

            let Some((pendiente_db, cuota_db, fecha_cobro)) = estado_actual else {
                continue;
            };

            let importe_pago = ((pendiente_db.min(cuota_db)) * 100.0).round() / 100.0;
            if importe_pago <= 0.0 {
                continue;
            }

            let nueva_pendiente_raw = (((pendiente_db - importe_pago) * 100.0).round() / 100.0).max(0.0);
            let nuevo_finalizado = nueva_pendiente_raw <= 0.001;
            let nueva_pendiente = if nuevo_finalizado { 0.0 } else { nueva_pendiente_raw };

            let desc = format!("Cuota préstamo: {}", row.nombre);

            let insert_res = sqlx::query(
                "INSERT INTO operaciones (tipo_operacion_id, fecha, cantidad, categoria_id, cuenta_id, descripcion, pendiente, prestamo_id, es_cuota_prestamo) VALUES ('GASTO'::tipo_operacion_enum, $1::date, ROUND($2::float8::numeric, 2), $3::uuid, $4::uuid, $5, false, $6::uuid, true)"
            )
            .bind(&fecha_cobro)
            .bind(importe_pago)
            .bind(&cat_id)
            .bind(&row.cuenta_id)
            .bind(&desc)
            .bind(&row.id)
            .execute(&mut *tx)
            .await;

            if let Err(e) = insert_res {
                println!("❌ [CRON] Error insertando gasto de préstamo {}: {:?}", row.nombre, e);
                hubo_error = true;
                break;
            }

            let update_res = sqlx::query(
                r#"UPDATE prestamos
                   SET cantidad_pendiente = ROUND($2::float8::numeric, 2),
                       finalizado = $3,
                       fecha_proximo_pago = CASE
                           WHEN periodicidad::text = 'DIARIA' THEN (fecha_proximo_pago + INTERVAL '1 day')::date
                           WHEN periodicidad::text = 'SEMANAL' THEN (fecha_proximo_pago + INTERVAL '7 days')::date
                           WHEN periodicidad::text = 'QUINCENAL' THEN (fecha_proximo_pago + INTERVAL '15 days')::date
                           WHEN periodicidad::text = '30_DIAS' THEN (fecha_proximo_pago + INTERVAL '30 days')::date
                           WHEN periodicidad::text = 'MENSUAL' THEN (fecha_proximo_pago + INTERVAL '1 month')::date
                           WHEN periodicidad::text = 'ANUAL' THEN (fecha_proximo_pago + INTERVAL '1 year')::date
                           ELSE (fecha_proximo_pago + INTERVAL '1 month')::date
                       END
                   WHERE id = $1::uuid"#
            )
            .bind(&row.id)
            .bind(nueva_pendiente)
            .bind(nuevo_finalizado)
            .execute(&mut *tx)
            .await;

            match update_res {
                Ok(res) if res.rows_affected() > 0 => {
                    if let Err(e) = tx.commit().await {
                        println!("❌ [CRON] Error confirmando transacción de préstamo {}: {:?}", row.nombre, e);
                        hubo_error = true;
                        break;
                    }
                    procesado_alguno = true;
                    println!("✅ [CRON] Cobrada cuota de préstamo: {} ({:.2} €)", row.nombre, importe_pago);
                }
                Ok(_) => {
                    println!("❌ [CRON] No se pudo actualizar el préstamo {}", row.nombre);
                    hubo_error = true;
                    break;
                }
                Err(e) => {
                    println!("❌ [CRON] Error actualizando préstamo {}: {:?}", row.nombre, e);
                    hubo_error = true;
                    break;
                }
            }
        }

        if hubo_error || !procesado_alguno {
            break;
        }
    }
}

pub async fn iniciar_cron_suscripciones(pool: PgPool) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(60 * 60 * 12)); 

        loop {
            ticker.tick().await;
            println!("⏳ [CRON] Revisando suscripciones y préstamos pendientes...");

            // Buscamos si existe la categoría "Suscripciones"
            let cat_id = match sqlx::query_scalar::<_, String>("SELECT id::text FROM categorias WHERE nombre ILIKE 'Suscripciones' LIMIT 1").fetch_optional(&pool).await {
                Ok(Some(id)) => id,
                Ok(None) => match sqlx::query_scalar::<_, String>(
                    "INSERT INTO categorias (nombre, tipo_operacion_id, activo, orden) VALUES ('Suscripciones', 'GASTO'::tipo_operacion_enum, true, 999) RETURNING id::text"
                ).fetch_one(&pool).await {
                    Ok(id) => id,
                    Err(e) => {
                        println!("❌ [CRON] Error creando categoría Suscripciones: {:?}", e);
                        procesar_prestamos_pendientes(&pool).await;
                        continue;
                    }
                },
                Err(e) => {
                    println!("❌ [CRON] Error consultando categoría Suscripciones: {:?}", e);
                    procesar_prestamos_pendientes(&pool).await;
                    continue;
                }
            };

            if cat_id.is_empty() {
                procesar_prestamos_pendientes(&pool).await;
                continue;
            }

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
                            WHEN periodicidad::text = 'DIARIA' THEN (fecha_proxima_renovacion + INTERVAL '1 day')::date
                            WHEN periodicidad::text = 'SEMANAL' THEN (fecha_proxima_renovacion + INTERVAL '7 days')::date
                            WHEN periodicidad::text = 'QUINCENAL' THEN (fecha_proxima_renovacion + INTERVAL '15 days')::date
                            WHEN periodicidad::text = '30_DIAS' THEN (fecha_proxima_renovacion + INTERVAL '30 days')::date
                            WHEN periodicidad::text = 'MENSUAL' THEN (fecha_proxima_renovacion + INTERVAL '1 month')::date
                            WHEN periodicidad::text = 'ANUAL' THEN (fecha_proxima_renovacion + INTERVAL '1 year')::date
                            ELSE (fecha_proxima_renovacion + INTERVAL '1 month')::date END 
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

            procesar_prestamos_pendientes(&pool).await;
        }
    });
}
