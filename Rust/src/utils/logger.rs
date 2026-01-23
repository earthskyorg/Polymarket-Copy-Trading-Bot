// Logger utility

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use chrono::Local;

pub struct Logger;

impl Logger {
    fn get_logs_dir() -> PathBuf {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("logs")
    }
    
    fn get_log_file_name() -> PathBuf {
        let date = Local::now().format("%Y-%m-%d").to_string();
        Self::get_logs_dir().join(format!("bot-{}.log", date))
    }
    
    fn ensure_logs_dir() {
        let logs_dir = Self::get_logs_dir();
        if !logs_dir.exists() {
            let _ = fs::create_dir_all(&logs_dir);
        }
    }
    
    fn write_to_file(message: &str) {
        Self::ensure_logs_dir();
        let log_file = Self::get_log_file_name();
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
        {
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
            let log_entry = format!("[{}] {}\n", timestamp, message);
            let _ = file.write_all(log_entry.as_bytes());
        }
    }
    
    fn format_address(address: &str) -> String {
        if address.len() >= 10 {
            format!("{}...{}", &address[..6], &address[address.len()-4..])
        } else {
            address.to_string()
        }
    }
    
    fn mask_address(address: &str) -> String {
        if address.len() >= 10 {
            format!("{}****{}", &address[..6], &address[address.len()-4..])
        } else {
            "****".to_string()
        }
    }
    
