import * as fs from 'fs';
import * as path from 'path';

const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
};

interface SimulationResult {
    id: string;
    name: string;
    logic: string;
    timestamp: number;
    traderAddress: string;
    startingCapital: number;
    currentCapital: number;
    totalTrades: number;
    copiedTrades: number;
    skippedTrades: number;
    totalInvested: number;
    currentValue: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    roi: number;
    positions: any[];
}

interface ComparisonRow {
    name: string;
    trader: string;
    roi: number;
    totalPnl: number;
    copiedTrades: number;
    skippedTrades: number;
    currentCapital: number;
    openPositions: number;
    filepath: string;
}

function loadSimulationResults(): SimulationResult[] {
    const resultsDir = path.join(process.cwd(), 'simulation_results');

    if (!fs.existsSync(resultsDir)) {
        console.log(colors.red('No simulation results found. Run simulations first.'));
        return [];
    }

    const files = fs.readdirSync(resultsDir).filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
        console.log(colors.yellow('No result files found in simulation_results/'));
        return [];
    }

    const results: SimulationResult[] = [];

    for (const file of files) {
        try {
            const filepath = path.join(resultsDir, file);
            const content = fs.readFileSync(filepath, 'utf8');
            const data = JSON.parse(content);
            results.push(data);
        } catch (error) {
            console.log(colors.gray(`  Skipped ${file} (invalid JSON)`));
        }
    }

    return results;
}

function groupByTrader(results: SimulationResult[]): Map<string, SimulationResult[]> {
    const grouped = new Map<string, SimulationResult[]>();

    for (const result of results) {
        const trader = result.traderAddress.toLowerCase();
        if (!grouped.has(trader)) {
            grouped.set(trader, []);
        }
        grouped.get(trader)!.push(result);
    }

    return grouped;
}

function printComparisonTable(results: SimulationResult[]) {
    console.log(
        colors.bold(
            colors.cyan(
                '\n════════════════════════════════════════════════════════════════════════════'
            )
        )
    );
    console.log(colors.bold(colors.cyan('  📊 SIMULATION RESULTS COMPARISON')));
    console.log(
        colors.bold(
            colors.cyan(
                '════════════════════════════════════════════════════════════════════════════\n'
            )
        )
    );

    console.log(colors.gray(`Total results found: ${results.length}\n`));

    const grouped = groupByTrader(results);

    for (const [trader, traderResults] of grouped.entries()) {
        console.log(
            colors.bold(colors.blue(`\n▶ Trader: ${trader.slice(0, 10)}...${trader.slice(-8)}`))
        );
        console.log(colors.gray('─'.repeat(80)) + '\n');

        // Sort by ROI descending
        const sorted = traderResults.sort((a, b) => b.roi - a.roi);

        // Print table header
        console.log(
            colors.bold(
                `${'Name'.padEnd(30)} | ${'ROI'.padEnd(10)} | ${'P&L'.padEnd(12)} | ${'Trades'.padEnd(10)} | ${'Positions'.padEnd(10)}`
            )
        );
        console.log(colors.gray('─'.repeat(80)));

        for (const result of sorted) {
            const roiStr =
                result.roi >= 0
                    ? colors.green(`+${result.roi.toFixed(2)}%`)
                    : colors.red(`${result.roi.toFixed(2)}%`);
            const pnlStr =
                result.totalPnl >= 0
                    ? colors.green(`+$${result.totalPnl.toFixed(2)}`)
                    : colors.red(`-$${Math.abs(result.totalPnl).toFixed(2)}`);
            const tradesStr = `${result.copiedTrades}/${result.totalTrades}`;
            const openPositions = result.positions.filter((p) => !p.closed).length;

            const nameDisplay = result.name.padEnd(30).slice(0, 30);
            const roiDisplay = roiStr.padEnd(20); // Extra padding for color codes
            const pnlDisplay = pnlStr.padEnd(22);
            const tradesDisplay = tradesStr.padEnd(10);
            const posDisplay = String(openPositions).padEnd(10);

            console.log(
                `${nameDisplay} | ${roiDisplay} | ${pnlDisplay} | ${tradesDisplay} | ${posDisplay}`
            );
        }
    }

    console.log(
        colors.bold(
            colors.cyan(
                '\n════════════════════════════════════════════════════════════════════════════\n'
            )
        )
    );
}

