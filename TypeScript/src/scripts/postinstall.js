#!/usr/bin/env node

/**
 * Post-install message to help users get started
 * Skips in CI environments to avoid build failures
 */

// Skip in CI environments
if (process.env.CI || process.env.CONTINUOUS_INTEGRATION || process.env.GITHUB_ACTIONS) {
    process.exit(0);
}

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

console.log(`\n${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}  ✅ Polymarket Copy Trading Bot - Installed!${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

console.log(`${colors.yellow}🚀 Quick Start (3 steps):${colors.reset}\n`);
console.log(`   1. ${colors.green}npm run setup${colors.reset}          # Interactive configuration wizard`);
console.log(`   2. ${colors.green}npm run build${colors.reset}          # Compile the bot`);
console.log(`   3. ${colors.green}npm start${colors.reset}              # Start trading!\n`);

console.log(`${colors.yellow}📖 First time user?${colors.reset}`);
console.log(`   Read: ${colors.cyan}GETTING_STARTED.md${colors.reset} for complete guide\n`);

console.log(`${colors.yellow}❓ Need help?${colors.reset}`);
console.log(`   Run: ${colors.green}npm run help${colors.reset} to see all available commands\n`);

console.log(`${colors.yellow}✅ Health check:${colors.reset}`);
console.log(`   Run: ${colors.green}npm run health-check${colors.reset} to verify your setup\n`);

console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

