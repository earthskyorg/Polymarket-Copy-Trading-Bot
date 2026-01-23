import mongoose from 'mongoose';
import { ENV } from './env';
import chalk from 'chalk';
import { DatabaseError } from '../utils/errors';

const uri = ENV.MONGO_URI || 'mongodb://localhost:27017/polymarket_copytrading';

/**
 * Validate MongoDB connection string format
 */
const validateConnectionString = (uri: string): void => {
    if (!uri || typeof uri !== 'string') {
        throw new DatabaseError('MongoDB connection string is required');
    }

    // Check if it's a valid MongoDB URI format
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        throw new DatabaseError(
            'Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://'
        );
    }

    // For mongodb+srv, check if it has proper format
    if (uri.startsWith('mongodb+srv://')) {
        // Should have format: mongodb+srv://[username:password@]host[/database][?options]
        const srvPattern = /^mongodb\+srv:\/\/(?:([^:]+):([^@]+)@)?([^/]+)(?:\/([^?]+))?(?:\?(.+))?$/;
        if (!srvPattern.test(uri)) {
            throw new DatabaseError(
                'Invalid MongoDB Atlas connection string format. Expected: mongodb+srv://username:password@cluster.mongodb.net/database'
            );
        }
    }
};

/**
 * Get helpful error message based on error type
 */
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const errorCode = (error as any).code;

        // DNS resolution errors
        if (errorCode === 'ENOTFOUND' || errorMessage.includes('enotfound') || errorMessage.includes('querySrv')) {
            return `DNS resolution failed. Possible causes:
  • Invalid cluster hostname in connection string
  • Network connectivity issues
  • Firewall blocking DNS queries
  • Incorrect MongoDB Atlas connection string

💡 Troubleshooting:
  1. Verify your connection string format: mongodb+srv://username:password@cluster.mongodb.net/database
  2. Check if your cluster name is correct in MongoDB Atlas
  3. Ensure your network allows DNS queries
  4. Try using the standard connection string (mongodb://) instead of mongodb+srv://`;
        }

        // Authentication errors
        if (errorCode === 8000 || errorMessage.includes('authentication') || errorMessage.includes('auth failed')) {
            return `Authentication failed. Possible causes:
  • Incorrect username or password
  • Database user doesn't exist
  • Password contains special characters that need URL encoding

💡 Troubleshooting:
  1. Verify your username and password in MongoDB Atlas
  2. URL-encode special characters in password (e.g., @ becomes %40)
  3. Create a new database user if needed`;
        }

        // Network timeout errors
        if (errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
            return `Connection timeout. Possible causes:
  • IP address not whitelisted in MongoDB Atlas
  • Network firewall blocking connections
  • MongoDB Atlas cluster is paused or unavailable

💡 Troubleshooting:
  1. Whitelist your IP address in MongoDB Atlas Network Access (0.0.0.0/0 for all IPs)
  2. Check if your cluster is running in MongoDB Atlas
  3. Verify network connectivity`;
        }

        // Connection refused
        if (errorCode === 'ECONNREFUSED' || errorMessage.includes('connection refused')) {
            return `Connection refused. Possible causes:
  • MongoDB server is not running
  • Incorrect port number
  • Firewall blocking the connection

💡 Troubleshooting:
  1. Verify MongoDB server is running
  2. Check if port 27017 (or your custom port) is accessible
  3. For MongoDB Atlas, ensure your IP is whitelisted`;
        }
    }

    return 'Unknown connection error occurred';
};

/**
 * Connect to MongoDB database with retry logic
 * @throws DatabaseError if connection fails
 */
const connectDB = async (): Promise<void> => {
    // Validate connection string first
    try {
        validateConnectionString(uri);
    } catch (error) {
        console.log(chalk.red('✗'), 'MongoDB connection string validation failed:', error);
        throw error;
    }

    // Connection options for MongoDB Atlas
    const connectionOptions: mongoose.ConnectOptions = {
        serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
        socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
        connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
        retryWrites: true, // Enable retry writes
        retryReads: true, // Enable retry reads
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2, // Minimum number of connections in the pool
        // For MongoDB Atlas, these options help with connection stability
        ...(uri.startsWith('mongodb+srv://') && {
            // Additional options for SRV connections
            tls: true, // MongoDB Atlas requires TLS
            tlsAllowInvalidCertificates: false, // Don't allow invalid certificates
        }),
    };

    let retries = 3;
    let lastError: unknown;

    while (retries > 0) {
        try {
            console.log(chalk.blue('ℹ'), `Connecting to MongoDB... (${4 - retries}/3)`);
            await mongoose.connect(uri, connectionOptions);
            console.log(chalk.green('✓'), 'MongoDB connected successfully');
            return;
        } catch (error) {
            lastError = error;
            retries--;

            if (retries > 0) {
                const waitTime = (4 - retries) * 2000; // Exponential backoff: 2s, 4s, 6s
                console.log(
                    chalk.yellow('⚠'),
                    `Connection attempt failed. Retrying in ${waitTime / 1000} seconds... (${retries} attempts remaining)`
                );
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }

    // All retries failed
    const errorMessage = getErrorMessage(lastError);
    console.log(chalk.red('✗'), 'MongoDB connection failed after all retry attempts');
    console.log(chalk.red('✗'), 'Error details:', lastError);
    console.log(chalk.yellow('\n💡 Troubleshooting Information:'));
    console.log(chalk.yellow(errorMessage));
    console.log(chalk.yellow('\n📖 Connection String Format:'));
    console.log(chalk.yellow('   MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database'));
    console.log(chalk.yellow('   Local MongoDB: mongodb://localhost:27017/database'));
    console.log(chalk.yellow('\n🔗 MongoDB Atlas Setup Guide:'));
    console.log(chalk.yellow('   1. Visit: https://www.mongodb.com/cloud/atlas/register'));
    console.log(chalk.yellow('   2. Create a free cluster'));
    console.log(chalk.yellow('   3. Create database user with password'));
    console.log(chalk.yellow('   4. Whitelist IP: 0.0.0.0/0 (or your specific IP)'));
    console.log(chalk.yellow('   5. Get connection string from "Connect" button\n'));

    throw new DatabaseError('Failed to connect to MongoDB after retries', lastError);
};

/**
 * Close MongoDB connection gracefully
 * @throws DatabaseError if closing fails
 */
export const closeDB = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        console.log(chalk.green('✓'), 'MongoDB connection closed');
    } catch (error) {
        console.log(chalk.red('✗'), 'Error closing MongoDB connection:', error);
        throw new DatabaseError('Failed to close MongoDB connection', error);
    }
};

export default connectDB;
