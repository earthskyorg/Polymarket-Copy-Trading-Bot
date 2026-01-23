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

interface Bet {
    id: string;
    market: string;
    outcome: string;
    owner: string;
    price: number;
    size: number;
    usdcSize: number;
    timestamp: number;
    side: 'BUY' | 'SELL';
}

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

interface TraderStats {
    address: string;
    totalBets: number;
    totalVolume: number;
    avgBetSize: number;
    lastBetTime: number;
    markets: Set<string>;
    outcomes: { YES: number; NO: number };
}

interface TraderResult {
    address: string;
    rank: number;
    profileUrl: string;

    // Simulation results
    roi: number;
    totalPnl: number;
    startingCapital: number;
    currentCapital: number;

    // Trade stats
    totalTrades: number;
    copiedTrades: number;
    skippedTrades: number;
    avgTradeSize: number;

    // Performance metrics
    winRate: number;
    realizedPnl: number;
    unrealizedPnl: number;
    sharpeRatio?: number;
    maxDrawdown?: number;

    // Position stats
    openPositions: number;
    closedPositions: number;

    // Activity stats
    totalBets: number;
    totalVolume: number;
    avgBetSize: number;
    uniqueMarkets: number;
    lastActivity: string;

    // Time
    simulationTime: number;
    error?: string;
}

// Configuration
const STARTING_CAPITAL = 1000;
const HISTORY_DAYS = parseInt(process.env.SIM_HISTORY_DAYS || '30');
const MULTIPLIER = parseFloat(process.env.TRADE_MULTIPLIER || '1.0');
const MIN_ORDER_SIZE = parseFloat(process.env.SIM_MIN_ORDER_USD || '1.0');
const MAX_TRADES_LIMIT = parseInt(process.env.SIM_MAX_TRADES || '2000');
const MIN_TRADER_VOLUME = parseFloat(process.env.MIN_TRADER_VOLUME || '500'); // Minimum $500 volume
const MIN_TRADER_BETS = parseInt(process.env.MIN_TRADER_BETS || '50'); // Minimum 50 bets
const SCAN_MARKETS_LIMIT = parseInt(process.env.SCAN_MARKETS_LIMIT || '20'); // Scan top 20 markets
const TOP_TRADERS_COUNT = parseInt(process.env.TOP_TRADERS_COUNT || '20'); // Export top 20 traders

