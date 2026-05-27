// Le decimos a Rust que busque una carpeta o archivo llamado "handlers"
mod handlers;

use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use std::env;
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("Falta DATABASE_URL en el .env");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("No se pudo conectar a la base de datos");
        
    println!("✅ Conectado a Supabase correctamente.");

    let cors = CorsLayer::permissive();

    let frontend = ServeDir::new("public")
        .not_found_service(ServeFile::new("public/index.html"));

    let app = Router::new()
        // --- RUTAS DE GASTOS ---
        .route("/api/gastos", axum::routing::get(handlers::gastos::listar_gastos).post(handlers::gastos::crear_gasto))
        .route("/api/gastos/categorias", axum::routing::get(handlers::gastos::obtener_categorias_gastos))
        .route("/api/gastos/cuentas", axum::routing::get(handlers::gastos::obtener_cuentas_gastos))
        .route("/api/gastos/:id", axum::routing::put(handlers::gastos::modificar_gasto).delete(handlers::gastos::eliminar_gasto))

        // --- RUTAS DE INGRESOS ---
        .route("/api/ingresos", axum::routing::get(handlers::ingresos::listar_ingresos).post(handlers::ingresos::crear_ingreso))
        .route("/api/ingresos/categorias", axum::routing::get(handlers::ingresos::obtener_categorias_ingresos))
        .route("/api/ingresos/cuentas", axum::routing::get(handlers::ingresos::obtener_cuentas_ingresos))
        .route("/api/ingresos/:id", axum::routing::put(handlers::ingresos::modificar_ingreso).delete(handlers::ingresos::eliminar_ingreso))

        // --- RUTAS DE CONFIGURACIÓN / AJUSTES ---
        .route("/api/ajustes/categorias", axum::routing::get(handlers::ajustes::listar_categorias).post(handlers::ajustes::crear_categoria))
        .route("/api/ajustes/categorias/:id", axum::routing::put(handlers::ajustes::modificar_categoria).delete(handlers::ajustes::eliminar_categoria_logico))
        .route("/api/ajustes/categorias/:id/activar", axum::routing::put(handlers::ajustes::reactivar_categoria))
        
        .route("/api/ajustes/cuentas", axum::routing::get(handlers::ajustes::listar_cuentas).post(handlers::ajustes::crear_cuenta))
        .route("/api/ajustes/cuentas/:id", axum::routing::put(handlers::ajustes::modificar_cuenta).delete(handlers::ajustes::eliminar_cuenta_logico))
        .route("/api/ajustes/cuentas/:id/activar", axum::routing::put(handlers::ajustes::reactivar_cuenta))

        // --- RUTAS DE BALANCE ---
        .route("/api/balance/anual", axum::routing::get(handlers::balance::obtener_balance_anual))

        // --- RUTAS DE AHORROS ---
        .route("/api/ahorros/metas", axum::routing::get(handlers::ahorros::listar_metas).post(handlers::ahorros::crear_meta))
        .route("/api/ahorros/metas/:id", axum::routing::put(handlers::ahorros::modificar_meta).delete(handlers::ahorros::eliminar_meta))
        .route("/api/ahorros/resumen", axum::routing::get(handlers::ahorros::obtener_resumen))
        .route("/api/ahorros/metas/:id/movimientos", axum::routing::post(handlers::ahorros::agregar_movimiento_meta))

        // --- RUTAS DE INVERSIONES ---
        .route("/api/inversiones", axum::routing::get(handlers::inversiones::listar_inversiones).post(handlers::inversiones::crear_inversion))
        .route("/api/inversiones/categorias", axum::routing::get(handlers::inversiones::obtener_categorias_inversiones)) 
        .route("/api/inversiones/cuentas", axum::routing::get(handlers::inversiones::obtener_cuentas_inversiones))
        .route("/api/inversiones/:id", axum::routing::put(handlers::inversiones::modificar_inversion).delete(handlers::inversiones::eliminar_inversion))

        // --- RUTAS DE LIQUIDEZ ---
        .route("/api/liquidez/saldos", axum::routing::get(handlers::liquidez::obtener_saldos_actuales).post(handlers::liquidez::registrar_saldo))
        .route("/api/liquidez/saldos/:cuenta_id", axum::routing::get(handlers::liquidez::obtener_historial_cuenta))
        .route("/api/ahorros/opciones-finalizar", axum::routing::get(handlers::ahorros::opciones_finalizar))
        .route("/api/ahorros/metas/:id/finalizar", axum::routing::post(handlers::ahorros::finalizar_meta))

        // Asegúrate de que las rutas queden mapeadas limpiamente así en el Router:
        .route("/api/configuracion", axum::routing::get(handlers::configuracion::obtener_configuracion).put(handlers::configuracion::actualizar_configuracion))

        // Añade esta línea junto a tus endpoints habituales
        .route("/api/operaciones/:id/completar", axum::routing::put(handlers::inversiones::completar_operacion))

        .fallback_service(frontend)

        .layer(cors)
        .with_state(pool);

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    
    println!("🚀 Servidor Rust corriendo en {}", addr);
    axum::serve(listener, app).await.unwrap();
}