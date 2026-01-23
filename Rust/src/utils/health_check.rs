// Health check utilities

use crate::utils::logger::HealthCheckResult;
use crate::config::db::get_database;
use crate::config::env::ENV;
use crate::utils::get_my_balance::get_my_balance;
use crate::utils::fetch_data::fetch_data;
use crate::utils::constants::POLYMARKET_API;

pub async fn perform_health_check() -> Result<HealthCheckResult, Box<dyn std::error::Error>> {
    let mut checks = std::collections::HashMap::new();
    
    // Check MongoDB connection
    let db_status = match get_database().run_command(mongodb::bson::doc! {"ping": 1}).await {
        Ok(_) => ("ok".to_string(), "Connected".to_string()),
        Err(e) => ("error".to_string(), format!("Connection failed: {}", e)),
    };
    checks.insert("database".to_string(), db_status);
    
    // Check RPC endpoint (actual HTTP call like PythonVersion)
    let rpc_status = match check_rpc_endpoint().await {
        Ok(_) => ("ok".to_string(), "RPC endpoint responding".to_string()),
        Err(e) => ("error".to_string(), format!("RPC check failed: {}", e)),
    };
    checks.insert("rpc".to_string(), rpc_status);
    
    // Check USDC balance (actual balance fetch like PythonVersion)
    let balance_status = match get_my_balance(&ENV().proxy_wallet).await {
        Ok(balance) => {
            if balance > 0.0 {
                if balance < 10.0 {
                    ("warning".to_string(), format!("Low balance: ${:.2}", balance))
                } else {
                    ("ok".to_string(), format!("Balance: ${:.2}", balance))
                }
            } else {
                ("error".to_string(), "Zero balance".to_string())
            }
        }
        Err(e) => ("error".to_string(), format!("Balance check failed: {}", e)),
    };
    checks.insert("balance".to_string(), balance_status);
    
    // Check Polymarket API (actual API call like PythonVersion)
    let api_status = match check_polymarket_api().await {
        Ok(_) => ("ok".to_string(), "API responding".to_string()),
        Err(e) => ("error".to_string(), format!("API check failed: {}", e)),
    };
    checks.insert("polymarketApi".to_string(), api_status);
    
    // Determine overall health (like PythonVersion)
    let healthy = checks.get("database").map(|(s, _)| s == "ok").unwrap_or(false)
        && checks.get("rpc").map(|(s, _)| s == "ok").unwrap_or(false)
        && checks.get("balance").map(|(s, _)| s != "error").unwrap_or(false)
        && checks.get("polymarketApi").map(|(s, _)| s == "ok").unwrap_or(false);
    
    Ok(HealthCheckResult {
        healthy,
        checks,
    })
}

async fn check_rpc_endpoint() -> Result<(), Box<dyn std::error::Error>> {
    use reqwest::Client;
    
    let client = Client::new();
    let response = client
        .post(&ENV().rpc_url)
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_blockNumber",
            "params": [],
            "id": 1
        }))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await?;
    
    if response.status().is_success() {
        let data: serde_json::Value = response.json().await?;
        if data.get("result").is_some() {
            Ok(())
        } else {
            Err("Invalid RPC response".into())
        }
    } else {
        Err(format!("HTTP {}", response.status()).into())
    }
}

async fn check_polymarket_api() -> Result<(), Box<dyn std::error::Error>> {
    // Test URL like PythonVersion: positions?user=0x0000000000000000000000000000000000000000
    let test_url = format!(
        "{}{}?user=0x0000000000000000000000000000000000000000",
        POLYMARKET_API::DATA_API_BASE,
        POLYMARKET_API::POSITIONS_ENDPOINT
    );
    let _: Vec<serde_json::Value> = fetch_data(&test_url).await?;
    Ok(())
}
