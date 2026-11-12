// Le decimos a Rust que busque una carpeta o archivo llamado "handlers"
mod handlers;
mod error;
mod dtos;
mod cron;

use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{CorsLayer, Any};
use std::env;
use tower_http::services::{ServeDir, ServeFile};
use axum::http::HeaderName;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    let pool_para_cron = pool.clone();
        
    println!("✅ Conectado a Supabase correctamente.");

    let cors = CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers([HeaderName::from_static("x-total-count")]);

    let frontend = ServeDir::new("public")
        .not_found_service(ServeFile::new("public/index.html"));

    let app = Router::new()
        // --- RUTAS DE GASTOS ---
        .route("/api/gastos", get(handlers::gastos::obtener_gastos).post(handlers::gastos::crear_gasto))
        .route("/api/gastos/:id", axum::routing::put(handlers::gastos::actualizar_gasto).delete(handlers::gastos::eliminar_gasto))
        .route("/api/categorias/gastos", get(handlers::gastos::obtener_categorias_gastos))
        .route("/api/cuentas/gastos", get(handlers::gastos::obtener_cuentas_gastos))
        .route("/api/gastos/:id/completar", axum::routing::patch(handlers::gastos::completar_operacion))
        
        // --- RUTAS DE INGRESOS (NUEVO) ---
        .route("/api/ingresos", get(handlers::ingresos::obtener_ingresos).post(handlers::ingresos::crear_ingreso))
        .route("/api/ingresos/:id", axum::routing::put(handlers::ingresos::actualizar_ingreso).delete(handlers::ingresos::eliminar_ingreso))
        .route("/api/categorias/ingresos", get(handlers::ingresos::obtener_categorias_ingresos))
        .route("/api/cuentas/ingresos", get(handlers::ingresos::obtener_cuentas_ingresos))
        .route("/api/ingresos/:id/completar", axum::routing::patch(handlers::ingresos::completar_operacion))

        // --- RUTAS DE CONFIGURACIÓN / AJUSTES ---
        .route("/api/ajustes/categorias", axum::routing::get(handlers::ajustes::listar_categorias).post(handlers::ajustes::crear_categoria))
        .route("/api/ajustes/categorias/:id", axum::routing::put(handlers::ajustes::modificar_categoria).delete(handlers::ajustes::eliminar_categoria_logico))
        .route("/api/ajustes/categorias/:id/activar", axum::routing::put(handlers::ajustes::reactivar_categoria))
        .route("/api/ajustes/categorias/reordenar", axum::routing::put(handlers::ajustes::reordenar_categorias))
        
        .route("/api/ajustes/cuentas", axum::routing::get(handlers::ajustes::listar_cuentas).post(handlers::ajustes::crear_cuenta))
        .route("/api/ajustes/cuentas/:id", axum::routing::put(handlers::ajustes::modificar_cuenta).delete(handlers::ajustes::eliminar_cuenta_logico))
        .route("/api/ajustes/cuentas/:id/activar", axum::routing::put(handlers::ajustes::reactivar_cuenta))
        .route("/api/ajustes/cuentas/reordenar", axum::routing::put(handlers::ajustes::reordenar_cuentas))

        .route("/api/ajustes/grupos", axum::routing::get(handlers::ajustes::listar_grupos).post(handlers::ajustes::crear_grupo))
        .route("/api/ajustes/grupos/:id", axum::routing::put(handlers::ajustes::modificar_grupo).delete(handlers::ajustes::eliminar_grupo_logico))
        .route("/api/ajustes/grupos/:id/activar", axum::routing::put(handlers::ajustes::reactivar_grupo))
        .route("/api/ajustes/grupos/reordenar", axum::routing::put(handlers::ajustes::reordenar_grupos))

        // --- RUTAS DE BALANCE ---
        .route("/api/balance/anual", axum::routing::get(handlers::balance::obtener_balance_anual))

        // --- RUTAS DE AHORROS ---
        .route("/api/ahorros/metas", axum::routing::get(handlers::ahorros::listar_metas).post(handlers::ahorros::crear_meta))
        .route("/api/ahorros/metas/:id", axum::routing::put(handlers::ahorros::modificar_meta).delete(handlers::ahorros::eliminar_meta))
        .route("/api/ahorros/resumen", axum::routing::get(handlers::ahorros::obtener_resumen))
        .route("/api/ahorros/metas/:id/movimientos", axum::routing::post(handlers::ahorros::agregar_movimiento_meta))

        // --- RUTAS DE INVERSIONES (NUEVO MODELO) ---
        .route("/api/inversiones/activos", axum::routing::get(handlers::inversiones::listar_activos).post(handlers::inversiones::crear_activo))
        .route("/api/inversiones/activos/:ticker", axum::routing::put(handlers::inversiones::modificar_activo).delete(handlers::inversiones::eliminar_activo))
        
        .route("/api/inversiones/transacciones", axum::routing::get(handlers::inversiones::listar_transacciones).post(handlers::inversiones::crear_transaccion))
        .route("/api/inversiones/transacciones/:id", axum::routing::put(handlers::inversiones::modificar_transaccion).delete(handlers::inversiones::eliminar_transaccion))

        // --- RUTAS DE LIQUIDEZ ---
        .route("/api/liquidez/saldos", axum::routing::get(handlers::liquidez::obtener_saldos_actuales).post(handlers::liquidez::registrar_saldo))
        .route("/api/liquidez/saldos/:cuenta_id", axum::routing::get(handlers::liquidez::obtener_historial_cuenta))
        .route("/api/ahorros/opciones-finalizar", axum::routing::get(handlers::ahorros::opciones_finalizar))
        .route("/api/ahorros/metas/:id/finalizar", axum::routing::post(handlers::ahorros::finalizar_meta))

        // AJUSTES GENERALES
        .route("/api/ajustes", axum::routing::get(handlers::ajustes::listar_ajustes).put(handlers::ajustes::actualizar_ajuste))

        // SUSCRIPCIONES
        .route("/api/suscripciones", axum::routing::get(handlers::suscripciones::listar_suscripciones).post(handlers::suscripciones::crear_suscripcion))
        .route("/api/suscripciones/:id", axum::routing::put(handlers::suscripciones::modificar_suscripcion).delete(handlers::suscripciones::eliminar_suscripcion))

        // BUDGET
        .route("/api/budget", axum::routing::get(handlers::budget::obtener_datos_budget))
        .route("/api/budget/config", axum::routing::put(handlers::budget::guardar_config_budget))

        .fallback_service(frontend)

        .layer(cors)
        .with_state(pool);

    
    cron::iniciar_cron_suscripciones(pool_para_cron).await;
    
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    println!("🚀 Servidor Rust corriendo en {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}