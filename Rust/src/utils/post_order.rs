// Order posting utilities

use crate::config::env::ENV;
use crate::utils::logger::Logger;
use crate::utils::constants::{TRADING_CONSTANTS, DB_FIELDS};
use mongodb::bson::doc;
use crate::interfaces::user::{UserActivityInterface, UserPositionInterface};
use crate::models::user_history::get_user_activity_collection;
use crate::services::create_clob_client::ClobClient;

const RETRY_LIMIT: u32 = 3;
const MIN_ORDER_SIZE_TOKENS: f64 = TRADING_CONSTANTS::MIN_ORDER_SIZE_TOKENS;

/// Post order to Polymarket based on trade condition
pub async fn post_order(
    _clob_client: &ClobClient,
    condition: &str, // "buy", "sell", or "merge"
    my_position: Option<&UserPositionInterface>,
    _user_position: Option<&UserPositionInterface>,
    trade: &UserActivityInterface,
    my_balance: f64,
    _user_balance: f64,
    user_address: &str,
) -> anyhow::Result<()> {
    let collection = get_user_activity_collection(user_address);
    let copy_strategy_config = &ENV().copy_strategy_config;
    
    if condition == "merge" {
        Logger::info("Executing MERGE strategy...");
        
        let my_pos = match my_position {
            Some(pos) => pos,
            None => {
                Logger::warning("No position to merge");
                let filter = doc! { "transactionHash": &trade.transaction_hash };
                let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED: true } };
                let _ = collection.update_one(filter, update).await;
                return Ok(());
            }
        };
        
        let remaining = my_pos.size;
        
        // Check minimum order size
        if remaining < MIN_ORDER_SIZE_TOKENS {
            Logger::warning(&format!(
                "Position size ({:.2} tokens) too small to merge - skipping",
                remaining
            ));
            let filter = doc! { "transactionHash": &trade.transaction_hash };
            let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED: true } };
            let _ = collection.update_one(filter, update).await;
            return Ok(());
        }
        
        let mut retry = 0;
        let mut abort_due_to_funds = false;
        
        while remaining > 0.0 && retry < RETRY_LIMIT {
            // TODO: Implement get_order_book and create_market_order
            // For now, this is a placeholder
            Logger::info("MERGE order execution - CLOB client methods need implementation");
            
            // Placeholder logic
            if retry >= RETRY_LIMIT - 1 {
                abort_due_to_funds = true;
                break;
            }
            retry += 1;
        }
        
        let filter = doc! { "transactionHash": &trade.transaction_hash };
        let update = if abort_due_to_funds {
            doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::BOT_EXECUTED_TIME: RETRY_LIMIT as i64
                }
            }
        } else if retry >= RETRY_LIMIT {
            doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::BOT_EXECUTED_TIME: retry as i64
                }
            }
        } else {
            doc! { "$set": { DB_FIELDS::BOT_EXECUTED: true } }
        };
        
        let _ = collection.update_one(filter, update).await;
        
    } else if condition == "buy" {
        Logger::info("Executing BUY strategy...");
        
        Logger::info(&format!("Your balance: ${:.2}", my_balance));
        Logger::info(&format!("Trader bought: ${:.2}", trade.usdc_size));
        
        // Get current position size for position limit checks
        let current_position_value = my_position
            .map(|pos| pos.size * pos.avg_price)
            .unwrap_or(0.0);
        
        // Use copy strategy to calculate order size
        let order_calc = copy_strategy_config.calculate_order_size(
            trade.usdc_size,
            my_balance,
            current_position_value,
        );
        
        // Log the calculation reasoning
        Logger::info(&format!("📊 {}", order_calc.reasoning));
        
        // Check if order should be executed
        if order_calc.final_amount == 0.0 {
            Logger::warning(&format!("❌ Cannot execute: {}", order_calc.reasoning));
            if order_calc.below_minimum {
                Logger::warning("💡 Increase COPY_SIZE or wait for larger trades");
            }
            let filter = doc! { "transactionHash": &trade.transaction_hash };
            let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED: true } };
            let _ = collection.update_one(filter, update).await;
            return Ok(());
        }
        
        let mut remaining = order_calc.final_amount;
        let mut retry = 0;
        let mut abort_due_to_funds = false;
        let total_bought_tokens = 0.0;
        
        while remaining > 0.0 && retry < RETRY_LIMIT {
            // TODO: Implement get_order_book and create_market_order
            // For now, this is a placeholder
            Logger::info(&format!("BUY order execution - ${:.2} remaining", remaining));
            
            // Placeholder: simulate order execution
            // In production, this would:
            // 1. Get order book from CLOB client
            // 2. Find best ask price
            // 3. Create market order
            // 4. Post order
            // 5. Update remaining and retry logic
            
            if retry >= RETRY_LIMIT - 1 {
                abort_due_to_funds = true;
                break;
            }
            retry += 1;
            remaining = 0.0; // Placeholder - would be updated based on actual execution
        }
        
        // Update trade status
        let filter = doc! { "transactionHash": &trade.transaction_hash };
        let update = if abort_due_to_funds {
            doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::BOT_EXECUTED_TIME: RETRY_LIMIT as i64
                }
            }
        } else if retry >= RETRY_LIMIT {
            doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::BOT_EXECUTED_TIME: retry as i64
                }
            }
        } else {
            doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::MY_BOUGHT_SIZE: total_bought_tokens
                }
            }
        };
        
        let _ = collection.update_one(filter, update).await;
        
    } else if condition == "sell" {
        Logger::info("Executing SELL strategy...");
        
        // TODO: Implement SELL strategy
        // Similar to BUY but in reverse
        // This would:
        // 1. Check if we have position to sell
        // 2. Calculate sell size based on copy strategy
        // 3. Get order book for best bid
        // 4. Execute sell order
        // 5. Update trade status
        
        let filter = doc! { "transactionHash": &trade.transaction_hash };
        let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED: true } };
        let _ = collection.update_one(filter, update).await;
    }
    
    Ok(())
}
