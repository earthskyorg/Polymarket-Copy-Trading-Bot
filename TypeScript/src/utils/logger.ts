import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

class Logger {
    private static logsDir = path.join(process.cwd(), 'logs');
    private static currentLogFile = '';

    private static getLogFileName(): string {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logsDir, `bot-${date}.log`);
    }

    private static ensureLogsDir(): void {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    private static writeToFile(message: string): void {
        try {
            this.ensureLogsDir();
            const logFile = this.getLogFileName();
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${message}\n`;
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error) {
            // Silently fail to avoid infinite loops
        }
    }

    private static stripAnsi(str: string): string {
        // Remove ANSI color codes for file logging
        return str.replace(/\u001b\[\d+m/g, '');
    }

    private static formatAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    private static maskAddress(address: string): string {
        // Show 0x and first 4 chars, mask middle, show last 4 chars
        return `${address.slice(0, 6)}${'*'.repeat(34)}${address.slice(-4)}`;
    }

    static header(title: string) {
        console.log('\n' + chalk.cyan('━'.repeat(70)));
        console.log(chalk.cyan.bold(`  ${title}`));
        console.log(chalk.cyan('━'.repeat(70)) + '\n');
        this.writeToFile(`HEADER: ${title}`);
    }

    static info(message: string) {
        console.log(chalk.blue('ℹ'), message);
        this.writeToFile(`INFO: ${message}`);
    }

    static success(message: string) {
        console.log(chalk.green('✓'), message);
        this.writeToFile(`SUCCESS: ${message}`);
    }

    static warning(message: string) {
        console.log(chalk.yellow('⚠'), message);
        this.writeToFile(`WARNING: ${message}`);
    }

    static error(message: string) {
        console.log(chalk.red('✗'), message);
        this.writeToFile(`ERROR: ${message}`);
    }

    static trade(traderAddress: string, action: string, details: any) {
        console.log('\n' + chalk.magenta('─'.repeat(70)));
        console.log(chalk.magenta.bold('📊 NEW TRADE DETECTED'));
        console.log(chalk.gray(`Trader: ${this.formatAddress(traderAddress)}`));
        console.log(chalk.gray(`Action: ${chalk.white.bold(action)}`));
        if (details.asset) {
            console.log(chalk.gray(`Asset:  ${this.formatAddress(details.asset)}`));
        }
        if (details.side) {
            const sideColor = details.side === 'BUY' ? chalk.green : chalk.red;
            console.log(chalk.gray(`Side:   ${sideColor.bold(details.side)}`));
        }
        if (details.amount) {
            console.log(chalk.gray(`Amount: ${chalk.yellow(`$${details.amount}`)}`));
        }
        if (details.price) {
            console.log(chalk.gray(`Price:  ${chalk.cyan(details.price)}`));
        }
        if (details.eventSlug || details.slug) {
            // Use eventSlug for the correct market URL format
            const slug = details.eventSlug || details.slug;
            const marketUrl = `https://polymarket.com/event/${slug}`;
            console.log(chalk.gray(`Market: ${chalk.blue.underline(marketUrl)}`));
        }
        if (details.transactionHash) {
            const txUrl = `https://polygonscan.com/tx/${details.transactionHash}`;
            console.log(chalk.gray(`TX:     ${chalk.blue.underline(txUrl)}`));
        }
        console.log(chalk.magenta('─'.repeat(70)) + '\n');

        // Log to file
        let tradeLog = `TRADE: ${this.formatAddress(traderAddress)} - ${action}`;
        if (details.side) tradeLog += ` | Side: ${details.side}`;
        if (details.amount) tradeLog += ` | Amount: $${details.amount}`;
        if (details.price) tradeLog += ` | Price: ${details.price}`;
        if (details.title) tradeLog += ` | Market: ${details.title}`;
        if (details.transactionHash) tradeLog += ` | TX: ${details.transactionHash}`;
        this.writeToFile(tradeLog);
    }

    static balance(myBalance: number, traderBalance: number, traderAddress: string) {
        console.log(chalk.gray('Capital (USDC + Positions):'));
        console.log(
            chalk.gray(`  Your total capital:   ${chalk.green.bold(`$${myBalance.toFixed(2)}`)}`)
        );
        console.log(
            chalk.gray(
                `  Trader total capital: ${chalk.blue.bold(`$${traderBalance.toFixed(2)}`)} (${this.formatAddress(traderAddress)})`
            )
        );
    }

    static orderResult(success: boolean, message: string) {
        if (success) {
            console.log(chalk.green('✓'), chalk.green.bold('Order executed:'), message);
            this.writeToFile(`ORDER SUCCESS: ${message}`);
        } else {
            console.log(chalk.red('✗'), chalk.red.bold('Order failed:'), message);
            this.writeToFile(`ORDER FAILED: ${message}`);
        }
    }

    static monitoring(traderCount: number) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(
            chalk.dim(`[${timestamp}]`),
            chalk.cyan('👁️  Monitoring'),
            chalk.yellow(`${traderCount} trader(s)`)
        );
    }

    static startup(traders: string[], myWallet: string) {
        console.log('\n');
        const c = {
            reset: '\x1b[0m',
            bold: '\x1b[1m',
            dim: '\x1b[2m',
            
            // Primary brand colors
            cyan: '\x1b[38;5;51m',      // Bright cyan
            blue: '\x1b[38;5;39m',      // Electric blue
            purple: '\x1b[38;5;141m',   // Soft purple
            magenta: '\x1b[38;5;213m',  // Pink magenta
            
            // Accent colors
            green: '\x1b[38;5;48m',     // Mint green
            yellow: '\x1b[38;5;221m',   // Warm yellow
            orange: '\x1b[38;5;215m',   // Soft orange
            
            // UI colors
            gray: '\x1b[38;5;246m',     // Soft gray
            white: '\x1b[38;5;255m',    // Pure white
            border: '\x1b[38;5;69m',    // Slate blue
        };

        console.log('\n');

        // Top border with gradient
        console.log(c.border + c.bold + '╔══════════════════════════════════════════════════════════════════╗' + c.reset);
        console.log(c.border + '║' + c.reset + '                                                                  ' + c.border + '║' + c.reset);

        // Logo with smooth gradient: cyan → blue → purple → magenta
        console.log(c.border + '║' + c.reset + c.cyan + c.bold + '          ' + '  ____       ' + c.blue + '_        ' + c.purple + '____                 ' + c.magenta + '             ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.cyan + c.bold + '          ' + ' |  _ \\ ___ ' + c.blue + '| |_   _ ' + c.purple + '/ ___|___  ' + c.magenta + '_ __  _   _ ' + '            ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.cyan + c.bold + '          ' + ' | |_) / _ \\' + c.blue + '| | | | | ' + c.purple + '|   / _ \\' + c.magenta + '| \'_ \\| | | |' + '            ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.blue + c.bold + '          ' + ' |  __/ (_) ' + c.purple + '| | |_| | ' + c.magenta + '|__| (_) | |_) | |_| |' + '            ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.blue + c.bold + '          ' + ' |_|   \\___/' + c.purple + '|_|\\__, |' + c.magenta + '\\____\\___/| .__/ \\__, |' + '            ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.purple + '          ' + '               ' + c.magenta + '|___/            |_|    |___/ ' + '           ' + c.border + '║' + c.reset);

        console.log(c.border + '║' + c.reset + '                                                                  ' + c.border + '║' + c.reset);

        // V3 Badge - Modern pill design
        console.log(c.border + '║' + c.reset + c.gray + '                            ' + c.cyan + c.bold + '╭─────────╮' + c.reset + '                           ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.gray + '                            ' + c.cyan + c.bold + '│' + c.white + c.bold + '    V3   ' + c.cyan + '│' + c.reset + '                           ' + c.border + '║' + c.reset);
        console.log(c.border + '║' + c.reset + c.gray + '                            ' + c.cyan + c.bold + '╰─────────╯' + c.reset + '                           ' + c.border + '║' + c.reset);

        console.log(c.border + '║' + c.reset + '                                                                  ' + c.border + '║' + c.reset);

        // Tagline with icon
        console.log(c.border + '║' + c.reset + c.yellow + c.bold + '              ⚡ Copy the best, automate success ⚡' + c.reset + '               ' + c.border + '║' + c.reset);

        console.log(c.border + '║' + c.reset + '                                                                  ' + c.border + '║' + c.reset);
        console.log(c.border + c.bold + '╚══════════════════════════════════════════════════════════════════╝' + c.reset);

        // Clean separator line
        console.log(c.border + '━'.repeat(68) + c.reset);

        console.log('\n');



        console.log(chalk.cyan('📊 Tracking Traders:'));
        traders.forEach((address, index) => {
            console.log(chalk.gray(`   ${index + 1}. ${address}`));
        });
        console.log(chalk.cyan(`\n💼 Your Wallet:`));
        console.log(chalk.gray(`   ${this.maskAddress(myWallet)}\n`));
    }

    static dbConnection(traders: string[], counts: number[]) {
        console.log('\n' + chalk.cyan('📦 Database Status:'));
        traders.forEach((address, index) => {
            const countStr = chalk.yellow(`${counts[index]} trades`);
            console.log(chalk.gray(`   ${this.formatAddress(address)}: ${countStr}`));
        });
        console.log('');
    }

    static separator() {
        console.log(chalk.dim('─'.repeat(70)));
    }

    private static spinnerFrames = ['⏳', '⌛', '⏳'];
    private static spinnerIndex = 0;

    static waiting(traderCount: number, extraInfo?: string) {
        const timestamp = new Date().toLocaleTimeString();
        const spinner = this.spinnerFrames[this.spinnerIndex % this.spinnerFrames.length];
        this.spinnerIndex++;

        const message = extraInfo
            ? `${spinner} Waiting for trades from ${traderCount} trader(s)... (${extraInfo})`
            : `${spinner} Waiting for trades from ${traderCount} trader(s)...`;

        process.stdout.write(chalk.dim(`\r[${timestamp}] `) + chalk.cyan(message) + '  ');
    }

    static clearLine() {
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
    }

    static myPositions(
        wallet: string,
        count: number,
        topPositions: any[],
        overallPnl: number,
        totalValue: number,
        initialValue: number,
        currentBalance: number
    ) {
        console.log('\n' + chalk.magenta.bold('💼 YOUR POSITIONS'));
        console.log(chalk.gray(`   Wallet: ${this.formatAddress(wallet)}`));
        console.log('');

        // Show balance and portfolio overview
        const balanceStr = chalk.yellow.bold(`$${currentBalance.toFixed(2)}`);
        const totalPortfolio = currentBalance + totalValue;
        const portfolioStr = chalk.cyan.bold(`$${totalPortfolio.toFixed(2)}`);

        console.log(chalk.gray(`   💰 Available Cash:    ${balanceStr}`));
        console.log(chalk.gray(`   📊 Total Portfolio:   ${portfolioStr}`));

        if (count === 0) {
            console.log(chalk.gray(`\n   No open positions`));
        } else {
            const countStr = chalk.green(`${count} position${count > 1 ? 's' : ''}`);
            const pnlColor = overallPnl >= 0 ? chalk.green : chalk.red;
            const pnlSign = overallPnl >= 0 ? '+' : '';
            const profitStr = pnlColor.bold(`${pnlSign}${overallPnl.toFixed(1)}%`);
            const valueStr = chalk.cyan(`$${totalValue.toFixed(2)}`);
            const initialStr = chalk.gray(`$${initialValue.toFixed(2)}`);

            console.log('');
            console.log(chalk.gray(`   📈 Open Positions:    ${countStr}`));
            console.log(chalk.gray(`      Invested:          ${initialStr}`));
            console.log(chalk.gray(`      Current Value:     ${valueStr}`));
            console.log(chalk.gray(`      Profit/Loss:       ${profitStr}`));

            // Show top positions
            if (topPositions.length > 0) {
                console.log(chalk.gray(`\n   🔝 Top Positions:`));
                topPositions.forEach((pos: any) => {
                    const pnlColor = pos.percentPnl >= 0 ? chalk.green : chalk.red;
                    const pnlSign = pos.percentPnl >= 0 ? '+' : '';
                    const avgPrice = pos.avgPrice || 0;
                    const curPrice = pos.curPrice || 0;
                    console.log(
                        chalk.gray(
                            `      • ${pos.outcome} - ${pos.title.slice(0, 45)}${pos.title.length > 45 ? '...' : ''}`
                        )
                    );
                    console.log(
                        chalk.gray(
                            `        Value: ${chalk.cyan(`$${pos.currentValue.toFixed(2)}`)} | PnL: ${pnlColor(`${pnlSign}${pos.percentPnl.toFixed(1)}%`)}`
                        )
                    );
                    console.log(
                        chalk.gray(
                            `        Bought @ ${chalk.yellow(`${(avgPrice * 100).toFixed(1)}¢`)} | Current @ ${chalk.yellow(`${(curPrice * 100).toFixed(1)}¢`)}`
                        )
                    );
                });
            }
        }
        console.log('');
    }

    static tradersPositions(
        traders: string[],
        positionCounts: number[],
        positionDetails?: any[][],
        profitabilities?: number[]
    ) {
        console.log('\n' + chalk.cyan("📈 TRADERS YOU'RE COPYING"));
        traders.forEach((address, index) => {
            const count = positionCounts[index] ?? 0;
            const countStr =
                count > 0
                    ? chalk.green(`${count} position${count > 1 ? 's' : ''}`)
                    : chalk.gray('0 positions');

            // Add profitability if available
            let profitStr = '';
            if (profitabilities && profitabilities[index] !== undefined && count > 0) {
                const pnl = profitabilities[index];
                const pnlColor = pnl >= 0 ? chalk.green : chalk.red;
                const pnlSign = pnl >= 0 ? '+' : '';
                profitStr = ` | ${pnlColor.bold(`${pnlSign}${pnl.toFixed(1)}%`)}`;
            }

            console.log(chalk.gray(`   ${this.formatAddress(address)}: ${countStr}${profitStr}`));

            // Show position details if available
            if (positionDetails && positionDetails[index] && positionDetails[index].length > 0) {
                positionDetails[index].forEach((pos: any) => {
                    const pnlColor = pos.percentPnl >= 0 ? chalk.green : chalk.red;
                    const pnlSign = pos.percentPnl >= 0 ? '+' : '';
                    const avgPrice = pos.avgPrice || 0;
                    const curPrice = pos.curPrice || 0;
                    console.log(
                        chalk.gray(
                            `      • ${pos.outcome} - ${pos.title.slice(0, 40)}${pos.title.length > 40 ? '...' : ''}`
                        )
                    );
                    console.log(
                        chalk.gray(
                            `        Value: ${chalk.cyan(`$${pos.currentValue.toFixed(2)}`)} | PnL: ${pnlColor(`${pnlSign}${pos.percentPnl.toFixed(1)}%`)}`
                        )
                    );
                    console.log(
                        chalk.gray(
                            `        Bought @ ${chalk.yellow(`${(avgPrice * 100).toFixed(1)}¢`)} | Current @ ${chalk.yellow(`${(curPrice * 100).toFixed(1)}¢`)}`
                        )
                    );
                });
            }
        });
        console.log('');
    }
}

export default Logger;