async function fetchActiveMarkets(limit: number = 50): Promise<any[]> {
    try {
        console.log(colors.cyan(`📊 Fetching active markets from known traders...`));

        // Use CLOB API or alternative approach - get activity from known seed traders
        const seedTraders = [
            '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
            '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
            '0xa4b366ad22fc0d06f1e934ff468e8922431a87b8',
        ];

        const markets = new Map<string, any>();

        // Get markets from recent trades of seed traders
        for (const trader of seedTraders) {
            try {
                const response = await axios.get(
                    `https://data-api.polymarket.com/activity?user=${trader}&type=TRADE&limit=50`,
                    {
                        timeout: 10000,
                        headers: {
                            'User-Agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        },
                    }
                );

                for (const trade of response.data) {
                    if (trade.market || trade.slug) {
                        const marketId = trade.asset || trade.market;
                        const marketName = trade.slug || trade.market || 'Unknown';

                        if (!markets.has(marketId)) {
                            markets.set(marketId, {
                                conditionId: marketId,
                                question: marketName,
                                slug: marketName,
                                volume: 0,
                            });
                        }
                    }
                }
            } catch (e) {
                // Continue with next trader
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const marketList = Array.from(markets.values()).slice(0, limit);
        console.log(colors.green(`✓ Found ${marketList.length} active markets`));

        return marketList;
    } catch (error) {
        console.error(colors.red('Error fetching markets:'), error);
        return [];
    }
}

async function fetchRecentTrades(traderAddress: string, limit: number = 100): Promise<Bet[]> {
    try {
        const response = await axios.get(
            `https://data-api.polymarket.com/activity?user=${traderAddress}&type=TRADE&limit=${limit}`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        return response.data
            .map((trade: any) => ({
                id: trade.id || trade.transactionHash,
                market: trade.slug || trade.market || 'Unknown',
                outcome: trade.outcome || 'Unknown',
                owner: traderAddress.toLowerCase(),
                price: trade.price,
                size: trade.size,
                usdcSize: trade.usdcSize || trade.size * trade.price,
                timestamp: trade.timestamp,
                side: trade.side || 'BUY',
            }))
            .filter((bet: Bet) => bet.usdcSize > 0);
    } catch (error) {
        return [];
    }
}

async function scanTradersFromBets(): Promise<Map<string, TraderStats>> {
    console.log(colors.cyan('\n🔍 SCANNING POLYMARKET FOR ACTIVE TRADERS...\n'));

    const traders = new Map<string, TraderStats>();

    // Seed traders - we'll use these to discover more traders from their activity
    const seedTraders = [
        '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
        '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
        '0xa4b366ad22fc0d06f1e934ff468e8922431a87b8',
        '0x1d6f28dd53759f7ecf4a8e72dd890bcd2e42f766',
        '0x2a76e6c3f5b6f2e5e5c8f4b2e5e5c8f4b2e5e5c8',
    ];

    console.log(
        colors.gray(`Starting with ${seedTraders.length} seed traders to discover network...\n`)
    );

    // First, get all seed traders' stats
    for (let i = 0; i < seedTraders.length; i++) {
        const trader = seedTraders[i];
        console.log(
            colors.gray(
                `[${i + 1}/${seedTraders.length}] Scanning seed trader: ${trader.slice(0, 10)}...`
            )
        );

        const bets = await fetchRecentTrades(trader, 200);

        if (bets.length === 0) {
            console.log(colors.yellow(`   ⚠️  No bets found`));
            continue;
        }

        console.log(colors.green(`   ✓ Found ${bets.length} bets`));

        // Aggregate trader stats
        for (const bet of bets) {
            if (!bet.owner) continue;

            const traderStats = traders.get(bet.owner) || {
                address: bet.owner,
                totalBets: 0,
                totalVolume: 0,
                avgBetSize: 0,
                lastBetTime: 0,
                markets: new Set<string>(),
                outcomes: { YES: 0, NO: 0 },
            };

            traderStats.totalBets++;
            traderStats.totalVolume += bet.usdcSize;
            traderStats.lastBetTime = Math.max(traderStats.lastBetTime, bet.timestamp);
            traderStats.markets.add(bet.market);

            if (bet.outcome.toLowerCase().includes('yes')) {
                traderStats.outcomes.YES++;
            } else if (bet.outcome.toLowerCase().includes('no')) {
                traderStats.outcomes.NO++;
            }

            traders.set(bet.owner, traderStats);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Now discover more traders - get top traders by volume and scan them too
    const topDiscovered = Array.from(traders.values())
        .filter((t) => !seedTraders.includes(t.address))
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, Math.min(SCAN_MARKETS_LIMIT, 15));

    if (topDiscovered.length > 0) {
        console.log(
            colors.cyan(
                `\n🔎 Expanding search with ${topDiscovered.length} discovered traders...\n`
            )
        );

        for (let i = 0; i < topDiscovered.length; i++) {
            const discoveredTrader = topDiscovered[i];
            console.log(
                colors.gray(
                    `[${i + 1}/${topDiscovered.length}] Scanning: ${discoveredTrader.address.slice(0, 10)}...`
                )
            );

            const bets = await fetchRecentTrades(discoveredTrader.address, 100);

            if (bets.length > 0) {
                console.log(colors.green(`   ✓ Found ${bets.length} bets`));

                for (const bet of bets) {
                    if (!bet.owner) continue;

                    const traderStats = traders.get(bet.owner) || {
                        address: bet.owner,
                        totalBets: 0,
                        totalVolume: 0,
                        avgBetSize: 0,
                        lastBetTime: 0,
                        markets: new Set<string>(),
                        outcomes: { YES: 0, NO: 0 },
                    };

                    traderStats.totalBets++;
                    traderStats.totalVolume += bet.usdcSize;
                    traderStats.lastBetTime = Math.max(traderStats.lastBetTime, bet.timestamp);
                    traderStats.markets.add(bet.market);

                    if (bet.outcome.toLowerCase().includes('yes')) {
                        traderStats.outcomes.YES++;
                    } else if (bet.outcome.toLowerCase().includes('no')) {
                        traderStats.outcomes.NO++;
                    }

                    traders.set(bet.owner, traderStats);
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }

    // Calculate average bet sizes
    for (const [address, stats] of traders.entries()) {
        stats.avgBetSize = stats.totalVolume / stats.totalBets;
    }

    return traders;
}

async function fetchTraderActivityBatch(
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

        const firstBatch = await fetchTraderActivityBatch(traderAddress, 0, 100, sinceTimestamp);
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
                        fetchTraderActivityBatch(
                            traderAddress,
                            offset + i * batchSize,
                            batchSize,
                            sinceTimestamp
                        )
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

async function simulateTrader(
    traderAddress: string,
    traderStats: TraderStats
): Promise<TraderResult> {
    const startTime = Date.now();

    try {
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length < MIN_TRADER_BETS) {
            return {
                address: traderAddress,
                rank: 0,
                profileUrl: `https://polymarket.com/profile/${traderAddress}`,
                roi: 0,
                totalPnl: 0,
                startingCapital: STARTING_CAPITAL,
                currentCapital: STARTING_CAPITAL,
                totalTrades: trades.length,
                copiedTrades: 0,
                skippedTrades: trades.length,
                avgTradeSize: 0,
                winRate: 0,
                realizedPnl: 0,
                unrealizedPnl: 0,
                openPositions: 0,
                closedPositions: 0,
                totalBets: traderStats.totalBets,
                totalVolume: traderStats.totalVolume,
                avgBetSize: traderStats.avgBetSize,
                uniqueMarkets: traderStats.markets.size,
                lastActivity: new Date(traderStats.lastBetTime * 1000).toISOString(),
                simulationTime: Date.now() - startTime,
                error: `Not enough trades (${trades.length} < ${MIN_TRADER_BETS})`,
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
            rank: 0, // Will be set later
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            roi,
            totalPnl,
            startingCapital: STARTING_CAPITAL,
            currentCapital,
            totalTrades: trades.length,
            copiedTrades,
            skippedTrades,
            avgTradeSize,
            winRate,
            realizedPnl,
            unrealizedPnl,
            openPositions: Array.from(positions.values()).filter((p) => !p.closed).length,
            closedPositions: closedPositions.length,
            totalBets: traderStats.totalBets,
            totalVolume: traderStats.totalVolume,
            avgBetSize: traderStats.avgBetSize,
            uniqueMarkets: traderStats.markets.size,
            lastActivity: new Date(traderStats.lastBetTime * 1000).toISOString(),
            simulationTime: Date.now() - startTime,
        };
    } catch (error) {
        return {
            address: traderAddress,
            rank: 0,
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            roi: 0,
            totalPnl: 0,
            startingCapital: STARTING_CAPITAL,
            currentCapital: STARTING_CAPITAL,
            totalTrades: 0,
            copiedTrades: 0,
            skippedTrades: 0,
            avgTradeSize: 0,
            winRate: 0,
            realizedPnl: 0,
            unrealizedPnl: 0,
            openPositions: 0,
            closedPositions: 0,
            totalBets: traderStats.totalBets,
            totalVolume: traderStats.totalVolume,
            avgBetSize: traderStats.avgBetSize,
            uniqueMarkets: traderStats.markets.size,
            lastActivity: new Date(traderStats.lastBetTime * 1000).toISOString(),
            simulationTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

function printScanResults(traders: Map<string, TraderStats>) {
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  📊 TRADER SCAN RESULTS'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    const traderList = Array.from(traders.values());
    const qualified = traderList.filter(
        (t) => t.totalVolume >= MIN_TRADER_VOLUME && t.totalBets >= MIN_TRADER_BETS
    );

    console.log(colors.bold('Scan Statistics:'));
    console.log(`  Total Unique Traders: ${colors.cyan(String(traderList.length))}`);
    console.log(
        `  Qualified Traders: ${colors.green(String(qualified.length))} (>$${MIN_TRADER_VOLUME} volume, >${MIN_TRADER_BETS} bets)`
    );
    console.log(`  Will Analyze: ${colors.yellow(String(Math.min(qualified.length, 50)))}\n`);

    // Show top traders by volume
    const topByVolume = [...traderList].sort((a, b) => b.totalVolume - a.totalVolume).slice(0, 5);
    console.log(colors.bold('Top 5 by Volume (before simulation):'));
    topByVolume.forEach((t, i) => {
        console.log(
            `  ${i + 1}. ${colors.blue(t.address.slice(0, 10) + '...' + t.address.slice(-8))}`
        );
        console.log(
            `     Volume: $${t.totalVolume.toFixed(2)} | Bets: ${t.totalBets} | Markets: ${t.markets.size}`
        );
    });

    console.log('\n' + colors.cyan('═'.repeat(100)) + '\n');
}

function printAnalysisResults(results: TraderResult[]) {
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  🏆 TRADER ANALYSIS RESULTS'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    console.log(colors.bold('Configuration:'));
    console.log(
        `  History: ${HISTORY_DAYS} days | Multiplier: ${MULTIPLIER}x | Min Order: $${MIN_ORDER_SIZE} | Starting Capital: $${STARTING_CAPITAL}\n`
    );

    const validResults = results.filter((r) => !r.error && r.copiedTrades > 0);

    // Sort by ROI
    const sortedByROI = [...validResults].sort((a, b) => b.roi - a.roi);

    console.log(colors.bold(colors.green(`📈 TOP ${Math.min(10, sortedByROI.length)} BY ROI:\n`)));
    sortedByROI.slice(0, 10).forEach((result, idx) => {
        const roiColor = result.roi >= 0 ? colors.green : colors.red;
        const roiSign = result.roi >= 0 ? '+' : '';
        console.log(
            `${idx + 1}. ${colors.blue(result.address.slice(0, 10) + '...' + result.address.slice(-8))}`
        );
        console.log(
            `   ROI: ${roiColor(roiSign + result.roi.toFixed(2) + '%')} | P&L: ${roiSign}$${result.totalPnl.toFixed(2)} | ` +
                `Trades: ${result.copiedTrades} | Win: ${result.winRate.toFixed(1)}% | Vol: $${result.totalVolume.toFixed(0)}`
        );
    });

    // Summary stats
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.bold('📊 SUMMARY:\n'));

    const profitableTraders = validResults.filter((r) => r.roi > 0);
    const avgROI = validResults.reduce((sum, r) => sum + r.roi, 0) / validResults.length;
    const avgWinRate = validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length;
    const totalSimulationTime = results.reduce((sum, r) => sum + r.simulationTime, 0);

    console.log(`  Analyzed: ${colors.cyan(String(results.length))} traders`);
    console.log(`  Valid Simulations: ${colors.cyan(String(validResults.length))}`);
    console.log(
        `  Profitable: ${colors.green(String(profitableTraders.length))} (${((profitableTraders.length / validResults.length) * 100).toFixed(1)}%)`
    );
    console.log(
        `  Average ROI: ${avgROI >= 0 ? colors.green('+') : colors.red('')}${avgROI.toFixed(2)}%`
    );
    console.log(`  Average Win Rate: ${colors.yellow(avgWinRate.toFixed(1) + '%')}`);
    console.log(`  Total Time: ${colors.gray((totalSimulationTime / 1000).toFixed(1) + 's')}`);

    console.log('\n' + colors.cyan('═'.repeat(100)) + '\n');
}

function saveTopTraders(results: TraderResult[]) {
    const resultsDir = path.join(process.cwd(), 'top_traders_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Filter and sort
    const validResults = results
        .filter((r) => !r.error && r.copiedTrades > 0 && r.roi > 0)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, TOP_TRADERS_COUNT);

    // Assign ranks
    validResults.forEach((r, idx) => {
        r.rank = idx + 1;
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `top_traders_${HISTORY_DAYS}d_m${MULTIPLIER}x_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const data = {
        scanDate: new Date().toISOString(),
        config: {
            historyDays: HISTORY_DAYS,
            multiplier: MULTIPLIER,
            minOrderSize: MIN_ORDER_SIZE,
            startingCapital: STARTING_CAPITAL,
            minTraderVolume: MIN_TRADER_VOLUME,
            minTraderBets: MIN_TRADER_BETS,
            scanMarketsLimit: SCAN_MARKETS_LIMIT,
        },
        summary: {
            totalScanned: results.length,
            totalProfitable: validResults.length,
            avgROI: validResults.reduce((sum, r) => sum + r.roi, 0) / validResults.length,
            avgWinRate: validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length,
        },
        topTraders: validResults,
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(colors.green(`✅ Top ${validResults.length} traders saved to: ${filepath}\n`));

    // Also save a simple list for easy copy
    const addressListPath = path.join(resultsDir, `addresses_${timestamp}.txt`);
    const addressList = validResults.map((r) => r.address).join('\n');
    fs.writeFileSync(addressListPath, addressList, 'utf8');
    console.log(colors.green(`✅ Address list saved to: ${addressListPath}\n`));
}

async function main() {
    console.log(
        colors.bold(
            colors.cyan(
                '\n╔══════════════════════════════════════════════════════════════════════════════╗'
            )
        )
    );
    console.log(
        colors.bold(
            colors.cyan(
                '║                    🔍 POLYMARKET TRADER SCANNER v2.0                         ║'
            )
        )
    );
    console.log(
        colors.bold(
            colors.cyan(
                '╚══════════════════════════════════════════════════════════════════════════════╝\n'
            )
        )
    );

    console.log(colors.gray('Scanning real-time bets and analyzing trader profitability...\n'));

    try {
        // Step 1: Scan markets and collect traders
        const traders = await scanTradersFromBets();

        if (traders.size === 0) {
            console.log(colors.red('❌ No traders found'));
            return;
        }

        printScanResults(traders);

        // Step 2: Filter qualified traders
        const qualified = Array.from(traders.entries())
            .filter(
                ([_, stats]) =>
                    stats.totalVolume >= MIN_TRADER_VOLUME && stats.totalBets >= MIN_TRADER_BETS
            )
            .sort(([_, a], [__, b]) => b.totalVolume - a.totalVolume)
            .slice(0, 50); // Analyze top 50

        console.log(
            colors.cyan(
                `\n🚀 Starting detailed analysis of ${qualified.length} qualified traders...\n`
            )
        );

        // Step 3: Simulate each trader
        const results: TraderResult[] = [];
        for (let i = 0; i < qualified.length; i++) {
            const [address, stats] = qualified[i];
            console.log(
                colors.gray(`[${i + 1}/${qualified.length}] Analyzing ${address.slice(0, 10)}...`)
            );

            const result = await simulateTrader(address, stats);
            results.push(result);

            // Show quick status
            if (!result.error && result.copiedTrades > 0) {
                const roiColor = result.roi >= 0 ? colors.green : colors.red;
                console.log(
                    `   ${roiColor(result.roi >= 0 ? '✓' : '✗')} ROI: ${result.roi.toFixed(2)}% | ` +
                        `Trades: ${result.copiedTrades} | Win: ${result.winRate.toFixed(1)}% | ` +
                        `Time: ${(result.simulationTime / 1000).toFixed(1)}s`
                );
            } else {
                console.log(`   ${colors.yellow('⚠')} ${result.error || 'No trades copied'}`);
            }

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Step 4: Print and save results
        printAnalysisResults(results);
        saveTopTraders(results);

        console.log(colors.bold(colors.green('✅ SCAN COMPLETE!\n')));
    } catch (error) {
        console.error(colors.red('\n✗ Scan failed:'), error);
        process.exit(1);
    }
}

main();
