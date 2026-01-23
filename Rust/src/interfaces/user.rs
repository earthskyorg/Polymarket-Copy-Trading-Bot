// User interface definitions

use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Reserved for future use
pub struct User {
    pub address: String,
    pub name: Option<String>,
}

/// Trade side type
pub type TradeSide = String; // "BUY" | "SELL"

/// Activity type
pub type ActivityType = String; // "TRADE" | "REDEEM" | "MERGE"

/// User activity interface representing a trade or activity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserActivityInterface {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub _id: Option<ObjectId>,
    #[serde(rename = "proxyWallet", default)]
    pub proxy_wallet: String,
    pub timestamp: i64,
    #[serde(rename = "conditionId", default)]
    pub condition_id: String,
    #[serde(rename = "type", default)]
    pub r#type: ActivityType,
    #[serde(default)]
    pub size: f64,
    #[serde(rename = "usdcSize", default)]
    pub usdc_size: f64,
    #[serde(rename = "transactionHash", default)]
    pub transaction_hash: String,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub asset: String,
    #[serde(default)]
    pub side: TradeSide,
    #[serde(rename = "outcomeIndex", default)]
    pub outcome_index: i32,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub slug: String,
    #[serde(default)]
    pub icon: String,
    #[serde(rename = "eventSlug", default)]
    pub event_slug: String,
    #[serde(default)]
    pub outcome: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub pseudonym: String,
    #[serde(default)]
    pub bio: String,
    #[serde(rename = "profileImage", default)]
    pub profile_image: String,
    #[serde(rename = "profileImageOptimized", default)]
    pub profile_image_optimized: String,
    #[serde(default)]
    pub bot: bool,
    #[serde(rename = "botExcutedTime", default)]
    pub bot_excuted_time: i64,
    /// Tracks actual tokens we bought for this trade
    #[serde(rename = "myBoughtSize", default)]
    pub my_bought_size: Option<f64>,
}

/// User position interface representing an open position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPositionInterface {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub _id: Option<ObjectId>,
    #[serde(rename = "proxyWallet", default)]
    pub proxy_wallet: String,
    #[serde(default)]
    pub asset: String,
    #[serde(rename = "conditionId", default)]
    pub condition_id: String,
    #[serde(default)]
    pub size: f64,
    #[serde(rename = "avgPrice", default)]
    pub avg_price: f64,
    #[serde(rename = "initialValue", default)]
    pub initial_value: f64,
    #[serde(rename = "currentValue", default)]
    pub current_value: f64,
    #[serde(rename = "cashPnl", default)]
    pub cash_pnl: f64,
    #[serde(rename = "percentPnl", default)]
    pub percent_pnl: f64,
    #[serde(rename = "totalBought", default)]
    pub total_bought: f64,
    #[serde(rename = "realizedPnl", default)]
    pub realized_pnl: f64,
    #[serde(rename = "percentRealizedPnl", default)]
    pub percent_realized_pnl: f64,
    #[serde(rename = "curPrice", default)]
    pub cur_price: f64,
    #[serde(default)]
    pub redeemable: bool,
    #[serde(default)]
    pub mergeable: bool,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub slug: String,
    #[serde(default)]
    pub icon: String,
    #[serde(rename = "eventSlug", default)]
    pub event_slug: String,
    #[serde(default)]
    pub outcome: String,
    #[serde(rename = "outcomeIndex", default)]
    pub outcome_index: i32,
    #[serde(rename = "oppositeOutcome", default)]
    pub opposite_outcome: String,
    #[serde(rename = "oppositeAsset", default)]
    pub opposite_asset: String,
    #[serde(rename = "endDate", default)]
    pub end_date: String,
    #[serde(rename = "negativeRisk", default)]
    pub negative_risk: bool,
}

/// Order book entry interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Reserved for CLOB client implementation
pub struct OrderBookEntry {
    pub price: String,
    pub size: String,
}

/// Order book interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Reserved for CLOB client implementation
pub struct OrderBook {
    pub bids: Vec<OrderBookEntry>,
    pub asks: Vec<OrderBookEntry>,
}

/// Position summary for display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Reserved for future display features
pub struct PositionSummary {
    pub title: String,
    pub outcome: String,
    pub current_value: f64,
    pub percent_pnl: f64,
    pub avg_price: f64,
    pub cur_price: f64,
}
