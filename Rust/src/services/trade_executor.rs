// Trade execution service

use std::sync::atomic::{AtomicBool, Ordering};
use std::collections::HashMap;
use tokio::time::{sleep, Duration, Instant};
use mongodb::bson::doc;
use futures::stream::TryStreamExt;
use crate::config::env::ENV;
use crate::utils::logger::Logger;
use crate::utils::constants::{DB_FIELDS, TRADING_CONSTANTS};
use crate::utils::fetch_data::fetch_data;
use crate::utils::get_my_balance::get_my_balance;
use crate::models::user_history::get_user_activity_collection;
use crate::interfaces::user::{UserActivityInterface, UserPositionInterface};

// Placeholder for CLOB client type - will need proper implementation
pub type ClobClient = (); // TODO: Replace with actual CLOB client type

static IS_RUNNING: AtomicBool = AtomicBool::new(true);

/// Trade with user address attached
#[derive(Debug, Clone)]
struct TradeWithUser {
    trade: UserActivityInterface,
    user_address: String,
}

/// Aggregated trade structure
#[derive(Debug, Clone)]
#[allow(dead_code)] // event_slug reserved for future use
struct AggregatedTrade {
    user_address: String,
    condition_id: String,
    asset: String,
    side: String,
    slug: Option<String>,
    event_slug: Option<String>,
    trades: Vec<TradeWithUser>,
    total_usdc_size: f64,
    average_price: f64,
    first_trade_time: i64,
    last_trade_time: i64,
}

// Buffer for aggregating trades
static mut TRADE_AGGREGATION_BUFFER: Option<HashMap<String, AggregatedTrade>> = None;
static BUFFER_INIT: std::sync::Once = std::sync::Once::new();

#[allow(static_mut_refs)] // Safe: Buffer is only accessed after initialization via Once
fn get_aggregation_buffer() -> &'static mut HashMap<String, AggregatedTrade> {
    unsafe {
        BUFFER_INIT.call_once(|| {
            TRADE_AGGREGATION_BUFFER = Some(HashMap::new());
        });
        TRADE_AGGREGATION_BUFFER.as_mut().unwrap()
    }
}

/// Stop the trade executor gracefully
pub async fn stop_trade_executor() {
    IS_RUNNING.store(false, Ordering::SeqCst);
    Logger::info("Trade executor shutdown requested...");
}

/// Generate a unique key for trade aggregation
fn get_aggregation_key(trade: &TradeWithUser) -> String {
    format!("{}:{}:{}:{}", trade.user_address, trade.trade.condition_id, trade.trade.asset, trade.trade.side)
}

/// Add trade to aggregation buffer or update existing aggregation
fn add_to_aggregation_buffer(trade: TradeWithUser) {
    let buffer = get_aggregation_buffer();
    let key = get_aggregation_key(&trade);
    // PythonVersion uses milliseconds: int(time.time() * 1000)
    let now = chrono::Utc::now().timestamp_millis();
    
    let usdc_size = trade.trade.usdc_size;
    let price = trade.trade.price;
    
    if let Some(existing) = buffer.get_mut(&key) {
        // Update existing aggregation
        existing.trades.push(trade);
        existing.total_usdc_size += usdc_size;
        // Recalculate weighted average price
        let total_value: f64 = existing.trades.iter()
            .map(|t| t.trade.usdc_size * t.trade.price)
            .sum();
        existing.average_price = total_value / existing.total_usdc_size;
        existing.last_trade_time = now;
    } else {
        // Create new aggregation
        let slug_clone = trade.trade.slug.clone();
        let event_slug_clone = trade.trade.event_slug.clone();
        buffer.insert(key, AggregatedTrade {
            user_address: trade.user_address.clone(),
            condition_id: trade.trade.condition_id.clone(),
            asset: trade.trade.asset.clone(),
            side: trade.trade.side.clone(),
            slug: Some(slug_clone),
            event_slug: Some(event_slug_clone),
            trades: vec![trade],
            total_usdc_size: usdc_size,
            average_price: price,
            first_trade_time: now,
            last_trade_time: now,
        });
    }
}

