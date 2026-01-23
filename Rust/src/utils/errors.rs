// Error types for the application

use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)] // Error variants reserved for future error handling
pub enum AppError {
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Trading error: {0}")]
    TradingError(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Insufficient funds: {0}")]
    InsufficientFundsError(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

#[allow(dead_code)] // Reserved for future use
pub type AppResult<T> = Result<T, AppError>;

/// Normalized error structure
pub struct NormalizedError {
    pub message: String,
    pub stack: Option<String>,
}

/// Check if error is operational (can be recovered from)
#[allow(dead_code)] // Reserved for future error handling improvements
pub fn is_operational_error(_error: &AppError) -> bool {
    // For now, treat all errors as potentially recoverable
    true
}

/// Normalize any error into a standard format
pub fn normalize_error(error: &dyn std::error::Error) -> NormalizedError {
    NormalizedError {
        message: error.to_string(),
        stack: None, // Rust doesn't have stack traces by default
    }
}