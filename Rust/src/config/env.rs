// Environment variable configuration

use dotenvy::dotenv;
use std::env;
use crate::config::copy_strategy::CopyStrategyConfig;
use crate::utils::errors::AppError;

/// Validate Ethereum address format
fn is_valid_ethereum_address(address: &str) -> bool {
    address.starts_with("0x") && address.len() == 42 && address[2..].chars().all(|c| c.is_ascii_hexdigit())
}

/// Parse USER_ADDRESSES: supports both comma-separated string and JSON array
fn parse_user_addresses(input: &str) -> Result<Vec<String>, AppError> {
    let trimmed = input.trim();
    
    // Check if it's JSON array format
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        let parsed: Result<Vec<String>, _> = serde_json::from_str(trimmed);
        match parsed {
            Ok(addresses) => {
                let addresses: Vec<String> = addresses
                    .into_iter()
                    .map(|addr| addr.to_lowercase().trim().to_string())
                    .filter(|addr| !addr.is_empty())
                    .collect();
                
                // Validate each address
                for addr in &addresses {
                    if !is_valid_ethereum_address(addr) {
                        eprintln!("\n❌ Invalid Trader Address in USER_ADDRESSES\n");
                        eprintln!("Invalid address: {}", addr);
                        eprintln!("Expected format: 0x followed by 40 hexadecimal characters\n");
                        eprintln!("💡 Where to find trader addresses:");
                        eprintln!("   • Polymarket Leaderboard: https://polymarket.com/leaderboard");
                        eprintln!("   • Predictfolio: https://predictfolio.com\n");
                        eprintln!("Example: USER_ADDRESSES='0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'\n");
                        return Err(AppError::ConfigurationError(
                            format!("Invalid Ethereum address in USER_ADDRESSES: {}", addr)
                        ));
                    }
                }
                Ok(addresses)
            }
            Err(e) => Err(AppError::ConfigurationError(
                format!("Invalid JSON format for USER_ADDRESSES: {}", e)
            ))
        }
    } else {
        // Otherwise treat as comma-separated
        let addresses: Vec<String> = trimmed
            .split(',')
            .map(|addr| addr.trim().to_lowercase())
            .filter(|addr| !addr.is_empty())
            .collect();
        
        // Validate each address
        for addr in &addresses {
            if !is_valid_ethereum_address(addr) {
                eprintln!("\n❌ Invalid Trader Address in USER_ADDRESSES\n");
                eprintln!("Invalid address: {}", addr);
                eprintln!("Expected format: 0x followed by 40 hexadecimal characters\n");
                eprintln!("💡 Where to find trader addresses:");
                eprintln!("   • Polymarket Leaderboard: https://polymarket.com/leaderboard");
                eprintln!("   • Predictfolio: https://predictfolio.com\n");
                eprintln!("Example: USER_ADDRESSES='0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'\n");
                return Err(AppError::ConfigurationError(
                    format!("Invalid Ethereum address in USER_ADDRESSES: {}", addr)
                ));
            }
        }
        Ok(addresses)
    }
}

/// Environment configuration structure
#[allow(dead_code)] // Some fields reserved for future use
pub struct EnvConfig {
    pub user_addresses: Vec<String>,
    pub proxy_wallet: String,
    pub private_key: String,
    pub clob_http_url: String,
    pub clob_ws_url: String,
    pub fetch_interval: u64,
    pub too_old_timestamp: i64,
    pub retry_limit: u32,
    pub copy_strategy_config: CopyStrategyConfig,
    pub request_timeout_ms: u64,
    pub network_retry_limit: u32,
    pub trade_aggregation_enabled: bool,
    pub trade_aggregation_window_seconds: u64,
    pub mongo_uri: String,
    pub rpc_url: String,
    pub usdc_contract_address: String,
}

