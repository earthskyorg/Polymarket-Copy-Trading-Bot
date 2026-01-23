// Trade monitoring service

use std::sync::atomic::{AtomicBool, Ordering};
use tokio::time::{sleep, Duration};
use mongodb::bson::doc;
use chrono::Utc;
use futures::stream::TryStreamExt;
use crate::config::env::ENV;
use crate::utils::logger::Logger;
use crate::utils::constants::{POLYMARKET_API, TIME_CONSTANTS, DB_FIELDS};
use crate::utils::fetch_data::fetch_data;
use crate::utils::get_my_balance::get_my_balance;
use crate::models::user_history::{get_user_activity_collection, get_user_position_collection};
use crate::interfaces::user::{UserActivityInterface, UserPositionInterface};

static IS_RUNNING: AtomicBool = AtomicBool::new(true);
static IS_FIRST_RUN: AtomicBool = AtomicBool::new(true);
static INIT_COMPLETED: AtomicBool = AtomicBool::new(false);

/// Stop the trade monitor gracefully
pub async fn stop_trade_monitor() {
    IS_RUNNING.store(false, Ordering::SeqCst);
    Logger::info("Trade monitor shutdown requested...");
}

/// Initialize trade monitor and display current status
pub async fn init() -> anyhow::Result<()> {
    let user_addresses = ENV().user_addresses.clone();
    let mut counts = Vec::new();
    
    for address in &user_addresses {
        let collection = get_user_activity_collection(address.as_str());
        let count = collection.count_documents(doc! {}).await?;
        counts.push(count as usize);
    }
    
    Logger::clear_line();
    Logger::db_connection(&user_addresses, &counts);
    
    // Show your own positions first
    let proxy_wallet = ENV().proxy_wallet.clone();
    match get_my_positions(&proxy_wallet).await {
        Ok(positions) => {
            let current_balance = get_my_balance(&proxy_wallet).await.unwrap_or_else(|_| 0.0);
            
            if !positions.is_empty() {
                // Calculate overall profitability
                let total_value: f64 = positions.iter().map(|p| p.current_value).sum();
                let initial_value: f64 = positions.iter().map(|p| p.initial_value).sum();
                let weighted_pnl: f64 = positions.iter()
                    .map(|p| p.current_value * p.percent_pnl)
                    .sum();
                let overall_pnl = if total_value > 0.0 { weighted_pnl / total_value } else { 0.0 };
                
                // Get top 5 positions by profitability
                let mut top_positions = positions.clone();
                top_positions.sort_by(|a, b| b.percent_pnl.partial_cmp(&a.percent_pnl).unwrap());
                top_positions.truncate(5);
                
                Logger::clear_line();
                Logger::my_positions(
                    &proxy_wallet,
                    positions.len(),
                    &top_positions,
                    overall_pnl,
                    total_value,
                    initial_value,
                    current_balance,
                );
            } else {
                Logger::clear_line();
                Logger::my_positions(&proxy_wallet, 0, &[], 0.0, 0.0, 0.0, current_balance);
            }
        }
        Err(e) => {
            let error_msg = e.to_string();
            Logger::error(&format!("Failed to fetch your positions: {}", error_msg));
        }
    }
    
    // Show current positions count with details for traders you're copying
    let mut position_counts = Vec::new();
    let mut position_details = Vec::new();
    let mut profitabilities = Vec::new();
    
    for address in &user_addresses {
        let position_collection = get_user_position_collection(address.as_str());
        // Fetch positions from database (like PythonVersion does)
        let mut positions: Vec<UserPositionInterface> = Vec::new();
        
        match position_collection.find(doc! {}).await {
            Ok(mut cursor) => {
                while let Ok(Some(doc)) = cursor.try_next().await {
                    // Convert MongoDB document to UserPositionInterface
                    // Note: MongoDB stores fields in camelCase, but our interface expects snake_case
                    // The serde rename attributes handle this conversion
                    match mongodb::bson::from_document::<UserPositionInterface>(doc) {
                        Ok(position) => positions.push(position),
                        Err(e) => {
                            // Silently skip documents that can't be deserialized
                            // This can happen if the document structure doesn't match
                            let _ = e; // Suppress unused variable warning
                        }
                    }
                }
            }
            Err(e) => {
                Logger::error(&format!("Error fetching positions from DB for {}...{}: {}", 
                    &address[..6.min(address.len())],
                    &address[address.len().saturating_sub(4)..],
                    e));
            }
        }
        
        position_counts.push(positions.len());
        
        // Calculate overall profitability (weighted average by current value)
        let total_value: f64 = positions.iter().map(|p| p.current_value).sum();
        let weighted_pnl: f64 = positions.iter()
            .map(|p| p.current_value * p.percent_pnl)
            .sum();
        let overall_pnl = if total_value > 0.0 { weighted_pnl / total_value } else { 0.0 };
        profitabilities.push(overall_pnl);
        
        // Get top 3 positions by profitability (PnL)
        let mut top_positions = positions.clone();
        top_positions.sort_by(|a, b| b.percent_pnl.partial_cmp(&a.percent_pnl).unwrap());
        top_positions.truncate(3);
        // Filter to only positions with proxyWallet (like PythonVersion)
        // Check if proxyWallet exists and is a non-empty string
        top_positions.retain(|p| {
            !p.proxy_wallet.is_empty() && p.proxy_wallet != "null" && p.proxy_wallet != "None"
        });
        position_details.push(top_positions);
    }
    
    Logger::clear_line();
    Logger::traders_positions(&user_addresses, &position_counts, Some(&position_details), Some(&profitabilities));
    
    Ok(())
}

