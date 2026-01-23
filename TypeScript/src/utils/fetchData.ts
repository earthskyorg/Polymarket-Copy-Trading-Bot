import axios, { AxiosError } from 'axios';
import { ENV } from '../config/env';
import { NetworkError, normalizeError } from './errors';
import { RETRY_CONFIG, TIME_CONSTANTS } from './constants';

/**
 * Sleep utility function
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if error is a network-related error
 * @param error - Error to check
 * @returns True if network error
 */
const isNetworkError = (error: unknown): boolean => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const code = axiosError.code;
        // Network timeout/connection errors
        return (
            code === 'ETIMEDOUT' ||
            code === 'ENETUNREACH' ||
            code === 'ECONNRESET' ||
            code === 'ECONNREFUSED' ||
            !axiosError.response
        ); // No response = network issue
    }
    return false;
};

/**
 * Fetch data from URL with retry logic and error handling
 * @param url - URL to fetch
 * @returns Promise resolving to response data
 * @throws NetworkError if all retries fail
 */
const fetchData = async <T = unknown>(url: string): Promise<T> => {
    const retries = ENV.NETWORK_RETRY_LIMIT;
    const timeout = ENV.REQUEST_TIMEOUT_MS;
    const retryDelay = RETRY_CONFIG.DEFAULT_RETRY_DELAY;

    // Validate URL
    if (!url || typeof url !== 'string') {
        throw new NetworkError('Invalid URL provided', undefined, url);
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get<T>(url, {
                timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                // Force IPv4 to avoid IPv6 connectivity issues
                family: 4,
            });
            return response.data;
        } catch (error) {
            lastError = error;
            const isLastAttempt = attempt === retries;

            if (isNetworkError(error) && !isLastAttempt) {
                const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
                console.warn(
                    `⚠️  Network error (attempt ${attempt}/${retries}), retrying in ${delay / TIME_CONSTANTS.SECOND_MS}s...`
                );
                await sleep(delay);
                continue;
            }

            // If it's the last attempt or not a network error, throw
            if (isLastAttempt) {
                if (isNetworkError(error)) {
                    const errorCode = axios.isAxiosError(error) ? error.code : 'UNKNOWN';
                    throw new NetworkError(
                        `Network timeout after ${retries} attempts - ${errorCode}`,
                        error,
                        url
                    );
                }
                // Non-network error on last attempt
                throw normalizeError(error);
            }
        }
    }

    // This should never be reached, but TypeScript needs it
    throw normalizeError(lastError);
};

export default fetchData;
