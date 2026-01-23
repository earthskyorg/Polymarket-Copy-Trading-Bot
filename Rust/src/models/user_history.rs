// MongoDB models for user history
// Collections are created dynamically per wallet address: user_activities_{walletAddress} and user_positions_{walletAddress}

use mongodb::bson::{doc, oid::ObjectId};
use serde::{Deserialize, Serialize};
use crate::config::db::get_database;
use crate::interfaces::user::{UserActivityInterface, UserPositionInterface};

/// Get the activity collection for a specific wallet address
pub fn get_user_activity_collection(wallet_address: &str) -> mongodb::Collection<mongodb::bson::Document> {
    let collection_name = format!("user_activities_{}", wallet_address);
    get_database().collection(&collection_name)
}

/// Get the position collection for a specific wallet address
pub fn get_user_position_collection(wallet_address: &str) -> mongodb::Collection<mongodb::bson::Document> {
    let collection_name = format!("user_positions_{}", wallet_address);
    get_database().collection(&collection_name)
}

/// User Activity document - Tracks trade history and activities for each trader
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Used for MongoDB document storage
pub struct UserActivity {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(rename = "proxyWallet")]
    pub proxy_wallet: Option<String>,
    pub timestamp: i64, // Unix timestamp
    #[serde(rename = "conditionId")]
    pub condition_id: Option<String>,
    #[serde(rename = "type")]
    pub activity_type: String, // TRADE, REDEEM, MERGE
    pub size: Option<f64>,
    #[serde(rename = "usdcSize")]
    pub usdc_size: Option<f64>,
    #[serde(rename = "transactionHash")]
    pub transaction_hash: Option<String>,
    pub price: Option<f64>,
    pub asset: Option<String>,
    pub side: Option<String>, // BUY, SELL
    #[serde(rename = "outcomeIndex")]
    pub outcome_index: Option<i32>,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub icon: Option<String>,
    #[serde(rename = "eventSlug")]
    pub event_slug: Option<String>,
    pub outcome: Option<String>,
    pub name: Option<String>,
    pub pseudonym: Option<String>,
    pub bio: Option<String>,
    #[serde(rename = "profileImage")]
    pub profile_image: Option<String>,
    #[serde(rename = "profileImageOptimized")]
    pub profile_image_optimized: Option<String>,
    #[serde(default)]
    pub bot: bool,
    #[serde(rename = "botExcutedTime")]
    pub bot_executed_time: Option<i64>,
    #[serde(rename = "myBoughtSize")]
    pub my_bought_size: Option<f64>, // Tracks actual tokens we bought
}

impl From<UserActivityInterface> for UserActivity {
    fn from(activity: UserActivityInterface) -> Self {
        UserActivity {
            id: activity._id,
            proxy_wallet: Some(activity.proxy_wallet),
            timestamp: activity.timestamp,
            condition_id: Some(activity.condition_id),
            activity_type: activity.r#type,
            size: Some(activity.size),
            usdc_size: Some(activity.usdc_size),
            transaction_hash: Some(activity.transaction_hash),
            price: Some(activity.price),
            asset: Some(activity.asset),
            side: Some(activity.side),
            outcome_index: Some(activity.outcome_index),
            title: Some(activity.title),
            slug: Some(activity.slug),
            icon: Some(activity.icon),
            event_slug: Some(activity.event_slug),
            outcome: Some(activity.outcome),
            name: Some(activity.name),
            pseudonym: Some(activity.pseudonym),
            bio: Some(activity.bio),
            profile_image: Some(activity.profile_image),
            profile_image_optimized: Some(activity.profile_image_optimized),
            bot: activity.bot,
            bot_executed_time: Some(activity.bot_excuted_time),
            my_bought_size: activity.my_bought_size,
        }
    }
}

/// User Position document - Tracks open positions for each trader
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Used for MongoDB document storage
pub struct UserPosition {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    #[serde(rename = "proxyWallet")]
    pub proxy_wallet: Option<String>,
    pub asset: Option<String>,
    #[serde(rename = "conditionId")]
    pub condition_id: Option<String>,
    pub size: Option<f64>,
    #[serde(rename = "avgPrice")]
    pub avg_price: Option<f64>,
    #[serde(rename = "initialValue")]
    pub initial_value: Option<f64>,
    #[serde(rename = "currentValue")]
    pub current_value: Option<f64>,
    #[serde(rename = "cashPnl")]
    pub cash_pnl: Option<f64>,
    #[serde(rename = "percentPnl")]
    pub percent_pnl: Option<f64>,
    #[serde(rename = "totalBought")]
    pub total_bought: Option<f64>,
    #[serde(rename = "realizedPnl")]
    pub realized_pnl: Option<f64>,
    #[serde(rename = "percentRealizedPnl")]
    pub percent_realized_pnl: Option<f64>,
    #[serde(rename = "curPrice")]
    pub cur_price: Option<f64>,
    pub redeemable: Option<bool>,
    pub mergeable: Option<bool>,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub icon: Option<String>,
    #[serde(rename = "eventSlug")]
    pub event_slug: Option<String>,
    pub outcome: Option<String>,
    #[serde(rename = "outcomeIndex")]
    pub outcome_index: Option<i32>,
    #[serde(rename = "oppositeOutcome")]
    pub opposite_outcome: Option<String>,
    #[serde(rename = "oppositeAsset")]
    pub opposite_asset: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "negativeRisk")]
    pub negative_risk: Option<bool>,
}

impl From<UserPositionInterface> for UserPosition {
    fn from(position: UserPositionInterface) -> Self {
        UserPosition {
            id: position._id,
            proxy_wallet: Some(position.proxy_wallet),
            asset: Some(position.asset),
            condition_id: Some(position.condition_id),
            size: Some(position.size),
            avg_price: Some(position.avg_price),
            initial_value: Some(position.initial_value),
            current_value: Some(position.current_value),
            cash_pnl: Some(position.cash_pnl),
            percent_pnl: Some(position.percent_pnl),
            total_bought: Some(position.total_bought),
            realized_pnl: Some(position.realized_pnl),
            percent_realized_pnl: Some(position.percent_realized_pnl),
            cur_price: Some(position.cur_price),
            redeemable: Some(position.redeemable),
            mergeable: Some(position.mergeable),
            title: Some(position.title),
            slug: Some(position.slug),
            icon: Some(position.icon),
            event_slug: Some(position.event_slug),
            outcome: Some(position.outcome),
            outcome_index: Some(position.outcome_index),
            opposite_outcome: Some(position.opposite_outcome),
            opposite_asset: Some(position.opposite_asset),
            end_date: Some(position.end_date),
            negative_risk: Some(position.negative_risk),
        }
    }
}