/// Fetch positions for a user
async fn get_my_positions(address: &str) -> Result<Vec<UserPositionInterface>, Box<dyn std::error::Error>> {
    let url = format!(
        "{}{}?user={}",
        POLYMARKET_API::DATA_API_BASE,
        POLYMARKET_API::POSITIONS_ENDPOINT,
        address
    );
    fetch_data::<Vec<UserPositionInterface>>(&url).await
}

/// Fetch and process trade data from Polymarket API
async fn fetch_trade_data() -> anyhow::Result<()> {
    let user_addresses = ENV().user_addresses.clone();
    let too_old_timestamp = ENV().too_old_timestamp;
    // PythonVersion uses milliseconds: int((datetime.now() - timedelta(hours=TOO_OLD_TIMESTAMP)).timestamp() * 1000)
    let current_timestamp_ms = Utc::now().timestamp_millis();
    let cutoff_timestamp_ms = current_timestamp_ms - (too_old_timestamp * 3600 * 1000); // Convert hours to milliseconds
    
    for address in &user_addresses {
        let activity_collection = get_user_activity_collection(address.as_str());
        let position_collection = get_user_position_collection(address.as_str());
        
        // Fetch trade activities from Polymarket API
        let api_url = format!(
            "{}{}?user={}&type={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::ACTIVITY_ENDPOINT,
            address,
            DB_FIELDS::TYPE_TRADE
        );
        
        match fetch_data::<Vec<UserActivityInterface>>(&api_url).await {
            Ok(activities) => {
                if activities.is_empty() {
                    continue;
                }
                
                // Track seen transaction hashes in this batch to avoid processing duplicates
                let mut seen_hashes = std::collections::HashSet::new();
                
                // Process each activity
                for activity in activities {
                    // Skip if too old (activity.timestamp is in milliseconds from API)
                    if activity.timestamp < cutoff_timestamp_ms {
                        continue;
                    }
                    
                    // Skip if we've already seen this transaction hash in this batch
                    if !seen_hashes.insert(activity.transaction_hash.clone()) {
                        continue; // Duplicate in same API response
                    }
                    
                    // Check if this trade already exists in database
                    let filter = doc! {
                        "transactionHash": &activity.transaction_hash
                    };
                    
                    match activity_collection.find_one(filter.clone()).await {
                        Ok(Some(_)) => {
                            continue; // Already processed this trade
                        }
                        Ok(None) => {
                            // Trade doesn't exist, proceed to insert
                        }
                        Err(e) => {
                            Logger::error(&format!(
                                "Error checking for existing trade {}...{}: {}",
                                &address[..6.min(address.len())],
                                &address[address.len().saturating_sub(4)..],
                                e
                            ));
                            continue;
                        }
                    }
                    
                    // Save new trade to database
                    let new_activity = doc! {
                        "proxyWallet": &activity.proxy_wallet,
                        "timestamp": activity.timestamp,
                        "conditionId": &activity.condition_id,
                        "type": &activity.r#type,
                        "size": activity.size,
                        "usdcSize": activity.usdc_size,
                        "transactionHash": &activity.transaction_hash,
                        "price": activity.price,
                        "asset": &activity.asset,
                        "side": &activity.side,
                        "outcomeIndex": activity.outcome_index,
                        "title": &activity.title,
                        "slug": &activity.slug,
                        "icon": &activity.icon,
                        "eventSlug": &activity.event_slug,
                        "outcome": &activity.outcome,
                        "name": &activity.name,
                        "pseudonym": &activity.pseudonym,
                        "bio": &activity.bio,
                        "profileImage": &activity.profile_image,
                        "profileImageOptimized": &activity.profile_image_optimized,
                        "bot": false,
                        "botExcutedTime": 0,
                    };
                    
                    // Insert as document - MongoDB accepts Document directly
                    match activity_collection.insert_one(new_activity).await {
                        Ok(_) => {
                            Logger::info(&format!(
                                "New trade detected for {}...{}",
                                &address[..6.min(address.len())],
                                &address[address.len().saturating_sub(4)..]
                            ));
                        }
                        Err(e) => {
                            // If it's a duplicate key error, that's okay - trade already exists
                            let error_str = e.to_string();
                            if !error_str.contains("duplicate") && !error_str.contains("E11000") {
                                Logger::error(&format!(
                                    "Failed to save trade for {}...{}: {}",
                                    &address[..6.min(address.len())],
                                    &address[address.len().saturating_sub(4)..],
                                    e
                                ));
                            }
                            // Silently skip duplicates - they're already in the database
                        }
                    }
                }
            }
            Err(e) => {
                // Don't log errors for empty responses - this is normal if trader has no recent trades
                let error_str = e.to_string();
                if !error_str.contains("Empty response") && !error_str.contains("Failed to parse") {
                    Logger::error(&format!(
                        "Error fetching data for {}...{}: {}",
                        &address[..6.min(address.len())],
                        &address[address.len().saturating_sub(4)..],
                        e
                    ));
                }
            }
        }
        
        // Also fetch and update positions
        let positions_url = format!(
            "{}{}?user={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::POSITIONS_ENDPOINT,
            address
        );
        
        match fetch_data::<Vec<UserPositionInterface>>(&positions_url).await {
            Ok(positions) => {
                if !positions.is_empty() {
                    for position in positions {
                        let filter = doc! {
                            "asset": &position.asset,
                            "conditionId": &position.condition_id
                        };
                        
                        let update = doc! {
                            "$set": {
                                "proxyWallet": &position.proxy_wallet,
                                "asset": &position.asset,
                                "conditionId": &position.condition_id,
                                "size": position.size,
                                "avgPrice": position.avg_price,
                                "initialValue": position.initial_value,
                                "currentValue": position.current_value,
                                "cashPnl": position.cash_pnl,
                                "percentPnl": position.percent_pnl,
                                "totalBought": position.total_bought,
                                "realizedPnl": position.realized_pnl,
                                "percentRealizedPnl": position.percent_realized_pnl,
                                "curPrice": position.cur_price,
                                "redeemable": position.redeemable,
                                "mergeable": position.mergeable,
                                "title": &position.title,
                                "slug": &position.slug,
                                "icon": &position.icon,
                                "eventSlug": &position.event_slug,
                                "outcome": &position.outcome,
                                "outcomeIndex": position.outcome_index,
                                "oppositeOutcome": &position.opposite_outcome,
                                "oppositeAsset": &position.opposite_asset,
                                "endDate": &position.end_date,
                                "negativeRisk": position.negative_risk,
                            }
                        };
                        
                        // Use upsert=True like PythonVersion to create new positions if they don't exist
                        // MongoDB Rust driver doesn't support upsert in update_one, so we check first
                        match position_collection.find_one(filter.clone()).await {
                            Ok(Some(_)) => {
                                // Position exists, update it
                                let _ = position_collection.update_one(filter.clone(), update).await;
                            }
                            Ok(None) => {
                                // Position doesn't exist, insert it
                                let new_position = doc! {
                                    "proxyWallet": &position.proxy_wallet,
                                    "asset": &position.asset,
                                    "conditionId": &position.condition_id,
                                    "size": position.size,
                                    "avgPrice": position.avg_price,
                                    "initialValue": position.initial_value,
                                    "currentValue": position.current_value,
                                    "cashPnl": position.cash_pnl,
                                    "percentPnl": position.percent_pnl,
                                    "totalBought": position.total_bought,
                                    "realizedPnl": position.realized_pnl,
                                    "percentRealizedPnl": position.percent_realized_pnl,
                                    "curPrice": position.cur_price,
                                    "redeemable": position.redeemable,
                                    "mergeable": position.mergeable,
                                    "title": &position.title,
                                    "slug": &position.slug,
                                    "icon": &position.icon,
                                    "eventSlug": &position.event_slug,
                                    "outcome": &position.outcome,
                                    "outcomeIndex": position.outcome_index,
                                    "oppositeOutcome": &position.opposite_outcome,
                                    "oppositeAsset": &position.opposite_asset,
                                    "endDate": &position.end_date,
                                    "negativeRisk": position.negative_risk,
                                };
                                let _ = position_collection.insert_one(new_position).await;
                            }
                            Err(_) => {
                                // Error checking, skip this position
                            }
                        }
                    }
                }
            }
            Err(e) => {
                // Don't log errors for empty responses - this is normal if trader has no positions
                let error_str = e.to_string();
                if !error_str.contains("Empty response") && !error_str.contains("Failed to parse") {
                    Logger::error(&format!(
                        "Error fetching positions for {}...{}: {}",
                        &address[..6.min(address.len())],
                        &address[address.len().saturating_sub(4)..],
                        e
                    ));
                }
            }
        }
    }
    
    Ok(())
}

