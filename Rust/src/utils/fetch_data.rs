// Data fetching utilities

use reqwest::Client;
use serde::de::DeserializeOwned;
use crate::config::env::ENV;
use crate::utils::constants::{RETRY_CONFIG, TIME_CONSTANTS};
use crate::utils::errors::AppError;

/// Check if error is a network-related error
fn is_network_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || 
    error.is_connect() || 
    error.is_request()
}

/// Fetch data from URL with retry logic and error handling
pub async fn fetch_data<T: DeserializeOwned>(url: &str) -> Result<T, Box<dyn std::error::Error>> {
    let retries = ENV().network_retry_limit;
    let timeout_ms = ENV().request_timeout_ms;
    let retry_delay = RETRY_CONFIG::DEFAULT_RETRY_DELAY;
    
    // Validate URL
    if url.is_empty() {
        return Err(AppError::NetworkError("Invalid URL provided".to_string()).into());
    }
    
    let client = Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;
    
    let last_error: Option<reqwest::Error> = None;
    
    for attempt in 1..=retries {
        match client.get(url).send().await {
            Ok(response) => {
                // Check status code
                let status = response.status();
                if !status.is_success() {
                    let error_msg = format!("HTTP {}: {}", status, status.canonical_reason().unwrap_or("Unknown"));
                    if attempt == retries {
                        return Err(AppError::NetworkError(error_msg).into());
                    }
                    continue;
                }
                
                // Try to get response text first for debugging
                match response.text().await {
                    Ok(text) => {
                        // Handle empty responses - treat as empty array for Vec types
                        let trimmed = text.trim();
                        if trimmed.is_empty() || trimmed == "null" {
                            // For Vec types, return empty vec
                            if std::any::type_name::<T>().contains("Vec") {
                                // Try to deserialize empty array
                                if let Ok(empty_vec) = serde_json::from_str::<T>("[]") {
                                    return Ok(empty_vec);
                                }
                            }
                            return Err("Empty or null response from API".into());
                        }
                        
                        // Try to parse as JSON
                        match serde_json::from_str::<T>(trimmed) {
                            Ok(data) => return Ok(data),
                            Err(e) => {
                                // For Vec types, if parsing fails, try to see if it's an empty array
                                if std::any::type_name::<T>().contains("Vec") && trimmed == "[]" {
                                    if let Ok(empty_vec) = serde_json::from_str::<T>("[]") {
                                        return Ok(empty_vec);
                                    }
                                }
                                
                                // Log first 200 chars of response for debugging (only on last attempt)
                                if attempt == retries {
                                    let preview = if trimmed.len() > 200 {
                                        format!("{}...", &trimmed[..200])
                                    } else {
                                        trimmed.to_string()
                                    };
                                    log::warn!("Failed to parse JSON. Response preview: {}", preview);
                                }
                                
                                let error_msg = format!("Failed to parse response: {}", e);
                                if attempt == retries {
                                    return Err(error_msg.into());
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = e.to_string();
                        if attempt == retries {
                            return Err(format!("Failed to read response body: {}", error_msg).into());
                        }
                    }
                }
            }
            Err(ref e) => {
                let error_msg = e.to_string();
                let is_network_err = is_network_error(e);
                let is_last_attempt = attempt == retries;
                
                if is_network_err && !is_last_attempt {
                    let delay = retry_delay * 2_u64.pow(attempt - 1); // Exponential backoff
                    eprintln!(
                        "⚠️  Network error (attempt {}/{}), retrying in {}s...",
                        attempt,
                        retries,
                        delay / TIME_CONSTANTS::SECOND_MS
                    );
                    tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                    continue;
                }
                
                if is_last_attempt {
                    return Err(AppError::NetworkError(
                        format!("Network timeout after {} attempts - {}", retries, error_msg)
                    ).into());
                }
            }
        }
    }
    
    Err(format!("Failed after {} attempts: {:?}", retries, last_error).into())
}
