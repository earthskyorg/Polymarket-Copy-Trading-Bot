import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from '../config/env';

// Colors for console output
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

interface Trade {
    id: string;
    timestamp: number;
    market: string;
    asset: string;
    side: 'BUY' | 'SELL';
    price: number;
    usdcSize: number;
    size: number;
    outcome: string;
}

interface Position {
    asset: string;
    size: number;
    currentValue: number;
}

interface SimulatedPosition {
    market: string;
    outcome: string;
    entryPrice: number;
    exitPrice: number | null;
    invested: number;
    currentValue: number;
    pnl: number;
    closed: boolean;
    trades: {
        timestamp: number;
        side: 'BUY' | 'SELL';
        price: number;
        size: number;
        usdcSize: number;
        traderPercent: number;
        yourSize: number;
    }[];
}

interface TraderResult {
    address: string;
    name?: string;
    startingCapital: number;
    currentCapital: number;
    totalTrades: number;
    copiedTrades: number;
    skippedTrades: number;
    totalPnl: number;
    roi: number;
    realizedPnl: number;
    unrealizedPnl: number;
    winRate: number;
    avgTradeSize: number;
    openPositions: number;
    closedPositions: number;
    simulationTime: number;
    error?: string;
}

// Configuration
const STARTING_CAPITAL = 1000;
const HISTORY_DAYS = parseInt(process.env.SIM_HISTORY_DAYS || '30');
const MULTIPLIER = parseFloat(process.env.TRADE_MULTIPLIER || '1.0');
const MIN_ORDER_SIZE = parseFloat(process.env.SIM_MIN_ORDER_USD || '1.0');
const MAX_TRADES_LIMIT = parseInt(process.env.SIM_MAX_TRADES || '2000');
const MIN_TRADER_TRADES = parseInt(process.env.MIN_TRADER_TRADES || '100');

// Known successful traders list (fallback)
const KNOWN_TRADERS = [
    '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
    '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
    '0xa4b366ad22fc0d06f1e934ff468e8922431a87b8',
];