/// Main trade monitor function
/// Monitors traders for new trades and updates database
pub async fn trade_monitor() -> anyhow::Result<()> {
    // Initialize and display status (only if not already done)
    if !INIT_COMPLETED.swap(true, Ordering::SeqCst) {
        init().await?;
    }
    
    let user_addresses = ENV().user_addresses.clone();
    let fetch_interval = ENV().fetch_interval;
    
    Logger::success(&format!(
        "Monitoring {} trader(s) every {}s",
        user_addresses.len(),
        fetch_interval
    ));
    Logger::separator();
    
    // On first run, mark all existing historical trades as already processed
    if IS_FIRST_RUN.swap(false, Ordering::SeqCst) {
        Logger::info("First run: marking all historical trades as processed...");
        for address in &user_addresses {
            let collection = get_user_activity_collection(address);
            let filter = doc! { DB_FIELDS::BOT_EXECUTED: false };
            let update = doc! {
                "$set": {
                    DB_FIELDS::BOT_EXECUTED: true,
                    DB_FIELDS::BOT_EXECUTED_TIME: 999
                }
            };
            
            match collection.update_many(filter, update).await {
                Ok(result) => {
                    if result.modified_count > 0 {
                        Logger::info(&format!(
                            "Marked {} historical trades as processed for {}...{}",
                            result.modified_count,
                            &address[..6.min(address.len())],
                            &address[address.len().saturating_sub(4)..]
                        ));
                    }
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    Logger::error(&format!("Error marking historical trades: {}", error_msg));
                }
            }
        }
        Logger::success("\nHistorical trades processed. Now monitoring for new trades only.");
        Logger::separator();
    }
    
    let fetch_interval_ms = fetch_interval as u64 * TIME_CONSTANTS::SECOND_MS;
    
    while IS_RUNNING.load(Ordering::SeqCst) {
        if let Err(e) = fetch_trade_data().await {
            Logger::error(&format!("Error in fetch_trade_data: {}", e));
        }
        
        if !IS_RUNNING.load(Ordering::SeqCst) {
            break;
        }
        
        sleep(Duration::from_millis(fetch_interval_ms)).await;
    }
    
    Logger::info("Trade monitor stopped");
    Ok(())
}
