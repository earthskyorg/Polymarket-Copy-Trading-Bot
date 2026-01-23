// Polymarket Copy Trading Bot - Rust Version
// Entry point for the application

use std::process;
use tokio::sync::RwLock;

mod config;
mod interfaces;
mod models;
mod services;
mod utils;

use config::db::connect_db;
use config::env::{load_env, ENV};
use services::create_clob_client::create_clob_client;
use services::trade_executor::trade_executor;
use services::trade_monitor::trade_monitor;
use utils::errors::normalize_error;
use utils::health_check::perform_health_check;
use utils::logger::Logger;

// Global state for graceful shutdown
static IS_SHUTTING_DOWN: RwLock<bool> = RwLock::const_new(false);

/**
 * Gracefully shutdown the application
 */
async fn graceful_shutdown(signal: &str) {
    let mut is_shutting_down = IS_SHUTTING_DOWN.write().await;
    
    if *is_shutting_down {
        Logger::warning("Shutdown already in progress, forcing exit...");
        process::exit(1);
    }
    
    *is_shutting_down = true;
    drop(is_shutting_down);
    
    Logger::separator();
    Logger::info(&format!("Received {}, initiating graceful shutdown...", signal));
    
    // Stop services
    services::trade_monitor::stop_trade_monitor().await;
    services::trade_executor::stop_trade_executor().await;
    
    // Give services time to finish current operations
    Logger::info("Waiting for services to finish current operations...");
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    // Close database connection
    if let Err(e) = config::db::close_db().await {
        Logger::error(&format!("Error closing database: {}", e));
    }
    
    Logger::success("Graceful shutdown completed");
    process::exit(0);
}

/**
 * Main application entry point
 * Initializes database, CLOB client, and starts trade monitoring/execution
 */
async fn main_async() -> Result<(), Box<dyn std::error::Error>> {
    // Welcome message for first-time users
    println!("\n💡 First time running the bot?");
    println!("   Read the guide: GETTING_STARTED.md");
    println!("   Run health check: cargo run --bin health-check\n");
    
    // Connect to MongoDB
    connect_db().await?;
    
    Logger::startup(&ENV().user_addresses, &ENV().proxy_wallet);
    
    // Perform initial health check
    Logger::info("Performing initial health check...");
    let health_result = perform_health_check().await?;
    Logger::log_health_check(&health_result);
    
    if !health_result.healthy {
        Logger::warning("Health check failed, but continuing startup...");
    }
    
    Logger::info("Initializing CLOB client...");
    let clob_client = create_clob_client().await?;
    Logger::success("CLOB client ready");
    
    Logger::separator();
    Logger::info("Starting trade monitor...");
    
    // Start trade monitor first (like PythonVersion)
    // The monitor's init() will complete and log "Monitoring" before executor starts
    // We call init() separately to ensure it completes first, matching PythonVersion behavior
    services::trade_monitor::init().await?;
    
    // Now start the monitor (it will skip init() since it's already done)
    let monitor_future = async {
        let _ = trade_monitor().await;
    };
    
    Logger::info("Starting trade executor...");
    
    // Start trade executor (it will log "ready" after monitor has logged "Monitoring")
    let executor_future = async move {
        let _ = trade_executor(clob_client).await;
    };
    
    // Wait for both services or shutdown signal
    tokio::select! {
        _ = monitor_future => {
            Logger::warning("Trade monitor stopped unexpectedly");
        }
        _ = executor_future => {
            Logger::warning("Trade executor stopped unexpectedly");
        }
        _ = tokio::signal::ctrl_c() => {
            Logger::info("Ctrl+C received");
        }
    }
    
    Ok(())
}

#[tokio::main]
async fn main() {
    // Setup logger
    Logger::setup();
    
    // Load environment variables
    if let Err(e) = load_env() {
        eprintln!("Failed to load environment variables: {}", e);
        process::exit(1);
    }
    
    // Handle unhandled panics
    let default_panic = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        Logger::error(&format!("Panic: {:?}", panic_info));
        default_panic(panic_info);
    }));
    
    // Run main async function
    if let Err(e) = main_async().await {
        let normalized_error = normalize_error(e.as_ref());
        Logger::error(&format!(
            "Fatal error during startup: {}{}",
            normalized_error.message,
            if let Some(stack) = &normalized_error.stack {
                format!("\n{}", stack)
            } else {
                String::new()
            }
        ));
        graceful_shutdown("startup-error").await;
    }
}
