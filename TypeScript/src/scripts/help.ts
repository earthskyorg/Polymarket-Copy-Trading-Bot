#!/usr/bin/env ts-node

/**
 * Help command - displays all available bot commands
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

console.clear();
console.log(`${colors.cyan}${colors.bright}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('     🤖 POLYMARKET COPY TRADING BOT - COMMANDS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`${colors.reset}\n`);

console.log(`${colors.yellow}${colors.bright}📖 GETTING STARTED${colors.reset}\n`);
console.log(`  ${colors.green}npm run setup${colors.reset}          Interactive configuration wizard`);
console.log(`  ${colors.green}npm run health-check${colors.reset}   Verify everything is working`);
console.log(`  ${colors.green}npm run build${colors.reset}          Compile TypeScript to JavaScript`);
console.log(`  ${colors.green}npm start${colors.reset}              Start the trading bot`);
console.log(`  ${colors.green}npm run dev${colors.reset}            Run in development mode`);
console.log('');

console.log(`${colors.yellow}${colors.bright}💰 WALLET & BALANCE${colors.reset}\n`);
console.log(`  ${colors.green}npm run check-proxy${colors.reset}       Check your wallet balance and positions`);
console.log(`  ${colors.green}npm run check-both${colors.reset}        Check both your wallet and EOA`);
console.log(`  ${colors.green}npm run check-allowance${colors.reset}   Verify USDC token allowance`);
console.log(`  ${colors.green}npm run set-token-allowance${colors.reset}  Set USDC spending approval`);
console.log('');

console.log(`${colors.yellow}${colors.bright}📊 MONITORING & STATS${colors.reset}\n`);
console.log(`  ${colors.green}npm run check-stats${colors.reset}       View your trading statistics`);
console.log(`  ${colors.green}npm run check-activity${colors.reset}    See recent trading activity`);
console.log(`  ${colors.green}npm run check-pnl${colors.reset}         Check profit & loss discrepancies`);
console.log('');

console.log(`${colors.yellow}${colors.bright}🎯 POSITION MANAGEMENT${colors.reset}\n`);
console.log(`  ${colors.green}npm run manual-sell${colors.reset}       Manually sell a specific position`);
console.log(`  ${colors.green}npm run sell-large${colors.reset}        Sell large positions (bulk action)`);
console.log(`  ${colors.green}npm run close-stale${colors.reset}       Close stale/old positions`);
console.log(`  ${colors.green}npm run close-resolved${colors.reset}    Close resolved market positions`);
console.log(`  ${colors.green}npm run redeem-resolved${colors.reset}   Redeem resolved positions for USDC`);
console.log('');

console.log(`${colors.yellow}${colors.bright}🔍 TRADER RESEARCH${colors.reset}\n`);
console.log(`  ${colors.green}npm run find-traders${colors.reset}      Find best performing traders`);
console.log(`  ${colors.green}npm run find-low-risk${colors.reset}     Find low-risk traders`);
console.log(`  ${colors.green}npm run scan-traders${colors.reset}      Scan and analyze top traders`);
console.log(`  ${colors.green}npm run scan-markets${colors.reset}      Scan traders from popular markets`);
console.log('');

console.log(`${colors.yellow}${colors.bright}🧪 SIMULATION & TESTING${colors.reset}\n`);
console.log(`  ${colors.green}npm run simulate${colors.reset}          Simulate profitability with current logic`);
console.log(`  ${colors.green}npm run simulate-old${colors.reset}      Simulate with old algorithm`);
console.log(`  ${colors.green}npm run sim${colors.reset}               Run comprehensive simulations`);
console.log(`  ${colors.green}npm run compare${colors.reset}           Compare simulation results`);
console.log('');

console.log(`${colors.yellow}${colors.bright}🔧 ADVANCED & UTILITIES${colors.reset}\n`);
console.log(`  ${colors.green}npm run audit${colors.reset}             Audit copy trading algorithm`);
console.log(`  ${colors.green}npm run fetch-history${colors.reset}     Fetch historical trade data`);
console.log(`  ${colors.green}npm run aggregate${colors.reset}         Aggregate trading results`);
console.log('');

console.log(`${colors.yellow}${colors.bright}📚 DOCUMENTATION${colors.reset}\n`);
console.log(`  ${colors.cyan}GETTING_STARTED.md${colors.reset}        Complete beginner's guide`);
console.log(`  ${colors.cyan}README.md${colors.reset}                 Full documentation`);
console.log(`  ${colors.cyan}docs/QUICK_START.md${colors.reset}       5-minute quick start`);
console.log(`  ${colors.cyan}docs/DOCKER.md${colors.reset}            Docker deployment guide`);
console.log(`  ${colors.cyan}docs/MULTI_TRADER_GUIDE.md${colors.reset}  Copy multiple traders`);
console.log('');

console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
console.log(`${colors.yellow}💡 Quick Tips:${colors.reset}\n`);
console.log('  • New user? Start with: npm run setup');
console.log('  • Before trading: npm run health-check');
console.log('  • Test strategies: npm run simulate');
console.log('  • Find traders: npm run find-traders');
console.log('  • Emergency stop: Press Ctrl+C');
console.log('');
console.log(`${colors.yellow}⚠️  Always start with small amounts and monitor regularly!${colors.reset}\n`);

