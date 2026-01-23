// Balance checking utilities

use crate::config::env::ENV;
use ethers::prelude::*;
use ethers::types::Address as EthersAddress;
use std::str::FromStr;

/// USDC ABI (minimal - just balanceOf function)
/// function balanceOf(address owner) view returns (uint256)
const USDC_ABI: &str = r#"[
    {
        "constant": true,
        "inputs": [{"name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
]"#;

/// Get USDC balance for an address
/// Uses ethers to call the USDC contract's balanceOf function
pub async fn get_my_balance(address: &str) -> Result<f64, Box<dyn std::error::Error>> {
    let rpc_url = &ENV().rpc_url;
    let usdc_address = &ENV().usdc_contract_address;
    
    // Parse addresses
    let usdc_contract_addr = EthersAddress::from_str(usdc_address)
        .map_err(|e| format!("Invalid USDC contract address: {}", e))?;
    let user_addr = EthersAddress::from_str(address)
        .map_err(|e| format!("Invalid user address: {}", e))?;
    
    // Create provider
    let provider = Provider::<Http>::try_from(rpc_url)
        .map_err(|e| format!("Failed to create provider: {}", e))?;
    let provider = std::sync::Arc::new(provider);
    
    // Parse ABI and create contract instance
    let abi: ethers::abi::Contract = serde_json::from_str(USDC_ABI)
        .map_err(|e| format!("Failed to parse USDC ABI: {}", e))?;
    let contract = Contract::new(usdc_contract_addr, abi, provider);
    
    // Call balanceOf function
    let balance: U256 = contract
        .method::<_, U256>("balanceOf", user_addr)?
        .call()
        .await
        .map_err(|e| format!("RPC call failed: {}", e))?;
    
    // USDC has 6 decimals, so divide by 10^6
    // Convert U256 to f64 (handle large numbers)
    let balance_usdc = if balance > U256::from(u128::MAX) {
        // For very large balances, convert via string
        let balance_str = balance.to_string();
        let balance_u128 = balance_str.parse::<u128>()
            .map_err(|_| "Failed to parse balance as u128")?;
        balance_u128 as f64 / 1_000_000.0
    } else {
        // Use as_u128() for normal balances
        balance.as_u128() as f64 / 1_000_000.0
    };
    
    Ok(balance_usdc)
}