/// Validate required environment variables
fn validate_required_env() -> Result<(), AppError> {
    let required = vec![
        "USER_ADDRESSES",
        "PROXY_WALLET",
        "PRIVATE_KEY",
        "CLOB_HTTP_URL",
        "CLOB_WS_URL",
        "MONGO_URI",
        "RPC_URL",
        "USDC_CONTRACT_ADDRESS",
    ];
    
    let missing: Vec<String> = required
        .into_iter()
        .filter(|key| env::var(key).is_err())
        .map(|s| s.to_string())
        .collect();
    
    if !missing.is_empty() {
        eprintln!("\n❌ Configuration Error: Missing required environment variables\n");
        eprintln!("Missing variables: {}\n", missing.join(", "));
        eprintln!("🔧 Quick fix:");
        eprintln!("   1. Create .env file with all required variables");
        eprintln!("   2. Or set environment variables before running\n");
        eprintln!("📖 See README.md for detailed instructions\n");
        return Err(AppError::ConfigurationError(
            format!("Missing required environment variables: {}", missing.join(", "))
        ));
    }
    
    Ok(())
}

/// Validate Ethereum addresses
fn validate_addresses() -> Result<(), AppError> {
    if let Ok(proxy_wallet) = env::var("PROXY_WALLET") {
        if !is_valid_ethereum_address(&proxy_wallet) {
            eprintln!("\n❌ Invalid Wallet Address\n");
            eprintln!("Your PROXY_WALLET: {}", proxy_wallet);
            eprintln!("Expected format:    0x followed by 40 hexadecimal characters\n");
            eprintln!("Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0\n");
            eprintln!("💡 Tips:");
            eprintln!("   • Copy your wallet address from MetaMask");
            eprintln!("   • Make sure it starts with 0x");
            eprintln!("   • Should be exactly 42 characters long\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid PROXY_WALLET address format: {}", proxy_wallet)
            ));
        }
    }
    
    if let Ok(usdc_contract) = env::var("USDC_CONTRACT_ADDRESS") {
        if !is_valid_ethereum_address(&usdc_contract) {
            eprintln!("\n❌ Invalid USDC Contract Address\n");
            eprintln!("Current value: {}", usdc_contract);
            eprintln!("Default value: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174\n");
            eprintln!("⚠️  Unless you know what you're doing, use the default value!\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid USDC_CONTRACT_ADDRESS format: {}", usdc_contract)
            ));
        }
    }
    
    Ok(())
}

/// Validate numeric configuration values
fn validate_numeric_config() -> Result<(), AppError> {
    if let Ok(fetch_interval_str) = env::var("FETCH_INTERVAL") {
        if let Ok(fetch_interval) = fetch_interval_str.parse::<u64>() {
            if fetch_interval <= 0 {
                return Err(AppError::ConfigurationError(
                    format!("Invalid FETCH_INTERVAL: {}. Must be a positive integer.", fetch_interval_str)
                ));
            }
        } else {
            return Err(AppError::ConfigurationError(
                format!("Invalid FETCH_INTERVAL: {}. Must be a positive integer.", fetch_interval_str)
            ));
        }
    }
    
    if let Ok(retry_limit_str) = env::var("RETRY_LIMIT") {
        if let Ok(retry_limit) = retry_limit_str.parse::<u32>() {
            if retry_limit < 1 || retry_limit > 10 {
                return Err(AppError::ConfigurationError(
                    format!("Invalid RETRY_LIMIT: {}. Must be between 1 and 10.", retry_limit_str)
                ));
            }
        } else {
            return Err(AppError::ConfigurationError(
                format!("Invalid RETRY_LIMIT: {}. Must be between 1 and 10.", retry_limit_str)
            ));
        }
    }
    
    if let Ok(too_old_str) = env::var("TOO_OLD_TIMESTAMP") {
        if let Ok(too_old) = too_old_str.parse::<i64>() {
            if too_old < 1 {
                return Err(AppError::ConfigurationError(
                    format!("Invalid TOO_OLD_TIMESTAMP: {}. Must be a positive integer (hours).", too_old_str)
                ));
            }
        } else {
            return Err(AppError::ConfigurationError(
                format!("Invalid TOO_OLD_TIMESTAMP: {}. Must be a positive integer (hours).", too_old_str)
            ));
        }
    }
    
    if let Ok(timeout_str) = env::var("REQUEST_TIMEOUT_MS") {
        if let Ok(timeout) = timeout_str.parse::<u64>() {
            if timeout < 1000 {
                return Err(AppError::ConfigurationError(
                    format!("Invalid REQUEST_TIMEOUT_MS: {}. Must be at least 1000ms.", timeout_str)
                ));
            }
        } else {
            return Err(AppError::ConfigurationError(
                format!("Invalid REQUEST_TIMEOUT_MS: {}. Must be at least 1000ms.", timeout_str)
            ));
        }
    }
    
    if let Ok(network_retry_str) = env::var("NETWORK_RETRY_LIMIT") {
        if let Ok(network_retry) = network_retry_str.parse::<u32>() {
            if network_retry < 1 || network_retry > 10 {
                return Err(AppError::ConfigurationError(
                    format!("Invalid NETWORK_RETRY_LIMIT: {}. Must be between 1 and 10.", network_retry_str)
                ));
            }
        } else {
            return Err(AppError::ConfigurationError(
                format!("Invalid NETWORK_RETRY_LIMIT: {}. Must be between 1 and 10.", network_retry_str)
            ));
        }
    }
    
    Ok(())
}