function printBestResults(results: SimulationResult[], limit: number = 5) {
    console.log(colors.bold(colors.green(`\n🏆 TOP ${limit} BEST PERFORMING CONFIGURATIONS\n`)));

    const sorted = results.sort((a, b) => b.roi - a.roi).slice(0, limit);

    for (let i = 0; i < sorted.length; i++) {
        const result = sorted[i];
        const rank = i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

        console.log(colors.bold(`${medal} ${result.name}`));
        console.log(colors.gray(`   Trader: ${result.traderAddress.slice(0, 10)}...`));
        console.log(
            `   ROI: ${result.roi >= 0 ? colors.green(`+${result.roi.toFixed(2)}%`) : colors.red(`${result.roi.toFixed(2)}%`)}`
        );
        console.log(
            `   P&L: ${result.totalPnl >= 0 ? colors.green(`+$${result.totalPnl.toFixed(2)}`) : colors.red(`-$${Math.abs(result.totalPnl).toFixed(2)}`)}`
        );
        console.log(`   Trades: ${result.copiedTrades} copied, ${result.skippedTrades} skipped`);
        console.log(
            `   Capital: $${result.startingCapital.toFixed(2)} → $${result.currentCapital.toFixed(2)}`
        );
        console.log();
    }
}

function printWorstResults(results: SimulationResult[], limit: number = 3) {
    console.log(colors.bold(colors.red(`\n⚠️  WORST ${limit} PERFORMING CONFIGURATIONS\n`)));

    const sorted = results.sort((a, b) => a.roi - b.roi).slice(0, limit);

    for (let i = 0; i < sorted.length; i++) {
        const result = sorted[i];

        console.log(colors.bold(`${i + 1}. ${result.name}`));
        console.log(colors.gray(`   Trader: ${result.traderAddress.slice(0, 10)}...`));
        console.log(
            `   ROI: ${result.roi >= 0 ? colors.green(`+${result.roi.toFixed(2)}%`) : colors.red(`${result.roi.toFixed(2)}%`)}`
        );
        console.log(
            `   P&L: ${result.totalPnl >= 0 ? colors.green(`+$${result.totalPnl.toFixed(2)}`) : colors.red(`-$${Math.abs(result.totalPnl).toFixed(2)}`)}`
        );
        console.log(`   Trades: ${result.copiedTrades} copied, ${result.skippedTrades} skipped`);
        console.log();
    }
}

