import axios from 'axios';
import { ENV } from '../config/env';
import getMyBalance from '../utils/getMyBalance';

// Simple console colors without chalk
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
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
    conditionId: string;
    market: string;
    outcome: string;
    outcomeIndex: number;
    asset: string;
    size: number;
    cost: number;
    avgEntryPrice: number;
    currentValue: number;
    realizedPnl: number;
    unrealizedPnl: number;
}

interface SimulationResult {
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
    positions: SimulatedPosition[];
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
        traderBalance: number;
        yourBalance: number;
        ratio: number;
        yourSize: number;
    }[];
}

const DEFAULT_TRADER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const TRADER_ADDRESS = (process.env.SIM_TRADER_ADDRESS || DEFAULT_TRADER_ADDRESS).toLowerCase();
const STARTING_CAPITAL = 1000; // Simulation with $1000 starting capital
const HISTORY_DAYS = (() => {
    const raw = process.env.SIM_HISTORY_DAYS;
    const value = raw ? Number(raw) : 7;
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 7;
})();
const MULTIPLIER = ENV.TRADE_MULTIPLIER || 1.0;
const MIN_ORDER_SIZE = (() => {
    const raw = process.env.SIM_MIN_ORDER_USD;
    const value = raw ? Number(raw) : 1.0;
    return Number.isFinite(value) && value > 0 ? value : 1.0;
})();
const MAX_TRADES_LIMIT = (() => {
    const raw = process.env.SIM_MAX_TRADES;
    const value = raw ? Number(raw) : 5000;
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5000;
})(); // Limit on number of trades for quick testing