/// Check buffer and return ready aggregated trades
fn get_ready_aggregated_trades() -> Vec<AggregatedTrade> {
    let buffer = get_aggregation_buffer();
    let mut ready = Vec::new();
    // PythonVersion uses milliseconds: int(time.time() * 1000)
    let now = chrono::Utc::now().timestamp_millis();
    let window_ms = ENV().trade_aggregation_window_seconds as i64 * 1000; // Convert to milliseconds
    let min_total_usd = TRADING_CONSTANTS::TRADE_AGGREGATION_MIN_TOTAL_USD;
    
    let mut to_remove = Vec::new();
    
    for (key, agg) in buffer.iter() {
        let time_elapsed = now - agg.first_trade_time;
        
        // Check if aggregation is ready (both now and first_trade_time are in milliseconds)
        if time_elapsed >= window_ms {
            if agg.total_usdc_size >= min_total_usd {
                // Aggregation meets minimum and window passed - ready to execute
                ready.push(agg.clone());
            } else {
                // Window passed but total too small - mark individual trades as skipped
                Logger::info(&format!(
                    "Trade aggregation for {} on {}: ${:.2} total from {} trades below minimum (${:.2}) - skipping",
                    agg.user_address,
                    agg.slug.as_ref().unwrap_or(&agg.asset),
                    agg.total_usdc_size,
                    agg.trades.len(),
                    min_total_usd
                ));
                
                // Mark all trades in this aggregation as processed
                // Note: This will be done asynchronously in the main loop
                // For now, just log that we're skipping them
            }
            to_remove.push(key.clone());
        }
    }
    
    // Remove processed aggregations
    for key in to_remove {
        buffer.remove(&key);
    }
    
    ready
}

/// Read unprocessed trades from database
async fn read_temp_trades() -> anyhow::Result<Vec<TradeWithUser>> {
    let mut all_trades = Vec::new();
    let user_addresses = ENV().user_addresses.clone();
    
    for address in &user_addresses {
        let collection = get_user_activity_collection(address.as_str());
        
        // Only get trades that haven't been processed yet
        let filter = doc! {
            "type": DB_FIELDS::TYPE_TRADE,
            DB_FIELDS::BOT_EXECUTED: false,
            DB_FIELDS::BOT_EXECUTED_TIME: 0
        };
        
        // Query documents
        let cursor = collection.find(filter).await?;
        let docs: Vec<mongodb::bson::Document> = cursor.try_collect().await?;
        
        // Convert documents to UserActivityInterface
        for doc in docs {
            match mongodb::bson::from_document::<UserActivityInterface>(doc) {
                Ok(activity) => {
                    all_trades.push(TradeWithUser {
                        trade: activity,
                        user_address: address.clone(),
                    });
                }
                Err(e) => {
                    // Silently skip documents that can't be deserialized
                    // This can happen if the document structure doesn't match
                    let _ = e; // Suppress unused variable warning
                }
            }
        }
    }
    
    Ok(all_trades)
}

/// Execute individual trades
async fn do_trading(clob_client: &ClobClient, trades: &[TradeWithUser]) -> anyhow::Result<()> {
    use crate::utils::post_order::post_order;
    use crate::utils::constants::POLYMARKET_API;
    use crate::config::env::ENV;
    
    for trade in trades {
        // Mark trade as being processed immediately (using _id like PythonVersion)
        let collection = get_user_activity_collection(&trade.user_address);
        if let Some(trade_id) = &trade.trade._id {
            let filter = doc! { "_id": trade_id };
            let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED_TIME: 1 } };
            let _ = collection.update_one(filter, update).await;
        }
        
        Logger::trade(
            &trade.user_address,
            &trade.trade.side,
            &crate::utils::logger::TradeDetails {
                asset: Some(trade.trade.asset.clone()),
                side: Some(trade.trade.side.clone()),
                amount: Some(trade.trade.usdc_size),
                price: Some(trade.trade.price),
                slug: Some(trade.trade.slug.clone()),
                event_slug: Some(trade.trade.event_slug.clone()),
                transaction_hash: Some(trade.trade.transaction_hash.clone()),
                title: Some(trade.trade.title.clone()),
            },
        );
        
        // Fetch positions for both wallets
        let proxy_wallet = ENV().proxy_wallet.clone();
        let my_positions_url = format!(
            "{}{}?user={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::POSITIONS_ENDPOINT,
            proxy_wallet
        );
        let user_positions_url = format!(
            "{}{}?user={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::POSITIONS_ENDPOINT,
            trade.user_address
        );
        
        let my_positions: Vec<UserPositionInterface> = fetch_data(&my_positions_url).await.unwrap_or_default();
        let user_positions: Vec<UserPositionInterface> = fetch_data(&user_positions_url).await.unwrap_or_default();
        
        let my_position = my_positions.iter()
            .find(|pos| pos.condition_id == trade.trade.condition_id);
        let user_position = user_positions.iter()
            .find(|pos| pos.condition_id == trade.trade.condition_id);
        
        // Get USDC balance
        let my_balance = get_my_balance(&proxy_wallet).await.unwrap_or(0.0);
        
        // Calculate trader's total portfolio value from positions
        let user_balance: f64 = user_positions.iter()
            .map(|pos| pos.current_value)
            .sum();
        
        Logger::balance(my_balance, user_balance, &trade.user_address);
        
        // Determine condition: buy, sell, or merge
        let condition = if trade.trade.side == DB_FIELDS::SIDE_BUY {
            "buy"
        } else if my_position.is_some() {
            "merge" // If we have a position and trader is selling, merge
        } else {
            "sell"
        };
        
        // Execute the trade
        if let Err(e) = post_order(
            clob_client,
            condition,
            my_position,
            user_position,
            &trade.trade,
            my_balance,
            user_balance,
            &trade.user_address,
        ).await {
            Logger::error(&format!("Error executing trade: {}", e));
        }
        
        Logger::separator();
    }
    
    Ok(())
}