    pub fn setup() {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Info)
            .init();
    }
    
    pub fn header(title: &str) {
        println!("\n{}", "━".repeat(70));
        println!("  {}", title);
        println!("{}\n", "━".repeat(70));
        Self::write_to_file(&format!("HEADER: {}", title));
    }
    
    pub fn info(message: &str) {
        println!("ℹ {}", message);
        Self::write_to_file(&format!("INFO: {}", message));
    }
    
    pub fn success(message: &str) {
        println!("✓ {}", message);
        Self::write_to_file(&format!("SUCCESS: {}", message));
    }
    
    pub fn warning(message: &str) {
        println!("⚠ {}", message);
        Self::write_to_file(&format!("WARNING: {}", message));
    }
    
    pub fn error(message: &str) {
        println!("✗ {}", message);
        Self::write_to_file(&format!("ERROR: {}", message));
    }
    
    pub fn separator() {
        println!("{}", "─".repeat(70));
    }
    
    pub fn startup(traders: &[String], my_wallet: &str) {
        println!("\n");
        println!("📊 Tracking Traders:");
        for (index, address) in traders.iter().enumerate() {
            println!("   {}. {}", index + 1, address);
        }
        println!("\n💼 Your Wallet:");
        println!("   {}\n", Self::mask_address(my_wallet));
    }
    
    pub fn db_connection(traders: &[String], counts: &[usize]) {
        println!("\n📦 Database Status:");
        for (index, address) in traders.iter().enumerate() {
            let count = counts.get(index).copied().unwrap_or(0);
            println!("   {}: {} trades", Self::format_address(address), count);
        }
        println!("");
    }
    
    pub fn waiting(trader_count: usize, extra_info: Option<&str>) {
        let timestamp = Local::now().format("%H:%M:%S").to_string();
        let message = if let Some(info) = extra_info {
            format!("⏳ Waiting for trades from {} trader(s)... ({})", trader_count, info)
        } else {
            format!("⏳ Waiting for trades from {} trader(s)...", trader_count)
        };
        print!("\r[{}] {}  ", timestamp, message);
        let _ = std::io::stdout().flush();
    }
    
    pub fn clear_line() {
        print!("\r{}", " ".repeat(100));
        print!("\r");
        let _ = std::io::stdout().flush();
    }
    
    pub fn trade(trader_address: &str, action: &str, details: &TradeDetails) {
        println!("\n{}", "─".repeat(70));
        println!("📊 NEW TRADE DETECTED");
        println!("Trader: {}", Self::format_address(trader_address));
        println!("Action: {}", action);
        if let Some(asset) = &details.asset {
            println!("Asset:  {}", Self::format_address(asset));
        }
        if let Some(side) = &details.side {
            println!("Side:   {}", side);
        }
        if let Some(amount) = details.amount {
            println!("Amount: ${:.2}", amount);
        }
        if let Some(price) = details.price {
            println!("Price:  {}", price);
        }
        if let Some(slug) = details.slug.as_ref().or(details.event_slug.as_ref()) {
            let market_url = format!("https://polymarket.com/event/{}", slug);
            println!("Market: {}", market_url);
        }
        if let Some(tx_hash) = &details.transaction_hash {
            let tx_url = format!("https://polygonscan.com/tx/{}", tx_hash);
            println!("TX:     {}", tx_url);
        }
        println!("{}\n", "─".repeat(70));
        
        let mut trade_log = format!("TRADE: {} - {}", Self::format_address(trader_address), action);
        if let Some(side) = &details.side {
            trade_log.push_str(&format!(" | Side: {}", side));
        }
        if let Some(amount) = details.amount {
            trade_log.push_str(&format!(" | Amount: ${:.2}", amount));
        }
        if let Some(price) = details.price {
            trade_log.push_str(&format!(" | Price: {}", price));
        }
        if let Some(title) = &details.title {
            trade_log.push_str(&format!(" | Market: {}", title));
        }
        if let Some(tx_hash) = &details.transaction_hash {
            trade_log.push_str(&format!(" | TX: {}", tx_hash));
        }
        Self::write_to_file(&trade_log);
    }
    
    pub fn balance(my_balance: f64, trader_balance: f64, trader_address: &str) {
        println!("Capital (USDC + Positions):");
        println!("  Your total capital:   ${:.2}", my_balance);
        println!("  Trader total capital: ${:.2} ({})", trader_balance, Self::format_address(trader_address));
    }
    
    #[allow(dead_code)] // Reserved for future order logging
    pub fn order_result(success: bool, message: &str) {
        if success {
            println!("✓ Order executed: {}", message);
            Self::write_to_file(&format!("ORDER SUCCESS: {}", message));
        } else {
            println!("✗ Order failed: {}", message);
            Self::write_to_file(&format!("ORDER FAILED: {}", message));
        }
    }
    
    pub fn log_health_check(result: &HealthCheckResult) {
        Self::separator();
        Self::header("🏥 HEALTH CHECK");
        Self::info(&format!("Overall Status: {}", if result.healthy { "✅ Healthy" } else { "❌ Unhealthy" }));
        
        if let Some((status, message)) = result.checks.get("database") {
            let icon = if status == "ok" { "✅" } else { "❌" };
            Self::info(&format!("Database: {} {}", icon, message));
        }
        
        if let Some((status, message)) = result.checks.get("rpc") {
            let icon = if status == "ok" { "✅" } else { "❌" };
            Self::info(&format!("RPC: {} {}", icon, message));
        }
        
        if let Some((status, message)) = result.checks.get("balance") {
            let icon = if status == "ok" { "✅" } else if status == "warning" { "⚠️" } else { "❌" };
            Self::info(&format!("Balance: {} {}", icon, message));
        }
        
        if let Some((status, message)) = result.checks.get("polymarketApi") {
            let icon = if status == "ok" { "✅" } else { "❌" };
            Self::info(&format!("Polymarket API: {} {}", icon, message));
        }
        
        Self::separator();
    }
    
    pub fn my_positions(
        wallet: &str,
        count: usize,
        top_positions: &[crate::interfaces::user::UserPositionInterface],
        overall_pnl: f64,
        total_value: f64,
        initial_value: f64,
        current_balance: f64,
    ) {
        println!("\n💼 YOUR POSITIONS");
        println!("   Wallet: {}", Self::format_address(wallet));
        println!("");
        
        let balance_str = format!("${:.2}", current_balance);
        let total_portfolio = current_balance + total_value;
        let portfolio_str = format!("${:.2}", total_portfolio);
        
        println!("   💰 Available Cash:    {}", balance_str);
        println!("   📊 Total Portfolio:   {}", portfolio_str);
        
        if count == 0 {
            println!("   No open positions");
        } else {
            let pnl_sign = if overall_pnl >= 0.0 { "+" } else { "" };
            let profit_str = format!("{}{:.1}%", pnl_sign, overall_pnl);
            let value_str = format!("${:.2}", total_value);
            let initial_str = format!("${:.2}", initial_value);
            
            println!("");
            println!("   📈 Open Positions:    {} position{}", count, if count > 1 { "s" } else { "" });
            println!("      Invested:          {}", initial_str);
            println!("      Current Value:     {}", value_str);
            println!("      Profit/Loss:       {}", profit_str);
            
            if !top_positions.is_empty() {
                println!("   🔝 Top Positions:");
                for pos in top_positions.iter().take(5) {
                    let pnl_sign = if pos.percent_pnl >= 0.0 { "+" } else { "" };
                    let title_short = if pos.title.len() > 45 {
                        format!("{}...", &pos.title[..45])
                    } else {
                        pos.title.clone()
                    };
                    println!("      • {} - {}", pos.outcome, title_short);
                    println!(
                        "        Value: ${:.2} | PnL: {}{:.1}%",
                        pos.current_value, pnl_sign, pos.percent_pnl
                    );
                    println!(
                        "        Bought @ {:.1}¢ | Current @ {:.1}¢",
                        pos.avg_price * 100.0,
                        pos.cur_price * 100.0
                    );
                }
            }
        }
        println!("");
    }
    
    pub fn traders_positions(
        traders: &[String],
        position_counts: &[usize],
        position_details: Option<&[Vec<crate::interfaces::user::UserPositionInterface>]>,
        profitabilities: Option<&[f64]>,
    ) {
        println!("\n📈 TRADERS YOU'RE COPYING");
        for (index, address) in traders.iter().enumerate() {
            let count = position_counts.get(index).copied().unwrap_or(0);
            let count_str = if count > 0 {
                format!("{} position{}", count, if count > 1 { "s" } else { "" })
            } else {
                "0 positions".to_string()
            };
            
            // Add profitability if available (like PythonVersion)
            let mut profit_str = String::new();
            if let Some(profits) = profitabilities {
                if let Some(&pnl) = profits.get(index) {
                    if count > 0 {
                        let pnl_sign = if pnl >= 0.0 { "+" } else { "" };
                        profit_str = format!(" | {}{:.1}%", pnl_sign, pnl);
                    }
                }
            }
            
            println!("   {}: {}{}", Self::format_address(address), count_str, profit_str);
            
            // Show position details if available (top 3 positions like PythonVersion)
            if let Some(details) = position_details {
                if let Some(positions) = details.get(index) {
                    for pos in positions.iter().take(3) {
                        let pnl_sign = if pos.percent_pnl >= 0.0 { "+" } else { "" };
                        // Truncate title to 40 characters like PythonVersion
                        let title_short = if pos.title.len() > 40 {
                            format!("{}...", &pos.title[..40])
                        } else {
                            pos.title.clone()
                        };
                        // Format: "Outcome - Title" (matching PythonVersion exactly)
                        println!("      • {} - {}", pos.outcome, title_short);
                        // Format: "Value: $X.XX | PnL: +/-X.X%" (matching PythonVersion exactly)
                        println!(
                            "        Value: ${:.2} | PnL: {}{:.1}%",
                            pos.current_value, pnl_sign, pos.percent_pnl
                        );
                        // Format: "Bought @ X.X¢ | Current @ X.X¢" (matching PythonVersion exactly)
                        println!(
                            "        Bought @ {:.1}¢ | Current @ {:.1}¢",
                            pos.avg_price * 100.0,
                            pos.cur_price * 100.0
                        );
                    }
                }
            }
        }
        println!("");
    }
}

#[derive(Default)]
pub struct TradeDetails {
    pub asset: Option<String>,
    pub side: Option<String>,
    pub amount: Option<f64>,
    pub price: Option<f64>,
    pub slug: Option<String>,
    pub event_slug: Option<String>,
    pub transaction_hash: Option<String>,
    pub title: Option<String>,
}

pub struct HealthCheckResult {
    pub healthy: bool,
    pub checks: std::collections::HashMap<String, (String, String)>, // (status, message)
}
