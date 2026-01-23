/**
 * Custom error classes for the Polymarket Copy Trading Bot
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        code: string,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Configuration error - thrown when environment variables or config are invalid
 */
export class ConfigurationError extends AppError {
    constructor(message: string) {
        super(message, 'CONFIG_ERROR', 500, true);
    }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends AppError {
    constructor(message: string, public readonly field?: string) {
        super(message, 'VALIDATION_ERROR', 400, true);
    }
}

/**
 * Network error - thrown when API calls fail
 */
export class NetworkError extends AppError {
    constructor(
        message: string,
        public readonly originalError?: unknown,
        public readonly url?: string
    ) {
        super(message, 'NETWORK_ERROR', 503, true);
    }
}

/**
 * Trading error - thrown when trade execution fails
 */
export class TradingError extends AppError {
    constructor(
        message: string,
        public readonly tradeId?: string,
        public readonly asset?: string
    ) {
        super(message, 'TRADING_ERROR', 500, true);
    }
}

/**
 * Database error - thrown when database operations fail
 */
export class DatabaseError extends AppError {
    constructor(message: string, public readonly originalError?: unknown) {
        super(message, 'DATABASE_ERROR', 500, true);
    }
}

/**
 * Insufficient funds error - thrown when balance is too low
 */
export class InsufficientFundsError extends AppError {
    constructor(message: string, public readonly requiredAmount?: number, public readonly availableAmount?: number) {
        super(message, 'INSUFFICIENT_FUNDS', 402, true);
    }
}

/**
 * Check if error is an operational error (expected error)
 */
export function isOperationalError(error: unknown): boolean {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
    }

    return new AppError(
        `Unknown error: ${String(error)}`,
        'UNKNOWN_ERROR',
        500,
        false
    );
}