function printStatistics(results: SimulationResult[]) {
    console.log(colors.bold(colors.cyan('\n📈 AGGREGATE STATISTICS\n')));

    const avgROI = results.reduce((sum, r) => sum + r.roi, 0) / results.length;
    const avgPnl = results.reduce((sum, r) => sum + r.totalPnl, 0) / results.length;
    const totalTradesCopied = results.reduce((sum, r) => sum + r.copiedTrades, 0);
    const totalTradesSkipped = results.reduce((sum, r) => sum + r.skippedTrades, 0);
    const positiveResults = results.filter((r) => r.roi > 0).length;
    const negativeResults = results.filter((r) => r.roi < 0).length;

    console.log(`Total simulations: ${colors.yellow(String(results.length))}`);
    console.log(
        `Profitable: ${colors.green(String(positiveResults))} (${((positiveResults / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
        `Unprofitable: ${colors.red(String(negativeResults))} (${((negativeResults / results.length) * 100).toFixed(1)}%)`
    );
    console.log();
    console.log(
        `Average ROI: ${avgROI >= 0 ? colors.green(`+${avgROI.toFixed(2)}%`) : colors.red(`${avgROI.toFixed(2)}%`)}`
    );
    console.log(
        `Average P&L: ${avgPnl >= 0 ? colors.green(`+$${avgPnl.toFixed(2)}`) : colors.red(`-$${Math.abs(avgPnl).toFixed(2)}`)}`
    );
    console.log();
    console.log(`Total trades copied: ${colors.cyan(String(totalTradesCopied))}`);
    console.log(`Total trades skipped: ${colors.yellow(String(totalTradesSkipped))}`);
    console.log();
}

function printDetailedResult(result: SimulationResult) {
    console.log(
        colors.bold(
            colors.cyan(
                '\n════════════════════════════════════════════════════════════════════════════'
            )
        )
    );
    console.log(colors.bold(colors.cyan('  📋 DETAILED RESULT')));
    console.log(
        colors.bold(
            colors.cyan(
                '════════════════════════════════════════════════════════════════════════════\n'
            )
        )
    );

    console.log(colors.bold('Configuration:'));
    console.log(`  Name: ${colors.yellow(result.name)}`);
    console.log(`  Trader: ${colors.blue(result.traderAddress)}`);
    console.log(`  Logic: ${result.logic}`);
    console.log(`  Date: ${new Date(result.timestamp).toLocaleString()}`);
    console.log();

    console.log(colors.bold('Capital:'));
    console.log(`  Starting: ${colors.cyan('$' + result.startingCapital.toFixed(2))}`);
    console.log(`  Current:  ${colors.cyan('$' + result.currentCapital.toFixed(2))}`);
    console.log(`  Invested: ${colors.cyan('$' + result.totalInvested.toFixed(2))}`);
    console.log(`  Value:    ${colors.cyan('$' + result.currentValue.toFixed(2))}`);
    console.log();

    console.log(colors.bold('Performance:'));
    const pnlColor = result.totalPnl >= 0 ? colors.green : colors.red;
    const roiColor = result.roi >= 0 ? colors.green : colors.red;
    console.log(
        `  Total P&L:     ${pnlColor((result.totalPnl >= 0 ? '+' : '') + '$' + result.totalPnl.toFixed(2))}`
    );
    console.log(
        `  ROI:           ${roiColor((result.roi >= 0 ? '+' : '') + result.roi.toFixed(2) + '%')}`
    );
    console.log(`  Realized:      $${result.realizedPnl.toFixed(2)}`);
    console.log(`  Unrealized:    $${result.unrealizedPnl.toFixed(2)}`);
    console.log();

    console.log(colors.bold('Trading Activity:'));
    console.log(`  Total trades:    ${colors.cyan(String(result.totalTrades))}`);
    console.log(`  Copied:          ${colors.green(String(result.copiedTrades))}`);
    console.log(`  Skipped:         ${colors.yellow(String(result.skippedTrades))}`);
    console.log(
        `  Copy rate:       ${((result.copiedTrades / result.totalTrades) * 100).toFixed(1)}%`
    );
    console.log();

    const openPositions = result.positions.filter((p) => !p.closed);
    const closedPositions = result.positions.filter((p) => p.closed);

    console.log(colors.bold('Positions:'));
    console.log(`  Open:   ${colors.cyan(String(openPositions.length))}`);
    console.log(`  Closed: ${colors.gray(String(closedPositions.length))}`);
    console.log();
}

async function main() {
    const args = process.argv.slice(2);
    const results = loadSimulationResults();

    if (results.length === 0) {
        console.log(
            colors.yellow('\nNo simulation results to compare. Run simulations first with:')
        );
        console.log(colors.cyan('  npm run sim\n'));
        return;
    }

    const command = args[0] || 'all';

    switch (command) {
        case 'all':
            printComparisonTable(results);
            printBestResults(results, 5);
            printWorstResults(results, 3);
            printStatistics(results);
            break;

        case 'best':
            const limit = parseInt(args[1]) || 10;
            printBestResults(results, limit);
            break;

        case 'worst':
            const worstLimit = parseInt(args[1]) || 5;
            printWorstResults(results, worstLimit);
            break;

        case 'stats':
            printStatistics(results);
            break;

        case 'detail': {
            const searchName = args[1];
            if (!searchName) {
                console.log(colors.red('Please provide a result name to view details'));
                console.log(colors.yellow('Usage: npm run compare detail <name>'));
                return;
            }

            const found = results.find((r) => r.name.includes(searchName));
            if (!found) {
                console.log(colors.red(`No result found matching: ${searchName}`));
                return;
            }

            printDetailedResult(found);
            break;
        }

        case 'help':
        case '--help':
        case '-h':
            printHelp();
            break;

        default:
            console.log(colors.red(`Unknown command: ${command}\n`));
            printHelp();
            break;
    }
}

function printHelp() {
    console.log(colors.cyan('\n📊 Simulation Results Comparison - Usage\n'));

    console.log('Commands:');
    console.log(
        colors.yellow('  npm run compare              ') + colors.gray('# Show all results')
    );
    console.log(
        colors.yellow('  npm run compare best [N]     ') +
            colors.gray('# Show top N results (default: 10)')
    );
    console.log(
        colors.yellow('  npm run compare worst [N]    ') +
            colors.gray('# Show worst N results (default: 5)')
    );
    console.log(
        colors.yellow('  npm run compare stats        ') +
            colors.gray('# Show aggregate statistics')
    );
    console.log(
        colors.yellow('  npm run compare detail <name>') +
            colors.gray('# Show detailed info for a result\n')
    );

    console.log('Examples:');
    console.log(colors.gray('  npm run compare best 5'));
    console.log(colors.gray('  npm run compare detail std_m2p0\n'));
}

main().catch((error) => {
    console.error(colors.red('Error:'), error);
    process.exit(1);
});