/// Validate URL formats
fn validate_urls() -> Result<(), AppError> {
    if let Ok(clob_http) = env::var("CLOB_HTTP_URL") {
        if !clob_http.starts_with("http") {
            eprintln!("\n❌ Invalid CLOB_HTTP_URL\n");
            eprintln!("Current value: {}", clob_http);
            eprintln!("Default value: https://clob.polymarket.com/\n");
            eprintln!("⚠️  Use the default value unless you have a specific reason to change it!\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid CLOB_HTTP_URL: {}. Must be a valid HTTP/HTTPS URL.", clob_http)
            ));
        }
    }
    
    if let Ok(clob_ws) = env::var("CLOB_WS_URL") {
        if !clob_ws.starts_with("ws") {
            eprintln!("\n❌ Invalid CLOB_WS_URL\n");
            eprintln!("Current value: {}", clob_ws);
            eprintln!("Default value: wss://ws-subscriptions-clob.polymarket.com/ws\n");
            eprintln!("⚠️  Use the default value unless you have a specific reason to change it!\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid CLOB_WS_URL: {}. Must be a valid WebSocket URL (ws:// or wss://).", clob_ws)
            ));
        }
    }
    
    if let Ok(rpc_url) = env::var("RPC_URL") {
        if !rpc_url.starts_with("http") {
            eprintln!("\n❌ Invalid RPC_URL\n");
            eprintln!("Current value: {}", rpc_url);
            eprintln!("Must start with: http:// or https://\n");
            eprintln!("💡 Get a free RPC endpoint from:");
            eprintln!("   • Infura:  https://infura.io");
            eprintln!("   • Alchemy: https://www.alchemy.com");
            eprintln!("   • Ankr:    https://www.ankr.com\n");
            eprintln!("Example: https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid RPC_URL: {}. Must be a valid HTTP/HTTPS URL.", rpc_url)
            ));
        }
    }
    
    if let Ok(mongo_uri) = env::var("MONGO_URI") {
        if !mongo_uri.starts_with("mongodb") {
            eprintln!("\n❌ Invalid MONGO_URI\n");
            eprintln!("Current value: {}", mongo_uri);
            eprintln!("Must start with: mongodb:// or mongodb+srv://\n");
            eprintln!("💡 Setup MongoDB Atlas (free):");
            eprintln!("   1. Visit https://www.mongodb.com/cloud/atlas/register");
            eprintln!("   2. Create a free cluster");
            eprintln!("   3. Create database user with password");
            eprintln!("   4. Whitelist IP: 0.0.0.0/0 (or your IP)");
            eprintln!("   5. Get connection string from \"Connect\" button\n");
            eprintln!("Example: mongodb+srv://username:password@cluster.mongodb.net/database\n");
            return Err(AppError::ConfigurationError(
                format!("Invalid MONGO_URI: {}. Must be a valid MongoDB connection string.", mongo_uri)
            ));
        }
    }
    
    Ok(())
}

