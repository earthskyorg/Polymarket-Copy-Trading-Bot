/**
 * Application-wide constants
 */

/**
 * Polymarket API endpoints
 */
export const POLYMARKET_API = {
    DATA_API_BASE: 'https://data-api.polymarket.com',
    ACTIVITY_ENDPOINT: '/activity',
    POSITIONS_ENDPOINT: '/positions',
} as const;

/**
 * Trading constants
 */
export const TRADING_CONSTANTS = {
    /** Minimum order size in USD for BUY orders */
    MIN_ORDER_SIZE_USD: 1.0,
    /** Minimum order size in tokens for SELL/MERGE orders */
    MIN_ORDER_SIZE_TOKENS: 1.0,
    /** Safety buffer for balance checks (1% reserved) */
    BALANCE_SAFETY_BUFFER: 0.99,
    /** Maximum price slippage tolerance (5 cents) */
    MAX_PRICE_SLIPPAGE: 0.05,
    /** Trade aggregation minimum total USD */
    TRADE_AGGREGATION_MIN_TOTAL_USD: 1.0,
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
    /** Default retry limit */
    DEFAULT_RETRY_LIMIT: 3,
    /** Maximum retry limit */
    MAX_RETRY_LIMIT: 10,
    /** Minimum retry limit */
    MIN_RETRY_LIMIT: 1,
    /** Default delay between retries (ms) */
    DEFAULT_RETRY_DELAY: 1000,
} as const;

/**
 * Time constants (in milliseconds)
 */
export const TIME_CONSTANTS = {
    /** One second in milliseconds */
    SECOND_MS: 1000,
    /** One minute in milliseconds */
    MINUTE_MS: 60 * 1000,
    /** One hour in milliseconds */
    HOUR_MS: 60 * 60 * 1000,
    /** One day in milliseconds */
    DAY_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * Database field names
 */
export const DB_FIELDS = {
    BOT_EXECUTED: 'bot',
    BOT_EXECUTED_TIME: 'botExcutedTime',
    MY_BOUGHT_SIZE: 'myBoughtSize',
    TRANSACTION_HASH: 'transactionHash',
    TYPE_TRADE: 'TRADE',
    SIDE_BUY: 'BUY',
    SIDE_SELL: 'SELL',
} as const;

/**
 * Logging constants
 */
export const LOG_CONSTANTS = {
    /** Logs directory name */
    LOGS_DIR: 'logs',
    /** Log file prefix */
    LOG_FILE_PREFIX: 'bot-',
    /** Maximum line length for console output */
    MAX_LINE_LENGTH: 70,
} as const;