async function fetchBatch(offset: number, limit: number, sinceTimestamp: number): Promise<Trade[]> {
    const response = await axios.get(
        `https://data-api.polymarket.com/activity?user=${TRADER_ADDRESS}&type=TRADE&limit=${limit}&offset=${offset}`,
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
}

async function fetchTraderActivity(): Promise<Trade[]> {
    try {
        const fs = await import('fs');
        const path = await import('path');

        // Check cache first
        const cacheDir = path.join(process.cwd(), 'trader_data_cache');
        const today = new Date().toISOString().split('T')[0];
        const cacheFile = path.join(cacheDir, `${TRADER_ADDRESS}_${HISTORY_DAYS}d_${today}.json`);

        if (fs.existsSync(cacheFile)) {
            console.log(colors.cyan('📦 Loading cached trader activity...'));
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            console.log(
                colors.green(`✓ Loaded ${cached.trades.length} trades from cache (${cached.name})`)
            );
            return cached.trades;
        }

        console.log(
            colors.cyan(
                `📊 Fetching trader activity from last ${HISTORY_DAYS} days (with parallel requests)...`
            )
        );

        // Calculate timestamp for history window
        const sinceTimestamp = Math.floor((Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) / 1000);

        // First, get a sample to estimate total
        const firstBatch = await fetchBatch(0, 100, sinceTimestamp);
        let allTrades: Trade[] = [...firstBatch];

        if (firstBatch.length === 100) {
            // Need to fetch more - do it in parallel batches
            const batchSize = 100;
            const maxParallel = 5; // 5 parallel requests at a time
            let offset = 100;
            let hasMore = true;

            while (hasMore && allTrades.length < MAX_TRADES_LIMIT) {
                // Create batch of parallel requests
                const promises: Promise<Trade[]>[] = [];
                for (let i = 0; i < maxParallel; i++) {
                    promises.push(fetchBatch(offset + i * batchSize, batchSize, sinceTimestamp));
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

                // Check limit
                if (allTrades.length >= MAX_TRADES_LIMIT) {
                    console.log(
                        colors.yellow(
                            `⚠️  Reached trade limit (${MAX_TRADES_LIMIT}), stopping fetch...`
                        )
                    );
                    allTrades = allTrades.slice(0, MAX_TRADES_LIMIT);
                    hasMore = false;
                }

                offset += maxParallel * batchSize;
                console.log(colors.gray(`  Fetched ${allTrades.length} trades so far...`));
            }
        }

        const sortedTrades = allTrades.sort((a, b) => a.timestamp - b.timestamp);
        console.log(colors.green(`✓ Fetched ${sortedTrades.length} trades from last 7 days`));

        // Save to cache
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cacheData = {
            name: `trader_${TRADER_ADDRESS.slice(0, 6)}_${HISTORY_DAYS}d_${today}`,
            traderAddress: TRADER_ADDRESS,
            fetchedAt: new Date().toISOString(),
            period: `${HISTORY_DAYS}_days`,
            totalTrades: sortedTrades.length,
            trades: sortedTrades,
        };

        fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(colors.green(`✓ Cached trades to: ${cacheFile}\n`));

        return sortedTrades;
    } catch (error) {
        console.error(colors.red('Error fetching trader activity:'), error);
        throw error;
    }
}

async function fetchTraderPositions(): Promise<Position[]> {
    try {
        console.log(colors.cyan('📈 Fetching trader positions...'));
        const response = await axios.get(
            `https://data-api.polymarket.com/positions?user=${TRADER_ADDRESS}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        console.log(colors.green(`✓ Fetched ${response.data.length} positions`));
        return response.data;
    } catch (error) {
        console.error(colors.red('Error fetching positions:'), error);
        throw error;
    }
}

async function getTraderPositionsValueAtTime(timestamp: number, trades: Trade[]): Promise<number> {
    // Calculate approximate position value based on trades up to this point
    const pastTrades = trades.filter((t) => t.timestamp <= timestamp);
    let positionsValue = 0;

    // Simple approximation: sum all BUY trades minus SELL trades
    pastTrades.forEach((trade) => {
        if (trade.side === 'BUY') {
            positionsValue += trade.usdcSize;
        } else {
            positionsValue -= trade.usdcSize;
        }
    });

    return Math.max(positionsValue, 0);
}

async function simulateCopyTradingOldLogic(trades: Trade[]): Promise<SimulationResult> {
    console.log(colors.cyan('\n🎮 Starting simulation with OLD LOGIC...\n'));
    console.log(
        colors.yellow('OLD LOGIC: ratio = my_balance / (trader_positions_value + trade.usdcSize)')
    );
    console.log(colors.yellow('           multiplier only applied to trades < $1\n'));

    let yourBalance = STARTING_CAPITAL; // Available USDC balance
    let totalInvested = 0;
    let copiedTrades = 0;
    let skippedTrades = 0;

    const positions = new Map<string, SimulatedPosition>();

    for (const trade of trades) {
        // OLD LOGIC: Get trader's position value (not including USDC balance)
        const traderPositionsValue = await getTraderPositionsValueAtTime(trade.timestamp, trades);

        // OLD LOGIC: Calculate ratio = my_balance / (trader_positions + trade.usdcSize)
        const ratio = yourBalance / (traderPositionsValue + trade.usdcSize);
        let orderSize = trade.usdcSize * ratio;

        // OLD LOGIC: Only apply multiplier if below minimum
        if (orderSize < MIN_ORDER_SIZE) {
            orderSize = orderSize * MULTIPLIER;
        }

        // Check if order meets minimum after multiplier
        if (orderSize < MIN_ORDER_SIZE) {
            skippedTrades++;
            continue;
        }

        // Check if we have enough balance
        if (orderSize > yourBalance * 0.95) {
            orderSize = yourBalance * 0.95;
            if (orderSize < MIN_ORDER_SIZE) {
                skippedTrades++;
                continue;
            }
        }

        const positionKey = `${trade.asset}:${trade.outcome}`;

        if (trade.side === 'BUY') {
            // BUY trade
            const sharesReceived = orderSize / trade.price;

            if (!positions.has(positionKey)) {
                positions.set(positionKey, {
                    market: trade.market || trade.asset || 'Unknown market',
                    outcome: trade.outcome,
                    entryPrice: trade.price,
                    exitPrice: null,
                    invested: 0,
                    currentValue: 0,
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
                traderBalance: traderPositionsValue,
                yourBalance: yourBalance,
                ratio: ratio,
                yourSize: orderSize,
            });

            pos.invested += orderSize;
            pos.currentValue += orderSize;
            yourBalance -= orderSize;
            totalInvested += orderSize;
            copiedTrades++;
        } else if (trade.side === 'SELL') {
            // SELL trade
            if (positions.has(positionKey)) {
                const pos = positions.get(positionKey)!;

                const sellAmount = Math.min(orderSize, pos.currentValue);

                pos.trades.push({
                    timestamp: trade.timestamp,
                    side: 'SELL',
                    price: trade.price,
                    size: sellAmount / trade.price,
                    usdcSize: sellAmount,
                    traderBalance: traderPositionsValue,
                    yourBalance: yourBalance,
                    ratio: ratio,
                    yourSize: sellAmount,
                });

                pos.currentValue -= sellAmount;
                pos.exitPrice = trade.price;
                yourBalance += sellAmount;

                if (pos.currentValue < 0.01) {
                    pos.closed = true;
                    pos.pnl = yourBalance + pos.currentValue - pos.invested;
                }

                copiedTrades++;
            } else {
                skippedTrades++;
            }
        }
    }

    // Calculate current values based on trader's current positions
    const traderPositions = await fetchTraderPositions();
    let totalCurrentValue = yourBalance;
    let unrealizedPnl = 0;
    let realizedPnl = 0;

    for (const [key, simPos] of positions.entries()) {
        if (!simPos.closed) {
            // Find matching trader position to get current value
            const assetId = key.split(':')[0];
            const traderPos = traderPositions.find((tp) => tp.asset === assetId);

            if (traderPos) {
                const currentPrice = traderPos.currentValue / traderPos.size;
                const totalShares = simPos.trades
                    .filter((t) => t.side === 'BUY')
                    .reduce((sum, t) => sum + t.size, 0);
                const soldShares = simPos.trades
                    .filter((t) => t.side === 'SELL')
                    .reduce((sum, t) => sum + t.size, 0);
                const remainingShares = totalShares - soldShares;
                simPos.currentValue = remainingShares * currentPrice;
            }

            simPos.pnl = simPos.currentValue - simPos.invested;
            unrealizedPnl += simPos.pnl;
            totalCurrentValue += simPos.currentValue;
        } else {
            // Closed position - calculate realized P&L
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
        yourBalance +
        Array.from(positions.values())
            .filter((p) => !p.closed)
            .reduce((sum, p) => sum + p.currentValue, 0);

    const totalPnl = currentCapital - STARTING_CAPITAL;
    const roi = (totalPnl / STARTING_CAPITAL) * 100;

    return {
        traderAddress: TRADER_ADDRESS,
        startingCapital: STARTING_CAPITAL,
        currentCapital,
        totalTrades: trades.length,
        copiedTrades,
        skippedTrades,
        totalInvested,
        currentValue: totalCurrentValue,
        realizedPnl,
        unrealizedPnl,
        totalPnl,
        roi,
        positions: Array.from(positions.values()),
    };
}

function printReport(result: SimulationResult) {
    console.log('\n' + colors.cyan('═'.repeat(80)));
    console.log(colors.cyan('  📊 COPY TRADING SIMULATION REPORT (OLD LOGIC)'));
    console.log(colors.cyan('═'.repeat(80)) + '\n');

    console.log('Trader:', colors.blue(result.traderAddress));
    console.log('Multiplier:', colors.yellow(`${MULTIPLIER}x`));
    console.log('Logic:', colors.yellow('OLD (ratio = my_balance / trader_positions)'));
    console.log();

    console.log(colors.bold('Capital:'));
    console.log(`  Starting: ${colors.green('$' + result.startingCapital.toFixed(2))}`);
    console.log(`  Current:  ${colors.green('$' + result.currentCapital.toFixed(2))}`);
    console.log();

    console.log(colors.bold('Performance:'));
    const pnlColor = result.totalPnl >= 0 ? colors.green : colors.red;
    const roiColor = result.roi >= 0 ? colors.green : colors.red;
    const pnlSign = result.totalPnl >= 0 ? '+' : '';
    const roiSign = result.roi >= 0 ? '+' : '';
    console.log(`  Total P&L:     ${pnlColor(pnlSign + '$' + result.totalPnl.toFixed(2))}`);
    console.log(`  ROI:           ${roiColor(roiSign + result.roi.toFixed(2) + '%')}`);
    console.log(
        `  Realized:      ${result.realizedPnl >= 0 ? '+' : ''}$${result.realizedPnl.toFixed(2)}`
    );
    console.log(
        `  Unrealized:    ${result.unrealizedPnl >= 0 ? '+' : ''}$${result.unrealizedPnl.toFixed(2)}`
    );
    console.log();

    console.log(colors.bold('Trades:'));
    console.log(`  Total trades:  ${colors.cyan(String(result.totalTrades))}`);
    console.log(`  Copied:        ${colors.green(String(result.copiedTrades))}`);
    console.log(
        `  Skipped:       ${colors.yellow(String(result.skippedTrades))} (below $${MIN_ORDER_SIZE} minimum)`
    );
    console.log();

    const openPositions = result.positions.filter((p) => !p.closed);
    const closedPositions = result.positions.filter((p) => p.closed);

    console.log(colors.bold('Open Positions:'));
    console.log(`  Count: ${openPositions.length}\n`);

    openPositions.slice(0, 10).forEach((pos, i) => {
        const pnlStr =
            pos.pnl >= 0
                ? colors.green(`+$${pos.pnl.toFixed(2)}`)
                : colors.red(`-$${Math.abs(pos.pnl).toFixed(2)}`);
        const marketLabel = (pos.market || 'Unknown market').slice(0, 50);
        console.log(`  ${i + 1}. ${marketLabel}`);
        console.log(
            `     Outcome: ${pos.outcome} | Invested: $${pos.invested.toFixed(2)} | Value: $${pos.currentValue.toFixed(2)} | P&L: ${pnlStr}`
        );
    });

    if (openPositions.length > 10) {
        console.log(colors.gray(`\n  ... and ${openPositions.length - 10} more positions`));
    }

    if (closedPositions.length > 0) {
        console.log('\n' + colors.bold('Closed Positions:'));
        console.log(`  Count: ${closedPositions.length}\n`);

        closedPositions.slice(0, 5).forEach((pos, i) => {
            const pnlStr =
                pos.pnl >= 0
                    ? colors.green(`+$${pos.pnl.toFixed(2)}`)
                    : colors.red(`-$${Math.abs(pos.pnl).toFixed(2)}`);
            const marketLabel = (pos.market || 'Unknown market').slice(0, 50);
            console.log(`  ${i + 1}. ${marketLabel}`);
            console.log(`     Outcome: ${pos.outcome} | P&L: ${pnlStr}`);
        });

        if (closedPositions.length > 5) {
            console.log(
                colors.gray(`\n  ... and ${closedPositions.length - 5} more closed positions`)
            );
        }
    }

    console.log('\n' + colors.cyan('═'.repeat(80)) + '\n');
}

async function main() {
    console.log(colors.cyan('\n🚀 POLYMARKET COPY TRADING PROFITABILITY SIMULATOR (OLD LOGIC)\n'));
    console.log(colors.gray(`Trader: ${TRADER_ADDRESS}`));
    console.log(colors.gray(`Starting Capital: $${STARTING_CAPITAL}`));
    console.log(colors.gray(`Multiplier: ${MULTIPLIER}x`));
    console.log(
        colors.gray(`History window: ${HISTORY_DAYS} day(s), max trades: ${MAX_TRADES_LIMIT}\n`)
    );

    try {
        const trades = await fetchTraderActivity();
        const result = await simulateCopyTradingOldLogic(trades);
        printReport(result);

        // Save to JSON file
        const fs = await import('fs');
        const path = await import('path');
        const resultsDir = path.join(process.cwd(), 'simulation_results');

        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const tag = (() => {
            const raw = process.env.SIM_RESULT_TAG;
            if (!raw) return '';
            return '_' + raw.trim().replace(/[^a-zA-Z0-9-_]+/g, '-');
        })();
        const filename = `old_logic_${TRADER_ADDRESS}_${HISTORY_DAYS}d${tag}_${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(resultsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(result, null, 2), 'utf8');
        console.log(colors.green(`✓ Results saved to: ${filepath}\n`));

        console.log(colors.green('✓ Simulation completed successfully!\n'));
    } catch (error) {
        console.error(colors.red('\n✗ Simulation failed:'), error);
        process.exit(1);
    }
}

main();