/// Execute aggregated trades
async fn do_aggregated_trading(clob_client: &ClobClient, aggregated_trades: &[AggregatedTrade]) -> anyhow::Result<()> {
    use crate::utils::post_order::post_order;
    use crate::utils::constants::POLYMARKET_API;
    use crate::config::env::ENV;
    
    for agg in aggregated_trades {
        Logger::header(&format!("📊 AGGREGATED TRADE ({} trades combined)", agg.trades.len()));
        Logger::info(&format!("Market: {}", agg.slug.as_ref().unwrap_or(&agg.asset)));
        Logger::info(&format!("Side: {}", agg.side));
        Logger::info(&format!("Total volume: ${:.2}", agg.total_usdc_size));
        Logger::info(&format!("Average price: ${:.4}", agg.average_price));
        
        // Mark all individual trades as being processed (using _id like PythonVersion)
        for trade in &agg.trades {
            let collection = get_user_activity_collection(&trade.user_address);
            if let Some(trade_id) = &trade.trade._id {
                let filter = doc! { "_id": trade_id };
                let update = doc! { "$set": { DB_FIELDS::BOT_EXECUTED_TIME: 1 } };
                let _ = collection.update_one(filter, update).await;
            }
        }
        
        // Use first trade as template for aggregated trade
        let first_trade = &agg.trades[0];
        
        // Fetch positions
        let proxy_wallet = ENV().proxy_wallet.clone();
        let my_positions_url = format!(
            "{}{}?user={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::POSITIONS_ENDPOINT,
            proxy_wallet
        );
        let user_positions_url = format!(
            "{}{}?user={}",
            POLYMARKET_API::DATA_API_BASE,
            POLYMARKET_API::POSITIONS_ENDPOINT,
            agg.user_address
        );
        
        let my_positions: Vec<UserPositionInterface> = fetch_data(&my_positions_url).await.unwrap_or_default();
        let user_positions: Vec<UserPositionInterface> = fetch_data(&user_positions_url).await.unwrap_or_default();
        
        let my_position = my_positions.iter()
            .find(|pos| pos.condition_id == agg.condition_id);
        let user_position = user_positions.iter()
            .find(|pos| pos.condition_id == agg.condition_id);
        
        // Get balances
        let my_balance = get_my_balance(&proxy_wallet).await.unwrap_or(0.0);
        let user_balance: f64 = user_positions.iter()
            .map(|pos| pos.current_value)
            .sum();
        
        Logger::balance(my_balance, user_balance, &agg.user_address);
        
        // Create synthetic trade using aggregated values
        use mongodb::bson::oid::ObjectId;
        let synthetic_trade = UserActivityInterface {
            _id: first_trade.trade._id.or(Some(ObjectId::new())),
            proxy_wallet: first_trade.trade.proxy_wallet.clone(),
            timestamp: first_trade.trade.timestamp,
            condition_id: agg.condition_id.clone(),
            r#type: first_trade.trade.r#type.clone(),
            size: first_trade.trade.size,
            usdc_size: agg.total_usdc_size,
            transaction_hash: first_trade.trade.transaction_hash.clone(),
            price: agg.average_price,
            asset: agg.asset.clone(),
            side: agg.side.clone(),
            outcome_index: first_trade.trade.outcome_index,
            title: first_trade.trade.title.clone(),
            slug: first_trade.trade.slug.clone(),
            icon: first_trade.trade.icon.clone(),
            event_slug: first_trade.trade.event_slug.clone(),
            outcome: first_trade.trade.outcome.clone(),
            name: first_trade.trade.name.clone(),
            pseudonym: first_trade.trade.pseudonym.clone(),
            bio: first_trade.trade.bio.clone(),
            profile_image: first_trade.trade.profile_image.clone(),
            profile_image_optimized: first_trade.trade.profile_image_optimized.clone(),
            bot: false,
            bot_excuted_time: 0,
            my_bought_size: None,
        };
        
        // Determine condition
        let condition = if agg.side == DB_FIELDS::SIDE_BUY {
            "buy"
        } else if my_position.is_some() {
            "merge"
        } else {
            "sell"
        };
        
        // Execute aggregated trade
        if let Err(e) = post_order(
            clob_client,
            condition,
            my_position,
            user_position,
            &synthetic_trade,
            my_balance,
            user_balance,
            &agg.user_address,
        ).await {
            Logger::error(&format!("Error executing aggregated trade: {}", e));
        }
        
        Logger::separator();
    }
    
    Ok(())
}

