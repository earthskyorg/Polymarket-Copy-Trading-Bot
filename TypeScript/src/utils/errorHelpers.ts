/**
 * Extract error message from various error response formats
 *
 * @param response - Error response (can be string, object, or unknown)
 * @returns Extracted error message or undefined
 */
export const extractErrorMessage = (response: unknown): string | undefined => {
    if (!response) {
        return undefined;
    }

    if (typeof response === 'string') {
        return response;
    }

    if (typeof response === 'object') {
        const data = response as Record<string, unknown>;

        // Check direct error field
        const directError = data.error;
        if (typeof directError === 'string') {
            return directError;
        }

        // Check nested error object
        if (typeof directError === 'object' && directError !== null) {
            const nested = directError as Record<string, unknown>;
            if (typeof nested.error === 'string') {
                return nested.error;
            }
            if (typeof nested.message === 'string') {
                return nested.message;
            }
        }

        // Check alternative error fields
        if (typeof data.errorMsg === 'string') {
            return data.errorMsg;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }
    }

    return undefined;
};

/**
 * Check if error message indicates insufficient balance or allowance
 *
 * @param message - Error message to check
 * @returns True if error is related to balance/allowance
 */
export const isInsufficientBalanceOrAllowanceError = (message: string | undefined): boolean => {
    if (!message) {
        return false;
    }

    const lower = message.toLowerCase();
    return lower.includes('not enough balance') || lower.includes('allowance');
};

/**
 * Format error for logging
 *
 * @param error - Error object or message
 * @returns Formatted error message
 */
export const formatError = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return String(error);
};

/**
 * Get error stack trace if available
 *
 * @param error - Error object
 * @returns Stack trace or undefined
 */
export const getErrorStack = (error: unknown): string | undefined => {
    if (error instanceof Error && error.stack) {
        return error.stack;
    }
    return undefined;
};

