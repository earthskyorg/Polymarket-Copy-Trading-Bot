#!/usr/bin/env ts-node

/**
 * Interactive Setup Script for Polymarket Copy Trading Bot
 * Helps users create their .env file with guided prompts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

interface Config {
    USER_ADDRESSES: string;
    PROXY_WALLET: string;
    PRIVATE_KEY: string;
    MONGO_URI: string;
    RPC_URL: string;
    CLOB_HTTP_URL: string;
    CLOB_WS_URL: string;
    USDC_CONTRACT_ADDRESS: string;
    COPY_STRATEGY?: string;
    COPY_SIZE?: string;
    TRADE_MULTIPLIER?: string;
    MAX_ORDER_SIZE_USD?: string;
    MIN_ORDER_SIZE_USD?: string;
    FETCH_INTERVAL?: string;
    RETRY_LIMIT?: string;
    TRADE_AGGREGATION_ENABLED?: string;
}

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}

function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidPrivateKey(key: string): boolean {
    // With or without 0x prefix
    return /^(0x)?[a-fA-F0-9]{64}$/.test(key);
}

function printHeader() {
    console.clear();
    console.log(`${colors.cyan}${colors.bright}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('     🤖 POLYMARKET COPY TRADING BOT - SETUP WIZARD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${colors.reset}\n`);
    console.log(
        `${colors.yellow}This wizard will help you create your .env configuration file.${colors.reset}`
    );
    console.log(`${colors.yellow}Press Ctrl+C at any time to cancel.\n${colors.reset}`);
}

function printSection(title: string) {
    console.log(`\n${colors.blue}${colors.bright}━━━ ${title} ━━━${colors.reset}\n`);
}

async function setupUserAddresses(): Promise<string> {
    printSection('STEP 1: TRADERS TO COPY');
    console.log(`${colors.cyan}Find top traders on:${colors.reset}`);
    console.log('  • https://polymarket.com/leaderboard');
    console.log('  • https://predictfolio.com\n');

    console.log(`${colors.yellow}Tip: Look for traders with:${colors.reset}`);
    console.log('  • Positive P&L (green numbers)');
    console.log('  • Win rate above 55%');
    console.log('  • Recent trading activity\n');

    const addresses: string[] = [];
    let addingMore = true;

    while (addingMore) {
        const address = await question(
            `${colors.green}Enter trader wallet address ${addresses.length + 1} (or press Enter to finish): ${colors.reset}`
        );

        if (!address) {
            if (addresses.length === 0) {
                console.log(`${colors.red}✗ You must add at least one trader address!${colors.reset}\n`);
                continue;
            }
            addingMore = false;
            break;
        }

        if (!isValidEthereumAddress(address.toLowerCase())) {
            console.log(
                `${colors.red}✗ Invalid Ethereum address format. Should be 0x followed by 40 hex characters.${colors.reset}\n`
            );
            continue;
        }

        addresses.push(address.toLowerCase());
        console.log(`${colors.green}✓ Added: ${address}${colors.reset}\n`);
    }

    console.log(`\n${colors.green}✓ Total traders to copy: ${addresses.length}${colors.reset}`);
    return addresses.join(', ');
}

async function setupWallet(): Promise<{ wallet: string; privateKey: string }> {
    printSection('STEP 2: YOUR TRADING WALLET');
    console.log(`${colors.yellow}⚠️  IMPORTANT SECURITY TIPS:${colors.reset}`);
    console.log('  • Use a DEDICATED wallet for the bot');
    console.log('  • Never use your main wallet');
    console.log('  • Only keep trading capital in this wallet');
    console.log('  • Never share your private key!\n');

    let wallet = '';
    while (!wallet) {
        wallet = await question(
            `${colors.green}Enter your Polygon wallet address: ${colors.reset}`
        );

        if (!isValidEthereumAddress(wallet)) {
            console.log(`${colors.red}✗ Invalid wallet address format${colors.reset}\n`);
            wallet = '';
            continue;
        }
    }

    console.log(`${colors.green}✓ Wallet: ${wallet}${colors.reset}\n`);

    let privateKey = '';
    while (!privateKey) {
        privateKey = await question(
            `${colors.green}Enter your private key (without 0x prefix): ${colors.reset}`
        );

        if (!isValidPrivateKey(privateKey)) {
            console.log(`${colors.red}✗ Invalid private key format${colors.reset}\n`);
            privateKey = '';
            continue;
        }

        // Remove 0x prefix if present
        if (privateKey.startsWith('0x')) {
            privateKey = privateKey.slice(2);
        }
    }

    console.log(`${colors.green}✓ Private key saved${colors.reset}`);

    return { wallet, privateKey };
}

async function setupDatabase(): Promise<string> {
    printSection('STEP 3: DATABASE');
    console.log(`${colors.cyan}Free MongoDB Atlas:${colors.reset} https://www.mongodb.com/cloud/atlas/register\n`);
    console.log(`${colors.yellow}Setup steps:${colors.reset}`);
    console.log('  1. Create free account');
    console.log('  2. Create a cluster');
    console.log('  3. Create database user');
    console.log('  4. Whitelist IP: 0.0.0.0/0 (allow all)');
    console.log('  5. Get connection string\n');

    let mongoUri = '';
    while (!mongoUri) {
        mongoUri = await question(
            `${colors.green}Enter MongoDB connection string: ${colors.reset}`
        );

        if (!mongoUri.startsWith('mongodb')) {
            console.log(`${colors.red}✗ Invalid MongoDB URI. Should start with 'mongodb://' or 'mongodb+srv://'${colors.reset}\n`);
            mongoUri = '';
            continue;
        }
    }

    console.log(`${colors.green}✓ MongoDB URI saved${colors.reset}`);
    return mongoUri;
}

async function setupRPC(): Promise<string> {
    printSection('STEP 4: POLYGON RPC ENDPOINT');
    console.log(`${colors.cyan}Get free RPC endpoint from:${colors.reset}`);
    console.log('  • Infura: https://infura.io (recommended)');
    console.log('  • Alchemy: https://www.alchemy.com');
    console.log('  • Ankr: https://www.ankr.com\n');

    let rpcUrl = '';
    while (!rpcUrl) {
        rpcUrl = await question(
            `${colors.green}Enter Polygon RPC URL: ${colors.reset}`
        );

        if (!rpcUrl.startsWith('http')) {
            console.log(`${colors.red}✗ Invalid RPC URL. Should start with 'http://' or 'https://'${colors.reset}\n`);
            rpcUrl = '';
            continue;
        }
    }

    console.log(`${colors.green}✓ RPC URL saved${colors.reset}`);
    return rpcUrl;
}

async function setupStrategy(): Promise<{
    copyStrategy: string;
    copySize: string;
    tradeMultiplier: string;
}> {
    printSection('STEP 5: TRADING STRATEGY (OPTIONAL)');

    const useDefaults = await question(
        `${colors.green}Use default strategy settings? (Y/n): ${colors.reset}`
    );

    if (useDefaults.toLowerCase() === 'n' || useDefaults.toLowerCase() === 'no') {
        console.log(`\n${colors.cyan}Copy Strategy Options:${colors.reset}`);
        console.log('  1. PERCENTAGE - Copy as % of trader position (recommended)');
        console.log('  2. FIXED - Fixed dollar amount per trade');
        console.log('  3. ADAPTIVE - Adjust based on trade size\n');

        const strategyChoice = await question(
            `${colors.green}Choose strategy (1-3, default 1): ${colors.reset}`
        );

        let strategy = 'PERCENTAGE';
        if (strategyChoice === '2') strategy = 'FIXED';
        if (strategyChoice === '3') strategy = 'ADAPTIVE';

        const copySize = await question(
            `${colors.green}Copy size (% for PERCENTAGE, $ for FIXED, default 10.0): ${colors.reset}`
        );

        const multiplier = await question(
            `${colors.green}Trade multiplier (1.0 = normal, 2.0 = 2x aggressive, 0.5 = conservative, default 1.0): ${colors.reset}`
        );

        return {
            copyStrategy: strategy,
            copySize: copySize || '10.0',
            tradeMultiplier: multiplier || '1.0',
        };
    }

    console.log(`${colors.green}✓ Using default strategy: PERCENTAGE, 10%, 1.0x multiplier${colors.reset}`);
    return {
        copyStrategy: 'PERCENTAGE',
        copySize: '10.0',
        tradeMultiplier: '1.0',
    };
}

async function setupRiskLimits(): Promise<{ maxOrder: string; minOrder: string }> {
    printSection('STEP 6: RISK LIMITS (OPTIONAL)');

    const useDefaults = await question(
        `${colors.green}Use default risk limits? (Y/n): ${colors.reset}`
    );

    if (useDefaults.toLowerCase() === 'n' || useDefaults.toLowerCase() === 'no') {
        const maxOrder = await question(
            `${colors.green}Maximum order size in USD (default 100.0): ${colors.reset}`
        );
        const minOrder = await question(
            `${colors.green}Minimum order size in USD (default 1.0): ${colors.reset}`
        );

        return {
            maxOrder: maxOrder || '100.0',
            minOrder: minOrder || '1.0',
        };
    }

    console.log(`${colors.green}✓ Using default limits: Max $100, Min $1${colors.reset}`);
    return { maxOrder: '100.0', minOrder: '1.0' };
}

function generateEnvFile(config: Config): string {
    const content = `# ================================================================
# POLYMARKET COPY TRADING BOT - CONFIGURATION
# Generated by setup wizard on ${new Date().toLocaleString()}
# ================================================================

# ================================================================
# TRADERS TO COPY
# ================================================================
USER_ADDRESSES='${config.USER_ADDRESSES}'

# ================================================================
# YOUR WALLET
# ================================================================
PROXY_WALLET='${config.PROXY_WALLET}'
PRIVATE_KEY='${config.PRIVATE_KEY}'

# ================================================================
# DATABASE
# ================================================================
MONGO_URI='${config.MONGO_URI}'

# ================================================================
# BLOCKCHAIN RPC
# ================================================================
RPC_URL='${config.RPC_URL}'

# ================================================================
# POLYMARKET ENDPOINTS (DO NOT CHANGE)
# ================================================================
CLOB_HTTP_URL='${config.CLOB_HTTP_URL}'
CLOB_WS_URL='${config.CLOB_WS_URL}'
USDC_CONTRACT_ADDRESS='${config.USDC_CONTRACT_ADDRESS}'

# ================================================================
# TRADING STRATEGY
# ================================================================
COPY_STRATEGY='${config.COPY_STRATEGY}'
COPY_SIZE='${config.COPY_SIZE}'
TRADE_MULTIPLIER='${config.TRADE_MULTIPLIER}'

# ================================================================
# RISK LIMITS
# ================================================================
MAX_ORDER_SIZE_USD='${config.MAX_ORDER_SIZE_USD}'
MIN_ORDER_SIZE_USD='${config.MIN_ORDER_SIZE_USD}'

# ================================================================
# BOT BEHAVIOR
# ================================================================
FETCH_INTERVAL='${config.FETCH_INTERVAL || '1'}'
RETRY_LIMIT='${config.RETRY_LIMIT || '3'}'
TOO_OLD_TIMESTAMP='24'

# ================================================================
# TRADE AGGREGATION
# ================================================================
TRADE_AGGREGATION_ENABLED='${config.TRADE_AGGREGATION_ENABLED || 'false'}'
TRADE_AGGREGATION_WINDOW_SECONDS='300'

# ================================================================
# NETWORK SETTINGS
# ================================================================
REQUEST_TIMEOUT_MS='10000'
NETWORK_RETRY_LIMIT='3'
`;

    return content;
}

async function main() {
    printHeader();

    try {
        // Collect all configuration
        const userAddresses = await setupUserAddresses();
        const { wallet, privateKey } = await setupWallet();
        const mongoUri = await setupDatabase();
        const rpcUrl = await setupRPC();
        const strategy = await setupStrategy();
        const limits = await setupRiskLimits();

        // Build config object
        const config: Config = {
            USER_ADDRESSES: userAddresses,
            PROXY_WALLET: wallet,
            PRIVATE_KEY: privateKey,
            MONGO_URI: mongoUri,
            RPC_URL: rpcUrl,
            CLOB_HTTP_URL: 'https://clob.polymarket.com/',
            CLOB_WS_URL: 'wss://ws-subscriptions-clob.polymarket.com/ws',
            USDC_CONTRACT_ADDRESS: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            COPY_STRATEGY: strategy.copyStrategy,
            COPY_SIZE: strategy.copySize,
            TRADE_MULTIPLIER: strategy.tradeMultiplier,
            MAX_ORDER_SIZE_USD: limits.maxOrder,
            MIN_ORDER_SIZE_USD: limits.minOrder,
        };

        // Generate .env file
        printSection('CREATING CONFIGURATION FILE');
        const envContent = generateEnvFile(config);
        const envPath = path.join(process.cwd(), '.env');

        // Check if .env already exists
        if (fs.existsSync(envPath)) {
            const overwrite = await question(
                `${colors.yellow}⚠️  .env file already exists. Overwrite? (y/N): ${colors.reset}`
            );

            if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
                console.log(`\n${colors.yellow}Setup cancelled. Your existing .env file was not modified.${colors.reset}`);
                rl.close();
                return;
            }

            // Backup existing file
            const backupPath = path.join(process.cwd(), '.env.backup');
            fs.copyFileSync(envPath, backupPath);
            console.log(`${colors.green}✓ Backed up existing .env to .env.backup${colors.reset}`);
        }

        // Write .env file
        fs.writeFileSync(envPath, envContent);

        // Success!
        console.log(`\n${colors.green}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.green}${colors.bright}    ✓ SETUP COMPLETE!${colors.reset}`);
        console.log(`${colors.green}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

        console.log(`${colors.cyan}Configuration saved to: ${colors.reset}${envPath}\n`);

        console.log(`${colors.yellow}${colors.bright}📋 PRE-FLIGHT CHECKLIST:${colors.reset}\n`);
        console.log(`  ${colors.red}☐${colors.reset} Fund your wallet with USDC on Polygon`);
        console.log(`  ${colors.red}☐${colors.reset} Get POL (MATIC) for gas fees (~$5-10)`);
        console.log(`  ${colors.red}☐${colors.reset} Verify traders are actively trading`);
        console.log(`  ${colors.red}☐${colors.reset} Test MongoDB connection\n`);

        console.log(`${colors.yellow}${colors.bright}🚀 NEXT STEPS:${colors.reset}\n`);
        console.log(`  1. Review your .env file: ${colors.cyan}cat .env${colors.reset}`);
        console.log(`  2. Install dependencies:   ${colors.cyan}npm install${colors.reset}`);
        console.log(`  3. Build the bot:          ${colors.cyan}npm run build${colors.reset}`);
        console.log(`  4. Run health check:       ${colors.cyan}npm run health-check${colors.reset}`);
        console.log(`  5. Start trading:          ${colors.cyan}npm start${colors.reset}\n`);

        console.log(`${colors.yellow}${colors.bright}📖 DOCUMENTATION:${colors.reset}\n`);
        console.log(`  • Quick Start:  ${colors.cyan}docs/QUICK_START.md${colors.reset}`);
        console.log(`  • Full Guide:   ${colors.cyan}README.md${colors.reset}\n`);

        console.log(`${colors.red}${colors.bright}⚠️  REMEMBER:${colors.reset}`);
        console.log(`  • Start with small amounts to test`);
        console.log(`  • Monitor the bot regularly`);
        console.log(`  • Only trade what you can afford to lose\n`);

        console.log(`${colors.green}Happy trading! 🎉${colors.reset}\n`);
    } catch (error) {
        console.error(`\n${colors.red}Setup error: ${error}${colors.reset}`);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the setup wizard
main();