/// Main trade executor function
/// Monitors database for new trades and executes them
pub async fn trade_executor(_clob_client: ClobClient) -> anyhow::Result<()> {
    let user_addresses = ENV().user_addresses.clone();
    Logger::success(&format!("Trade executor ready for {} trader(s)", user_addresses.len()));
    
    if ENV().trade_aggregation_enabled {
        Logger::info(&format!(
            "Trade aggregation enabled: {}s window, ${:.2} minimum",
            ENV().trade_aggregation_window_seconds,
            TRADING_CONSTANTS::TRADE_AGGREGATION_MIN_TOTAL_USD
        ));
    }
    
    let mut last_check = Instant::now();
    
    while IS_RUNNING.load(Ordering::SeqCst) {
        match read_temp_trades().await {
            Ok(trades) => {
                if ENV().trade_aggregation_enabled {
                    // Process with aggregation logic
                    if !trades.is_empty() {
                        Logger::clear_line();
                        Logger::info(&format!(
                            "📥 {} new trade{} detected",
                            trades.len(),
                            if trades.len() > 1 { "s" } else { "" }
                        ));
                        
                        // Separate trades into those to aggregate and those to execute immediately
                        let mut trades_to_aggregate = Vec::new();
                        let mut trades_to_execute = Vec::new();
                        
                        for trade in trades {
                            // Only aggregate BUY trades below minimum threshold
                            if trade.trade.side == DB_FIELDS::SIDE_BUY
                                && trade.trade.usdc_size < TRADING_CONSTANTS::TRADE_AGGREGATION_MIN_TOTAL_USD
                            {
                                let market_name = if !trade.trade.slug.is_empty() {
                                    trade.trade.slug.as_str()
                                } else {
                                    trade.trade.asset.as_str()
                                };
                                Logger::info(&format!(
                                    "Adding ${:.2} {} trade to aggregation buffer for {}",
                                    trade.trade.usdc_size,
                                    trade.trade.side,
                                    market_name
                                ));
                                trades_to_aggregate.push(trade);
                            } else {
                                trades_to_execute.push(trade);
                            }
                        }
                        
                        // Add to aggregation buffer
                        for trade in trades_to_aggregate {
                            add_to_aggregation_buffer(trade);
                        }
                        
                        // Execute large trades immediately (not aggregated)
                        if !trades_to_execute.is_empty() {
                            Logger::clear_line();
                            Logger::header("⚡ IMMEDIATE TRADE (above threshold)");
                            let _ = do_trading(&_clob_client, &trades_to_execute).await;
                        }
                        last_check = Instant::now();
                    }
                    
                    // Check for ready aggregated trades
                    let ready_aggregations = get_ready_aggregated_trades();
                    if !ready_aggregations.is_empty() {
                        Logger::clear_line();
                        Logger::header(&format!(
                            "⚡ {} AGGREGATED TRADE{} READY",
                            ready_aggregations.len(),
                            if ready_aggregations.len() > 1 { "S" } else { "" }
                        ));
                        let _ = do_aggregated_trading(&_clob_client, &ready_aggregations).await;
                        last_check = Instant::now();
                    }
                    
                    // Update waiting message
                    if ready_aggregations.is_empty() {
                        if last_check.elapsed().as_millis() > 300 {
                            let buffered_count = get_aggregation_buffer().len();
                            if buffered_count > 0 {
                                Logger::waiting(
                                    user_addresses.len(),
                                    Some(&format!("{} trade group(s) pending", buffered_count))
                                );
                            } else {
                                Logger::waiting(user_addresses.len(), None);
                            }
                            last_check = Instant::now();
                        }
                    }
                } else {
                    // Original non-aggregation logic
                    if !trades.is_empty() {
                        Logger::clear_line();
                        Logger::header(&format!(
                            "⚡ {} NEW TRADE{} TO COPY",
                            trades.len(),
                            if trades.len() > 1 { "S" } else { "" }
                        ));
                        let _ = do_trading(&_clob_client, &trades).await;
                        last_check = Instant::now();
                    } else {
                        // Update waiting message every 300ms for smooth animation
                        if last_check.elapsed().as_millis() > 300 {
                            Logger::waiting(user_addresses.len(), None);
                            last_check = Instant::now();
                        }
                    }
                }
            }
            Err(e) => {
                Logger::error(&format!("Error reading trades: {}", e));
            }
        }
        
        if !IS_RUNNING.load(Ordering::SeqCst) {
            break;
        }
        
        sleep(Duration::from_millis(300)).await; // 300ms polling interval
    }
    
    Logger::info("Trade executor stopped");
    Ok(())
}
