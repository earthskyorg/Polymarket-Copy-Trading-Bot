// Copy strategy configuration

use serde::{Deserialize, Serialize};
use std::env;

/// Order size calculation result
#[derive(Debug, Clone)]
#[allow(dead_code)] // Fields are used in logging and future features
pub struct OrderSizeCalculation {
    pub trader_order_size: f64,
    pub base_amount: f64,
    pub final_amount: f64,
    pub strategy: CopyStrategy,
    pub capped_by_max: bool,
    pub reduced_by_balance: bool,
    pub below_minimum: bool,
    pub reasoning: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CopyStrategy {
    PERCENTAGE,
    FIXED,
    ADAPTIVE,
}

impl CopyStrategy {
    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "PERCENTAGE" => CopyStrategy::PERCENTAGE,
            "FIXED" => CopyStrategy::FIXED,
            "ADAPTIVE" => CopyStrategy::ADAPTIVE,
            _ => CopyStrategy::PERCENTAGE, // Default
        }
    }
}

pub struct CopyStrategyConfig {
    pub strategy: CopyStrategy,
    pub copy_size: f64,
    pub max_order_size_usd: f64,
    pub min_order_size_usd: f64,
}

impl CopyStrategyConfig {
    pub fn from_env() -> Self {
        use crate::config::env::get_env_or_default;
        
        // Support legacy COPY_PERCENTAGE + TRADE_MULTIPLIER for backward compatibility
        let has_legacy_config = env::var("COPY_PERCENTAGE").is_ok() && env::var("COPY_STRATEGY").is_err();
        
        if has_legacy_config {
            eprintln!("⚠️  Using legacy COPY_PERCENTAGE configuration. Consider migrating to COPY_STRATEGY.");
            let copy_percentage: f64 = get_env_or_default("COPY_PERCENTAGE", "10.0").parse().unwrap_or(10.0);
            let trade_multiplier: f64 = get_env_or_default("TRADE_MULTIPLIER", "1.0").parse().unwrap_or(1.0);
            let effective_percentage = copy_percentage * trade_multiplier;
            
            return Self {
                strategy: CopyStrategy::PERCENTAGE,
                copy_size: effective_percentage,
                max_order_size_usd: get_env_or_default("MAX_ORDER_SIZE_USD", "100.0").parse().unwrap_or(100.0),
                min_order_size_usd: get_env_or_default("MIN_ORDER_SIZE_USD", "1.0").parse().unwrap_or(1.0),
            };
        }
        
        // Parse new copy strategy configuration
        let strategy_str = get_env_or_default("COPY_STRATEGY", "PERCENTAGE");
        let strategy = CopyStrategy::from_str(&strategy_str);
        
        Self {
            strategy,
            copy_size: get_env_or_default("COPY_SIZE", "10.0").parse().unwrap_or(10.0),
            max_order_size_usd: get_env_or_default("MAX_ORDER_SIZE_USD", "100.0").parse().unwrap_or(100.0),
            min_order_size_usd: get_env_or_default("MIN_ORDER_SIZE_USD", "1.0").parse().unwrap_or(1.0),
        }
    }
    
    /// Calculate order size based on copy strategy
    pub fn calculate_order_size(
        &self,
        trader_order_size: f64,
        available_balance: f64,
        _current_position_size: f64,
    ) -> OrderSizeCalculation {
        use crate::utils::constants::TRADING_CONSTANTS;
        
        let (base_amount, mut reasoning) = match self.strategy {
            CopyStrategy::PERCENTAGE => {
                let amount = trader_order_size * (self.copy_size / 100.0);
                let reason = format!(
                    "{}% of trader's ${:.2} = ${:.2}",
                    self.copy_size, trader_order_size, amount
                );
                (amount, reason)
            }
            CopyStrategy::FIXED => {
                let reason = format!("Fixed amount: ${:.2}", self.copy_size);
                (self.copy_size, reason)
            }
            CopyStrategy::ADAPTIVE => {
                let adaptive_percent = self.calculate_adaptive_percent(trader_order_size);
                let amount = trader_order_size * (adaptive_percent / 100.0);
                let reason = format!(
                    "Adaptive {:.1}% of trader's ${:.2} = ${:.2}",
                    adaptive_percent, trader_order_size, amount
                );
                (amount, reason)
            }
        };
        
        // Apply multiplier (for now, just 1.0 - can be extended with tiered multipliers)
        let multiplier = get_trade_multiplier(self, trader_order_size);
        let mut final_amount = base_amount * multiplier;
        
        if multiplier != 1.0 {
            reasoning.push_str(&format!(
                " → {}x multiplier: ${:.2} → ${:.2}",
                multiplier, base_amount, final_amount
            ));
        }
        
        let mut capped_by_max = false;
        let mut reduced_by_balance = false;
        let mut below_minimum = false;
        
        // Apply maximum order size limit
        if final_amount > self.max_order_size_usd {
            final_amount = self.max_order_size_usd;
            capped_by_max = true;
            reasoning.push_str(&format!(" → Capped at max ${:.2}", self.max_order_size_usd));
        }
        
        // Check available balance (with 1% safety buffer)
        let max_affordable = available_balance * TRADING_CONSTANTS::BALANCE_SAFETY_BUFFER;
        if final_amount > max_affordable {
            final_amount = max_affordable;
            reduced_by_balance = true;
            reasoning.push_str(&format!(" → Reduced to fit balance (${:.2})", max_affordable));
        }
        
        // Check minimum order size
        if final_amount < self.min_order_size_usd {
            below_minimum = true;
            reasoning.push_str(&format!(" → Below minimum ${:.2}", self.min_order_size_usd));
            final_amount = 0.0; // Don't execute
        }
        
        OrderSizeCalculation {
            trader_order_size,
            base_amount,
            final_amount,
            strategy: self.strategy,
            capped_by_max,
            reduced_by_balance,
            below_minimum,
            reasoning,
        }
    }
    
    /// Calculate adaptive percentage based on trader's order size
    fn calculate_adaptive_percent(&self, _trader_order_size: f64) -> f64 {
        // For now, return copy_size (ADAPTIVE strategy needs more config)
        // TODO: Implement full adaptive logic with min/max percent and threshold
        self.copy_size
    }
}

/// Get trade multiplier (placeholder - can be extended with tiered multipliers)
pub fn get_trade_multiplier(_config: &CopyStrategyConfig, _trader_order_size: f64) -> f64 {
    // TODO: Implement tiered multipliers
    1.0
}