impl EnvConfig {
    fn new() -> Result<Self, AppError> {
        // Run all validations
        validate_required_env()?;
        validate_addresses()?;
        validate_numeric_config()?;
        validate_urls()?;
        
        // Validate addresses
        let proxy_wallet = env::var("PROXY_WALLET").unwrap();
        let usdc_contract = env::var("USDC_CONTRACT_ADDRESS").unwrap();
        
        // Parse user addresses
        let user_addresses_str = env::var("USER_ADDRESSES").unwrap();
        let user_addresses = parse_user_addresses(&user_addresses_str)?;
        
        if user_addresses.is_empty() {
            return Err(AppError::ConfigurationError(
                "USER_ADDRESSES is empty".to_string()
            ));
        }
        
        // Parse numeric values with defaults
        let fetch_interval = env::var("FETCH_INTERVAL")
            .unwrap_or_else(|_| "1".to_string())
            .parse::<u64>()
            .unwrap_or(1);
        
        let too_old_timestamp = env::var("TOO_OLD_TIMESTAMP")
            .unwrap_or_else(|_| "24".to_string())
            .parse::<i64>()
            .unwrap_or(24);
        
        let retry_limit = env::var("RETRY_LIMIT")
            .unwrap_or_else(|_| "3".to_string())
            .parse::<u32>()
            .unwrap_or(3)
            .min(10)
            .max(1);
        
        let request_timeout_ms = env::var("REQUEST_TIMEOUT_MS")
            .unwrap_or_else(|_| "10000".to_string())
            .parse::<u64>()
            .unwrap_or(10000)
            .max(1000);
        
        let network_retry_limit = env::var("NETWORK_RETRY_LIMIT")
            .unwrap_or_else(|_| "3".to_string())
            .parse::<u32>()
            .unwrap_or(3)
            .min(10)
            .max(1);
        
        let trade_aggregation_enabled = env::var("TRADE_AGGREGATION_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .parse::<bool>()
            .unwrap_or(false);
        
        let trade_aggregation_window_seconds = env::var("TRADE_AGGREGATION_WINDOW_SECONDS")
            .unwrap_or_else(|_| "300".to_string())
            .parse::<u64>()
            .unwrap_or(300);
        
        // Parse copy strategy
        let copy_strategy_config = CopyStrategyConfig::from_env();
        
        Ok(Self {
            user_addresses,
            proxy_wallet,
            private_key: env::var("PRIVATE_KEY").unwrap(),
            clob_http_url: env::var("CLOB_HTTP_URL").unwrap(),
            clob_ws_url: env::var("CLOB_WS_URL").unwrap(),
            fetch_interval,
            too_old_timestamp,
            retry_limit,
            copy_strategy_config,
            request_timeout_ms,
            network_retry_limit,
            trade_aggregation_enabled,
            trade_aggregation_window_seconds,
            mongo_uri: env::var("MONGO_URI").unwrap(),
            rpc_url: env::var("RPC_URL").unwrap(),
            usdc_contract_address: usdc_contract,
        })
    }
}

// Global ENV instance
static mut ENV_INSTANCE: Option<EnvConfig> = None;
static INIT: std::sync::Once = std::sync::Once::new();

pub fn load_env() -> Result<(), Box<dyn std::error::Error>> {
    // Try to load .env file (ignore if not found)
    dotenv().ok();
    
    unsafe {
        INIT.call_once(|| {
            ENV_INSTANCE = Some(EnvConfig::new().expect("Failed to initialize ENV"));
        });
    }
    
    Ok(())
}

#[allow(dead_code)] // Reserved for future use
pub fn get_env(key: &str) -> String {
    env::var(key).unwrap_or_else(|_| {
        panic!("Environment variable {} is not set", key)
    })
}

pub fn get_env_or_default(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

// Accessor for ENV
#[allow(non_snake_case)] // Intentionally UPPER_CASE to match TypeScript ENV naming
#[allow(non_snake_case)] // Intentionally UPPER_CASE to match TypeScript ENV naming
#[allow(static_mut_refs)] // Safe: ENV_INSTANCE is only accessed after initialization
pub fn ENV() -> &'static EnvConfig {
    unsafe {
        ENV_INSTANCE.as_ref().expect("ENV not initialized. Call load_env() first.")
    }
}
