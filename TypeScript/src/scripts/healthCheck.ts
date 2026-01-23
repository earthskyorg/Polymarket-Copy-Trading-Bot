import * as dotenv from 'dotenv';
dotenv.config();

import connectDB, { closeDB } from '../config/db';
import { performHealthCheck, logHealthCheck } from '../utils/healthCheck';
import { ENV } from '../config/env';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function printHeader() {
    console.log(`\n${colors.cyan}${colors.bright}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('     🏥 POLYMARKET BOT - HEALTH CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${colors.reset}\n`);
}

function printRecommendations(result: any) {
    const issues: string[] = [];

    if (result.checks.database.status === 'error') {
        issues.push('❌ Database Connection Failed');
        console.log(`${colors.red}${colors.bright}\n📋 Database Issue:${colors.reset}`);
        console.log('   • Check your MONGO_URI in .env file');
        console.log('   • Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0)');
        console.log('   • Ensure database user has correct permissions');
        console.log('   • Test connection: https://www.mongodb.com/docs/atlas/troubleshoot-connection\n');
    }

    if (result.checks.rpc.status === 'error') {
        issues.push('❌ RPC Endpoint Failed');
        console.log(`${colors.red}${colors.bright}\n📋 RPC Issue:${colors.reset}`);
        console.log('   • Check your RPC_URL in .env file');
        console.log('   • Verify your API key is valid');
        console.log('   • Try alternative providers:');
        console.log('     - Infura: https://infura.io');
        console.log('     - Alchemy: https://www.alchemy.com\n');
    }

    if (result.checks.balance.status === 'error') {
        issues.push('❌ Zero USDC Balance');
        console.log(`${colors.red}${colors.bright}\n📋 Balance Issue:${colors.reset}`);
        console.log('   • Your wallet has no USDC to trade with');
        console.log('   • Bridge USDC to Polygon: https://wallet.polygon.technology/polygon/bridge/deposit');
        console.log('   • Or buy USDC on an exchange and withdraw to Polygon network');
        console.log('   • Also get POL (MATIC) for gas fees (~$5-10 worth)\n');
    } else if (result.checks.balance.status === 'warning') {
        console.log(`${colors.yellow}${colors.bright}\n⚠️  Low Balance Warning:${colors.reset}`);
        console.log(`   • Balance: $${result.checks.balance.balance?.toFixed(2) || '0.00'}`);
        console.log('   • Consider adding more USDC to avoid missing trades');
        console.log('   • Recommended minimum: $50-100 for active trading\n');
    }

    if (result.checks.polymarketApi.status === 'error') {
        issues.push('❌ Polymarket API Failed');
        console.log(`${colors.red}${colors.bright}\n📋 API Issue:${colors.reset}`);
        console.log('   • Polymarket API is not responding');
        console.log('   • Check your internet connection');
        console.log('   • Polymarket may be experiencing downtime');
        console.log('   • Check status: https://polymarket.com\n');
    }

    if (issues.length === 0) {
        console.log(`${colors.green}${colors.bright}\n🎉 All Systems Operational!${colors.reset}\n`);
        console.log(`${colors.cyan}You're ready to start trading:${colors.reset}`);
        console.log(`   ${colors.green}npm start${colors.reset}\n`);
    } else {
        console.log(`${colors.red}${colors.bright}\n⚠️  ${issues.length} Issue(s) Found${colors.reset}`);
        console.log(`\n${colors.yellow}Fix the issues above before starting the bot.${colors.reset}\n`);
    }
}

function printConfiguration() {
    console.log(`${colors.cyan}📊 Configuration Summary:${colors.reset}\n`);
    console.log(`   Trading Wallet: ${ENV.PROXY_WALLET.slice(0, 6)}...${ENV.PROXY_WALLET.slice(-4)}`);
    console.log(`   Tracking ${ENV.USER_ADDRESSES.length} trader(s):`);
    ENV.USER_ADDRESSES.forEach((addr, idx) => {
        console.log(`      ${idx + 1}. ${addr.slice(0, 6)}...${addr.slice(-4)}`);
    });
    console.log(`   Check Interval: ${ENV.FETCH_INTERVAL}s`);
    console.log(`   Trade Multiplier: ${ENV.TRADE_MULTIPLIER}x`);
    console.log('');
}

const main = async () => {
    try {
        printHeader();
        console.log(`${colors.yellow}⏳ Running diagnostic checks...${colors.reset}\n`);

        await connectDB();
        const result = await performHealthCheck();

        logHealthCheck(result);
        printConfiguration();
        printRecommendations(result);

        if (result.healthy) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (error) {
        console.error(`\n${colors.red}${colors.bright}❌ Health Check Error${colors.reset}\n`);
        if (error instanceof Error) {
            console.error(`${error.message}\n`);
            console.error(`${colors.yellow}💡 Tip: Run the setup wizard to reconfigure:${colors.reset}`);
            console.error(`   ${colors.cyan}npm run setup${colors.reset}\n`);
        } else {
            console.error(error);
        }
        process.exit(1);
    } finally {
        await closeDB();
    }
};

main();
