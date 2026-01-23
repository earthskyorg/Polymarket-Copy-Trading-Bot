import connectDB, { closeDB } from './config/db';
import { ENV } from './config/env';
import createClobClient from './utils/createClobClient';
import tradeExecutor, { stopTradeExecutor } from './services/tradeExecutor';
import tradeMonitor, { stopTradeMonitor } from './services/tradeMonitor';
import Logger from './utils/logger';
import { performHealthCheck, logHealthCheck } from './utils/healthCheck';
import { normalizeError, isOperationalError } from './utils/errors';

const USER_ADDRESSES = ENV.USER_ADDRESSES;
const PROXY_WALLET = ENV.PROXY_WALLET;

// Graceful shutdown handler
let isShuttingDown = false;

/**
 * Gracefully shutdown the application
 * @param signal - Signal that triggered shutdown
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
        Logger.warning('Shutdown already in progress, forcing exit...');
        process.exit(1);
    }

    isShuttingDown = true;
    Logger.separator();
    Logger.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
        // Stop services
        stopTradeMonitor();
        stopTradeExecutor();

        // Give services time to finish current operations
        Logger.info('Waiting for services to finish current operations...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Close database connection
        await closeDB();

        Logger.success('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        Logger.error(`Error during shutdown: ${error}`);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const error = normalizeError(reason);
    Logger.error(
        `Unhandled Rejection at: ${promise}, reason: ${error.message}${error.stack ? `\n${error.stack}` : ''}`
    );
    // Don't exit immediately for operational errors, let the application try to recover
    if (!isOperationalError(error)) {
        Logger.error('Non-operational error detected, shutting down...');
        gracefulShutdown('unhandledRejection').catch(() => {
            process.exit(1);
        });
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    Logger.error(`Uncaught Exception: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
    // Exit immediately for uncaught exceptions as the application is in an undefined state
    gracefulShutdown('uncaughtException').catch(() => {
        process.exit(1);
    });
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Main application entry point
 * Initializes database, CLOB client, and starts trade monitoring/execution
 */
export const main = async (): Promise<void> => {
    try {
        // Welcome message for first-time users
        const colors = {
            reset: '\x1b[0m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m',
        };
        
        console.log(`\n${colors.yellow}💡 First time running the bot?${colors.reset}`);
        console.log(`   Read the guide: ${colors.cyan}GETTING_STARTED.md${colors.reset}`);
        console.log(`   Run health check: ${colors.cyan}npm run health-check${colors.reset}\n`);
        
        await connectDB();
        Logger.startup(USER_ADDRESSES, PROXY_WALLET);

        // Perform initial health check
        Logger.info('Performing initial health check...');
        const healthResult = await performHealthCheck();
        logHealthCheck(healthResult);

        if (!healthResult.healthy) {
            Logger.warning('Health check failed, but continuing startup...');
        }

        Logger.info('Initializing CLOB client...');
        const clobClient = await createClobClient();
        Logger.success('CLOB client ready');

        Logger.separator();
        Logger.info('Starting trade monitor...');
        tradeMonitor();

        Logger.info('Starting trade executor...');
        tradeExecutor(clobClient);

    } catch (error) {
        const normalizedError = normalizeError(error);
        Logger.error(
            `Fatal error during startup: ${normalizedError.message}${normalizedError.stack ? `\n${normalizedError.stack}` : ''}`
        );
        await gracefulShutdown('startup-error');
    }
};

main();