async function fetchTraderLeaderboard(): Promise<string[]> {
    try {
        console.log(colors.cyan('📊 Fetching trader leaderboard from Polymarket...'));

        // Try to get top traders from events/markets
        const response = await axios.get('https://data-api.polymarket.com/markets', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        // Extract unique traders from recent activity
        const traders = new Set<string>();

        // Try to fetch from popular markets
        const markets = response.data.slice(0, 5);
        for (const market of markets) {
            try {
                const tradesUrl = `https://data-api.polymarket.com/trades?market=${market.conditionId}&limit=100`;
                const tradesResp = await axios.get(tradesUrl, { timeout: 5000 });

                tradesResp.data.forEach((trade: any) => {
                    if (trade.owner) {
                        traders.add(trade.owner.toLowerCase());
                    }
                });
            } catch (e) {
                // Skip if market doesn't have trades endpoint
            }
        }

        const traderList = Array.from(traders);
        console.log(
            colors.green(`✓ Found ${traderList.length} unique traders from recent activity`)
        );

        return traderList.slice(0, 20); // Top 20 most active
    } catch (error) {
        console.log(colors.yellow('⚠️  Could not fetch leaderboard, using known traders list'));
        return KNOWN_TRADERS;
    }
}

async function fetchBatch(
    traderAddress: string,
    offset: number,
    limit: number,
    sinceTimestamp: number
): Promise<Trade[]> {
    try {
        const response = await axios.get(
            `https://data-api.polymarket.com/activity?user=${traderAddress}&type=TRADE&limit=${limit}&offset=${offset}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        const trades: Trade[] = response.data.map((item: any) => ({
            id: item.id,
            timestamp: item.timestamp,
            market: item.slug || item.market,
            asset: item.asset,
            side: item.side,
            price: item.price,
            usdcSize: item.usdcSize,
            size: item.size,
            outcome: item.outcome || 'Unknown',
        }));

        return trades.filter((t) => t.timestamp >= sinceTimestamp);
    } catch (error) {
        return [];
    }
}

async function fetchTraderActivity(traderAddress: string): Promise<Trade[]> {
    try {
        const sinceTimestamp = Math.floor((Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) / 1000);

        const firstBatch = await fetchBatch(traderAddress, 0, 100, sinceTimestamp);
        let allTrades: Trade[] = [...firstBatch];

        if (firstBatch.length === 100) {
            const batchSize = 100;
            const maxParallel = 3;
            let offset = 100;
            let hasMore = true;

            while (hasMore && allTrades.length < MAX_TRADES_LIMIT) {
                const promises: Promise<Trade[]>[] = [];
                for (let i = 0; i < maxParallel; i++) {
                    promises.push(
                        fetchBatch(traderAddress, offset + i * batchSize, batchSize, sinceTimestamp)
                    );
                }

                const results = await Promise.all(promises);
                let addedCount = 0;

                for (const batch of results) {
                    if (batch.length > 0) {
                        allTrades = allTrades.concat(batch);
                        addedCount += batch.length;
                    }
                    if (batch.length < batchSize) {
                        hasMore = false;
                        break;
                    }
                }

                if (addedCount === 0) {
                    hasMore = false;
                }

                if (allTrades.length >= MAX_TRADES_LIMIT) {
                    allTrades = allTrades.slice(0, MAX_TRADES_LIMIT);
                    hasMore = false;
                }

                offset += maxParallel * batchSize;
            }
        }

        return allTrades.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        console.error(colors.red(`Error fetching trader ${traderAddress}:`), error);
        return [];
    }
}

async function fetchTraderPositions(traderAddress: string): Promise<Position[]> {
    try {
        const response = await axios.get(
            `https://data-api.polymarket.com/positions?user=${traderAddress}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );
        return response.data;
    } catch (error) {
        return [];
    }
}

async function getTraderCapitalAtTime(timestamp: number, trades: Trade[]): Promise<number> {
    const pastTrades = trades.filter((t) => t.timestamp <= timestamp);
    let capital = 100000;

    pastTrades.forEach((trade) => {
        if (trade.side === 'BUY') {
            capital -= trade.usdcSize;
        } else {
            capital += trade.usdcSize;
        }
    });

    return Math.max(capital, 50000);
}

async function simulateTrader(traderAddress: string): Promise<TraderResult> {
    const startTime = Date.now();

    try {
        // Fetch trades
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length < MIN_TRADER_TRADES) {
            return {
                address: traderAddress,
                startingCapital: STARTING_CAPITAL,
                currentCapital: STARTING_CAPITAL,
                totalTrades: trades.length,
                copiedTrades: 0,
                skippedTrades: trades.length,
                totalPnl: 0,
                roi: 0,
                realizedPnl: 0,
                unrealizedPnl: 0,
                winRate: 0,
                avgTradeSize: 0,
                openPositions: 0,
                closedPositions: 0,
                simulationTime: Date.now() - startTime,
                error: `Not enough trades (${trades.length} < ${MIN_TRADER_TRADES})`,
            };
        }

        // Run simulation
        let yourCapital = STARTING_CAPITAL;
        let totalInvested = 0;
        let copiedTrades = 0;
        let skippedTrades = 0;

        const positions = new Map<string, SimulatedPosition>();

        for (const trade of trades) {
            const traderCapital = await getTraderCapitalAtTime(trade.timestamp, trades);
            const traderPercent = trade.usdcSize / traderCapital;
            const baseOrderSize = yourCapital * traderPercent;
            let orderSize = baseOrderSize * MULTIPLIER;

            if (orderSize < MIN_ORDER_SIZE) {
                skippedTrades++;
                continue;
            }

            if (orderSize > yourCapital * 0.95) {
                orderSize = yourCapital * 0.95;
                if (orderSize < MIN_ORDER_SIZE) {
                    skippedTrades++;
                    continue;
                }
            }

            const positionKey = `${trade.asset}:${trade.outcome}`;

            if (trade.side === 'BUY') {
                const sharesReceived = orderSize / trade.price;

                if (!positions.has(positionKey)) {
                    positions.set(positionKey, {
                        market: trade.market || trade.asset || 'Unknown market',
                        outcome: trade.outcome,
                        entryPrice: trade.price,
                        exitPrice: null,
                        invested: orderSize,
                        currentValue: orderSize,
                        pnl: 0,
                        closed: false,
                        trades: [],
                    });
                }

                const pos = positions.get(positionKey)!;
                pos.trades.push({
                    timestamp: trade.timestamp,
                    side: 'BUY',
                    price: trade.price,
                    size: sharesReceived,
                    usdcSize: orderSize,
                    traderPercent: traderPercent * 100,
                    yourSize: orderSize,
                });

                pos.invested += orderSize;
                yourCapital -= orderSize;
                totalInvested += orderSize;
                copiedTrades++;
            } else if (trade.side === 'SELL') {
                if (positions.has(positionKey)) {
                    const pos = positions.get(positionKey)!;
                    const sellAmount = Math.min(orderSize, pos.currentValue);

                    pos.trades.push({
                        timestamp: trade.timestamp,
                        side: 'SELL',
                        price: trade.price,
                        size: sellAmount / trade.price,
                        usdcSize: sellAmount,
                        traderPercent: traderPercent * 100,
                        yourSize: sellAmount,
                    });

                    pos.currentValue -= sellAmount;
                    pos.exitPrice = trade.price;
                    yourCapital += sellAmount;

                    if (pos.currentValue < 0.01) {
                        pos.closed = true;
                        pos.pnl = yourCapital - pos.invested;
                    }

                    copiedTrades++;
                } else {
                    skippedTrades++;
                }
            }
        }

        // Calculate current values
        const traderPositions = await fetchTraderPositions(traderAddress);
        let unrealizedPnl = 0;
        let realizedPnl = 0;

        for (const [key, simPos] of positions.entries()) {
            if (!simPos.closed) {
                const assetId = key.split(':')[0];
                const traderPos = traderPositions.find((tp) => tp.asset === assetId);

                if (traderPos && traderPos.size > 0) {
                    const currentPrice = traderPos.currentValue / traderPos.size;
                    const totalShares = simPos.trades
                        .filter((t) => t.side === 'BUY')
                        .reduce((sum, t) => sum + t.size, 0);
                    simPos.currentValue = totalShares * currentPrice;
                }

                simPos.pnl = simPos.currentValue - simPos.invested;
                unrealizedPnl += simPos.pnl;
            } else {
                const totalBought = simPos.trades
                    .filter((t) => t.side === 'BUY')
                    .reduce((sum, t) => sum + t.usdcSize, 0);
                const totalSold = simPos.trades
                    .filter((t) => t.side === 'SELL')
                    .reduce((sum, t) => sum + t.usdcSize, 0);
                simPos.pnl = totalSold - totalBought;
                realizedPnl += simPos.pnl;
            }
        }

        const currentCapital =
            yourCapital +
            Array.from(positions.values())
                .filter((p) => !p.closed)
                .reduce((sum, p) => sum + p.currentValue, 0);

        const totalPnl = currentCapital - STARTING_CAPITAL;
        const roi = (totalPnl / STARTING_CAPITAL) * 100;

        // Calculate win rate
        const closedPositions = Array.from(positions.values()).filter((p) => p.closed);
        const winningPositions = closedPositions.filter((p) => p.pnl > 0);
        const winRate =
            closedPositions.length > 0
                ? (winningPositions.length / closedPositions.length) * 100
                : 0;

        // Calculate avg trade size
        const avgTradeSize = copiedTrades > 0 ? totalInvested / copiedTrades : 0;

        return {
            address: traderAddress,
            startingCapital: STARTING_CAPITAL,
            currentCapital,
            totalTrades: trades.length,
            copiedTrades,
            skippedTrades,
            totalPnl,
            roi,
            realizedPnl,
            unrealizedPnl,
            winRate,
            avgTradeSize,
            openPositions: Array.from(positions.values()).filter((p) => !p.closed).length,
            closedPositions: closedPositions.length,
            simulationTime: Date.now() - startTime,
        };
    } catch (error) {
        return {
            address: traderAddress,
            startingCapital: STARTING_CAPITAL,
            currentCapital: STARTING_CAPITAL,
            totalTrades: 0,
            copiedTrades: 0,
            skippedTrades: 0,
            totalPnl: 0,
            roi: 0,
            realizedPnl: 0,
            unrealizedPnl: 0,
            winRate: 0,
            avgTradeSize: 0,
            openPositions: 0,
            closedPositions: 0,
            simulationTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

function printResults(results: TraderResult[]) {
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  🏆 TRADER ANALYSIS RESULTS'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    console.log(colors.bold('Configuration:'));
    console.log(
        `  History: ${HISTORY_DAYS} days | Multiplier: ${MULTIPLIER}x | Min Order: $${MIN_ORDER_SIZE} | Starting Capital: $${STARTING_CAPITAL}\n`
    );

    // Sort by ROI
    const sortedByROI = [...results]
        .filter((r) => !r.error && r.copiedTrades > 0)
        .sort((a, b) => b.roi - a.roi);

    console.log(colors.bold(colors.green('📈 TOP 10 BY ROI:\n')));
    sortedByROI.slice(0, 10).forEach((result, idx) => {
        const roiColor = result.roi >= 0 ? colors.green : colors.red;
        const roiSign = result.roi >= 0 ? '+' : '';
        console.log(
            `${idx + 1}. ${colors.blue(result.address.slice(0, 10) + '...' + result.address.slice(-8))}`
        );
        console.log(
            `   ROI: ${roiColor(roiSign + result.roi.toFixed(2) + '%')} | P&L: ${roiSign}$${result.totalPnl.toFixed(2)} | Trades: ${result.copiedTrades} | Win Rate: ${result.winRate.toFixed(1)}%`
        );
    });

    // Sort by win rate
    const sortedByWinRate = [...results]
        .filter((r) => !r.error && r.copiedTrades > 0 && r.closedPositions >= 5)
        .sort((a, b) => b.winRate - a.winRate);

    console.log(
        '\n' + colors.bold(colors.yellow('🎯 TOP 10 BY WIN RATE (min 5 closed positions):\n'))
    );
    sortedByWinRate.slice(0, 10).forEach((result, idx) => {
        const roiColor = result.roi >= 0 ? colors.green : colors.red;
        const roiSign = result.roi >= 0 ? '+' : '';
        console.log(
            `${idx + 1}. ${colors.blue(result.address.slice(0, 10) + '...' + result.address.slice(-8))}`
        );
        console.log(
            `   Win Rate: ${colors.green(result.winRate.toFixed(1) + '%')} | ROI: ${roiColor(roiSign + result.roi.toFixed(2) + '%')} | Closed: ${result.closedPositions} | Trades: ${result.copiedTrades}`
        );
    });

    // Sort by total profit
    const sortedByProfit = [...results]
        .filter((r) => !r.error && r.copiedTrades > 0)
        .sort((a, b) => b.totalPnl - a.totalPnl);

    console.log('\n' + colors.bold(colors.magenta('💰 TOP 10 BY TOTAL PROFIT:\n')));
    sortedByProfit.slice(0, 10).forEach((result, idx) => {
        const pnlColor = result.totalPnl >= 0 ? colors.green : colors.red;
        const pnlSign = result.totalPnl >= 0 ? '+' : '';
        console.log(
            `${idx + 1}. ${colors.blue(result.address.slice(0, 10) + '...' + result.address.slice(-8))}`
        );
        console.log(
            `   Profit: ${pnlColor(pnlSign + '$' + result.totalPnl.toFixed(2))} | ROI: ${pnlSign}${result.roi.toFixed(2)}% | Final Capital: $${result.currentCapital.toFixed(2)}`
        );
    });

    // Summary stats
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.bold('📊 SUMMARY STATISTICS:\n'));

    const validResults = results.filter((r) => !r.error && r.copiedTrades > 0);
    const profitableTraders = validResults.filter((r) => r.roi > 0);
    const avgROI = validResults.reduce((sum, r) => sum + r.roi, 0) / validResults.length;
    const avgWinRate = validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length;
    const totalSimulationTime = results.reduce((sum, r) => sum + r.simulationTime, 0);

    console.log(`  Total Traders Analyzed: ${colors.cyan(String(results.length))}`);
    console.log(`  Valid Simulations: ${colors.cyan(String(validResults.length))}`);
    console.log(
        `  Profitable Traders: ${colors.green(String(profitableTraders.length))} (${((profitableTraders.length / validResults.length) * 100).toFixed(1)}%)`
    );
    console.log(
        `  Average ROI: ${avgROI >= 0 ? colors.green('+') : colors.red('')}${avgROI.toFixed(2)}%`
    );
    console.log(`  Average Win Rate: ${colors.yellow(avgWinRate.toFixed(1) + '%')}`);
    console.log(
        `  Total Simulation Time: ${colors.gray((totalSimulationTime / 1000).toFixed(1) + 's')}`
    );

    console.log('\n' + colors.cyan('═'.repeat(100)) + '\n');

    // Show errors if any
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
        console.log(
            colors.yellow(`⚠️  ${errors.length} traders had errors or insufficient data:\n`)
        );
        errors.slice(0, 5).forEach((r) => {
            console.log(
                `  • ${r.address.slice(0, 10)}... - ${colors.gray(r.error || 'Unknown error')}`
            );
        });
        if (errors.length > 5) {
            console.log(colors.gray(`  ... and ${errors.length - 5} more\n`));
        }
    }
}

function saveResults(results: TraderResult[]) {
    const resultsDir = path.join(process.cwd(), 'trader_analysis_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analysis_${HISTORY_DAYS}d_m${MULTIPLIER}x_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const data = {
        config: {
            historyDays: HISTORY_DAYS,
            multiplier: MULTIPLIER,
            minOrderSize: MIN_ORDER_SIZE,
            startingCapital: STARTING_CAPITAL,
            minTraderTrades: MIN_TRADER_TRADES,
        },
        timestamp: Date.now(),
        results: results.map((r) => ({
            ...r,
            profileUrl: `https://polymarket.com/profile/${r.address}`,
        })),
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(colors.green(`✓ Results saved to: ${filepath}\n`));
}

async function main() {
    console.log(colors.cyan('\n🔍 POLYMARKET TRADER FINDER\n'));
    console.log(colors.gray(`Finding and analyzing the most profitable traders...\n`));

    try {
        // Get trader list
        let traders: string[] = [];

        // Check if custom list provided via env
        if (process.env.TRADER_LIST) {
            traders = process.env.TRADER_LIST.split(',').map((t) => t.trim().toLowerCase());
            console.log(colors.cyan(`Using custom trader list (${traders.length} traders)\n`));
        } else {
            traders = await fetchTraderLeaderboard();
        }

        if (traders.length === 0) {
            console.log(colors.red('❌ No traders found to analyze'));
            return;
        }

        console.log(colors.cyan(`\n🚀 Starting analysis of ${traders.length} traders...\n`));

        const results: TraderResult[] = [];
        for (let i = 0; i < traders.length; i++) {
            const trader = traders[i];
            console.log(
                colors.gray(`[${i + 1}/${traders.length}] Analyzing ${trader.slice(0, 10)}...`)
            );

            const result = await simulateTrader(trader);
            results.push(result);

            // Show quick status
            if (!result.error && result.copiedTrades > 0) {
                const roiColor = result.roi >= 0 ? colors.green : colors.red;
                console.log(
                    `   ${roiColor(result.roi >= 0 ? '✓' : '✗')} ROI: ${result.roi.toFixed(2)}% | Trades: ${result.copiedTrades} | Time: ${(result.simulationTime / 1000).toFixed(1)}s`
                );
            } else {
                console.log(`   ${colors.yellow('⚠')} ${result.error || 'No trades copied'}`);
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Print and save results
        printResults(results);
        saveResults(results);

        console.log(colors.green('✅ Analysis complete!\n'));
    } catch (error) {
        console.error(colors.red('\n✗ Analysis failed:'), error);
        process.exit(1);
    }
}

main();
