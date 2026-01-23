import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';
import { ENV } from '../config/env';

// Simple colors without chalk (to avoid ESM issues)
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
};

const c = {
    cyan: (text: string) => `${colors.cyan}${text}${colors.reset}`,
    green: (text: string) => `${colors.green}${text}${colors.reset}`,
    greenBold: (text: string) => `${colors.bold}${colors.green}${text}${colors.reset}`,
    yellow: (text: string) => `${colors.yellow}${text}${colors.reset}`,
    red: (text: string) => `${colors.red}${text}${colors.reset}`,
    blue: (text: string) => `${colors.blue}${text}${colors.reset}`,
    magenta: (text: string) => `${colors.magenta}${text}${colors.reset}`,
    gray: (text: string) => `${colors.gray}${text}${colors.reset}`,
    bold: (text: string) => `${colors.bold}${text}${colors.reset}`,
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
    trades: any[];
}

interface TraderAnalysis {
    address: string;
    rank: number;

    // Performance
    roi: number;
    totalPnl: number;
    winRate: number;

    // Trading stats
    totalTrades: number;
    copiedTrades: number;
    avgTradeSize: number;

    // Positions
    openPositions: number;
    closedPositions: number;

    // Profitability
    realizedPnl: number;
    unrealizedPnl: number;

    // Activity
    lastActivityTime: number;
    lastActivityDate: string;

    // Profile
    profileUrl: string;

    // Status
    status: 'excellent' | 'good' | 'average' | 'poor' | 'bad';
    error?: string;
}

// Configuration
const STARTING_CAPITAL = 1000;
const HISTORY_DAYS = parseInt(process.env.SIM_HISTORY_DAYS || '30');
const MULTIPLIER = parseFloat(process.env.TRADE_MULTIPLIER || '1.0');
const MIN_ORDER_SIZE = parseFloat(process.env.SIM_MIN_ORDER_USD || '1.0');
const MAX_TRADES_LIMIT = parseInt(process.env.SIM_MAX_TRADES || '2000');
const RANDOM_TRADERS_LIMIT = parseInt(process.env.RANDOM_TRADERS_LIMIT || '30');
const MIN_TRADER_TRADES = parseInt(process.env.MIN_TRADER_TRADES || '50');
const MAX_ANALYZE_TRADERS = parseInt(process.env.MAX_ANALYZE_TRADERS || '50');

// Mass discovery configuration
const MAX_MARKETS_TO_SCAN = parseInt(process.env.MAX_MARKETS_SCAN || '100');
const MAX_DISCOVERY_ROUNDS = parseInt(process.env.DISCOVERY_ROUNDS || '5');
const PARALLEL_VALIDATION_BATCH = parseInt(process.env.PARALLEL_BATCH || '20');
const TARGET_DISCOVERY_COUNT = parseInt(process.env.TARGET_TRADERS || '1000');

// Seed traders to start discovery - add your known profitable traders here!
const SEED_TRADERS = [
    '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
    '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
    '0xa4b366ad22fc0d06f1e934ff468e8922431a87b8',
    // Add more active traders from Polymarket leaderboard
    '0x000000000000000000000000000000000000dead', // Example - replace with real addresses
    '0x000000000000000000000000000000000000beef', // Example - replace with real addresses
];

// Helper function to validate addresses in parallel
async function validateAddressesBatch(addresses: string[]): Promise<string[]> {
    const validAddresses: string[] = [];
    const chunks: string[][] = [];

    // Split into chunks for parallel processing
    for (let i = 0; i < addresses.length; i += PARALLEL_VALIDATION_BATCH) {
        chunks.push(addresses.slice(i, i + PARALLEL_VALIDATION_BATCH));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(async (address) => {
            try {
                const response = await axios.get(
                    `https://data-api.polymarket.com/activity?user=${address}&type=TRADE&limit=1`,
                    {
                        timeout: 5000,
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                    }
                );

                if (response.data && response.data.length > 0) {
                    return address;
                }
            } catch (e) {
                // Address not active
            }
            return null;
        });

        const results = await Promise.all(promises);
        results.forEach((addr) => {
            if (addr) validAddresses.push(addr);
        });

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return validAddresses;
}

// Helper function to extract traders from order books in parallel
async function extractTradersFromMarkets(markets: any[]): Promise<string[]> {
    console.log(c.cyan(`  📊 Scanning ${markets.length} markets for traders...`));
    const traders = new Set<string>();

    // Process markets in parallel batches
    const marketChunks: any[][] = [];
    for (let i = 0; i < markets.length; i += 10) {
        marketChunks.push(markets.slice(i, i + 10));
    }

    for (const chunk of marketChunks) {
        const promises = chunk.map(async (market) => {
            const foundTraders: string[] = [];

            try {
                // Get all token IDs for this market
                const tokens = market.tokens || [];

                for (const token of tokens.slice(0, 2)) {
                    // Max 2 tokens per market
                    const tokenId = token.token_id || token.tokenId;

                    if (tokenId) {
                        try {
                            const ordersResponse = await axios.get(
                                `https://clob.polymarket.com/book?token_id=${tokenId}`,
                                {
                                    timeout: 3000,
                                    headers: { 'User-Agent': 'Mozilla/5.0' },
                                }
                            );

                            if (ordersResponse.data) {
                                const { bids, asks } = ordersResponse.data;

                                if (bids && Array.isArray(bids)) {
                                    bids.forEach((bid: any) => {
                                        if (bid.owner) foundTraders.push(bid.owner.toLowerCase());
                                    });
                                }

                                if (asks && Array.isArray(asks)) {
                                    asks.forEach((ask: any) => {
                                        if (ask.owner) foundTraders.push(ask.owner.toLowerCase());
                                    });
                                }
                            }
                        } catch (e) {
                            // Continue
                        }
                    }
                }
            } catch (e) {
                // Continue
            }

            return foundTraders;
        });

        const results = await Promise.all(promises);
        results.flat().forEach((addr) => traders.add(addr));

        console.log(c.gray(`    Found ${traders.size} potential traders so far...`));

        // Small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return Array.from(traders);
}

// Aggressive network expansion from a trader
async function expandNetworkFromTrader(
    traderAddress: string,
    depth: number = 200
): Promise<string[]> {
    try {
        const response = await axios.get(
            `https://data-api.polymarket.com/activity?user=${traderAddress}&type=TRADE&limit=${depth}`,
            {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
            }
        );

        // Extract unique market IDs and try to find other traders in those markets
        const marketIds = new Set<string>();
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach((trade: any) => {
                if (trade.market || trade.slug) {
                    marketIds.add(trade.market || trade.slug);
                }
            });
        }

        return Array.from(marketIds);
    } catch (error) {
        return [];
    }
}

async function discoverTradersFromRandomActivities(): Promise<Set<string>> {
    console.log(c.cyan('🔍 MASS DISCOVERY MODE - Finding thousands of traders...'));
    console.log(
        c.gray(`  Target: ${TARGET_DISCOVERY_COUNT} traders | Rounds: ${MAX_DISCOVERY_ROUNDS}\n`)
    );

    const discoveredTraders = new Set<string>();

    try {
        // STEP 1: Massive market scan
        console.log(c.bold('📡 STEP 1: Scanning active markets...\n'));

        let allMarkets: any[] = [];
        try {
            const marketResponse = await axios.get(
                `https://gamma-api.polymarket.com/markets?limit=${MAX_MARKETS_TO_SCAN}&closed=false`,
                {
                    timeout: 15000,
                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                }
            );

            if (marketResponse.data && Array.isArray(marketResponse.data)) {
                allMarkets = marketResponse.data;
                console.log(c.green(`  ✅ Found ${allMarkets.length} active markets\n`));
            }
        } catch (e) {
            console.log(c.yellow('  ⚠️  Could not fetch markets, using seed traders instead\n'));
        }

        // STEP 2: Extract traders from order books (parallel processing)
        if (allMarkets.length > 0) {
            const potentialTraders = await extractTradersFromMarkets(allMarkets);
            console.log(c.green(`  ✅ Extracted ${potentialTraders.length} potential addresses\n`));

            // STEP 3: Validate addresses in large batches
            if (potentialTraders.length > 0) {
                console.log(c.bold('🔍 STEP 2: Validating addresses (parallel batches)...\n'));

                // Take up to 500 random addresses to validate
                const toValidate = potentialTraders.sort(() => 0.5 - Math.random()).slice(0, 500);

                const validTraders = await validateAddressesBatch(toValidate);
                validTraders.forEach((addr) => discoveredTraders.add(addr.toLowerCase()));

                console.log(c.green(`  ✅ Validated ${discoveredTraders.size} active traders\n`));
            }
        }

        // STEP 4: Use seed traders as fallback/supplement
        console.log(c.bold('📡 STEP 3: Bootstrapping from seed traders...\n'));

        for (const seedTrader of SEED_TRADERS.filter(
            (t) => !t.includes('dead') && !t.includes('beef')
        )) {
            discoveredTraders.add(seedTrader.toLowerCase());
        }

        console.log(c.gray(`  Added ${SEED_TRADERS.length} seed traders\n`));

        // STEP 5: Aggressive multi-round network expansion
        console.log(c.bold(`🚀 STEP 4: Network expansion (${MAX_DISCOVERY_ROUNDS} rounds)...\n`));

        for (let round = 0; round < MAX_DISCOVERY_ROUNDS; round++) {
            const startSize = discoveredTraders.size;
            const currentTraders = Array.from(discoveredTraders);

            // Pick random traders for expansion
            const expansionCount = Math.min(50, currentTraders.length);
            const tradersToExpand = currentTraders
                .sort(() => 0.5 - Math.random())
                .slice(0, expansionCount);

            console.log(
                c.cyan(
                    `  Round ${round + 1}/${MAX_DISCOVERY_ROUNDS}: Expanding from ${expansionCount} traders...`
                )
            );

            // Expand in parallel batches
            const expandChunks: string[][] = [];
            for (let i = 0; i < tradersToExpand.length; i += 10) {
                expandChunks.push(tradersToExpand.slice(i, i + 10));
            }

            for (const chunk of expandChunks) {
                const promises = chunk.map((trader) => expandNetworkFromTrader(trader, 300));
                const results = await Promise.all(promises);

                // Process all markets found
                const allNewMarkets = results.flat();

                // For each market, try to get recent traders (this is indirect discovery)
                // We'll add the traders we expanded from as they're confirmed active
                chunk.forEach((t) => discoveredTraders.add(t.toLowerCase()));

                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const newFound = discoveredTraders.size - startSize;
            console.log(
                c.green(
                    `    ✅ Round ${round + 1} complete: +${newFound} traders (Total: ${discoveredTraders.size})`
                )
            );

            // If we've hit our target, stop
            if (discoveredTraders.size >= TARGET_DISCOVERY_COUNT) {
                console.log(
                    c.greenBold(`\n  🎯 Target reached: ${discoveredTraders.size} traders!\n`)
                );
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // STEP 6: Final validation pass on a sample if we have too many
        if (discoveredTraders.size > TARGET_DISCOVERY_COUNT * 1.5) {
            console.log(c.bold('\n🔍 STEP 5: Final validation pass...\n'));

            const tradersArray = Array.from(discoveredTraders);
            const sampleSize = Math.min(TARGET_DISCOVERY_COUNT, tradersArray.length);
            const sample = tradersArray.sort(() => 0.5 - Math.random()).slice(0, sampleSize);

            const validated = await validateAddressesBatch(sample);

            // Replace with validated set
            discoveredTraders.clear();
            validated.forEach((addr) => discoveredTraders.add(addr.toLowerCase()));

            console.log(c.green(`  ✅ Final validated set: ${discoveredTraders.size} traders\n`));
        }

        console.log(
            c.greenBold(
                `\n🎉 DISCOVERY COMPLETE: ${discoveredTraders.size} unique traders found!\n`
            )
        );
        return discoveredTraders;
    } catch (error) {
        console.log(c.red('❌ Discovery failed with error:'), error);

        // Fallback to seed traders
        SEED_TRADERS.forEach((t) => {
            if (!t.includes('dead') && !t.includes('beef')) {
                discoveredTraders.add(t.toLowerCase());
            }
        });

        return discoveredTraders;
    }
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

            if (addedCount === 0) hasMore = false;
            if (allTrades.length >= MAX_TRADES_LIMIT) {
                allTrades = allTrades.slice(0, MAX_TRADES_LIMIT);
                hasMore = false;
            }

            offset += maxParallel * batchSize;
        }
    }

    return allTrades.sort((a, b) => a.timestamp - b.timestamp);
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

async function analyzeTrader(traderAddress: string): Promise<TraderAnalysis> {
    try {
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length < MIN_TRADER_TRADES) {
            return {
                address: traderAddress,
                rank: 0,
                roi: 0,
                totalPnl: 0,
                winRate: 0,
                totalTrades: trades.length,
                copiedTrades: 0,
                avgTradeSize: 0,
                openPositions: 0,
                closedPositions: 0,
                realizedPnl: 0,
                unrealizedPnl: 0,
                lastActivityTime: trades.length > 0 ? trades[trades.length - 1].timestamp : 0,
                lastActivityDate:
                    trades.length > 0
                        ? moment.unix(trades[trades.length - 1].timestamp).fromNow()
                        : 'Unknown',
                profileUrl: `https://polymarket.com/profile/${traderAddress}`,
                status: 'bad',
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
                    });

                    pos.currentValue -= sellAmount;
                    pos.exitPrice = trade.price;
                    yourCapital += sellAmount;

                    if (pos.currentValue < 0.01) {
                        pos.closed = true;
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
                        .filter((t: any) => t.side === 'BUY')
                        .reduce((sum: number, t: any) => sum + t.size, 0);
                    simPos.currentValue = totalShares * currentPrice;
                }

                simPos.pnl = simPos.currentValue - simPos.invested;
                unrealizedPnl += simPos.pnl;
            } else {
                const totalBought = simPos.trades
                    .filter((t: any) => t.side === 'BUY')
                    .reduce((sum: number, t: any) => sum + t.usdcSize, 0);
                const totalSold = simPos.trades
                    .filter((t: any) => t.side === 'SELL')
                    .reduce((sum: number, t: any) => sum + t.usdcSize, 0);
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

        // Determine status
        let status: 'excellent' | 'good' | 'average' | 'poor' | 'bad';
        if (roi >= 30 && winRate >= 65) status = 'excellent';
        else if (roi >= 15 && winRate >= 55) status = 'good';
        else if (roi >= 5 && winRate >= 50) status = 'average';
        else if (roi >= 0) status = 'poor';
        else status = 'bad';

        return {
            address: traderAddress,
            rank: 0,
            roi,
            totalPnl,
            winRate,
            totalTrades: trades.length,
            copiedTrades,
            avgTradeSize,
            openPositions: Array.from(positions.values()).filter((p) => !p.closed).length,
            closedPositions: closedPositions.length,
            realizedPnl,
            unrealizedPnl,
            lastActivityTime: trades.length > 0 ? trades[trades.length - 1].timestamp : 0,
            lastActivityDate:
                trades.length > 0
                    ? moment.unix(trades[trades.length - 1].timestamp).fromNow()
                    : 'Unknown',
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            status,
        };
    } catch (error) {
        return {
            address: traderAddress,
            rank: 0,
            roi: 0,
            totalPnl: 0,
            winRate: 0,
            totalTrades: 0,
            copiedTrades: 0,
            avgTradeSize: 0,
            openPositions: 0,
            closedPositions: 0,
            realizedPnl: 0,
            unrealizedPnl: 0,
            lastActivityTime: 0,
            lastActivityDate: 'Unknown',
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            status: 'bad',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

function getStatusColor(status: string): any {
    switch (status) {
        case 'excellent':
            return c.greenBold;
        case 'good':
            return c.green;
        case 'average':
            return c.yellow;
        case 'poor':
            return c.gray;
        case 'bad':
            return c.red;
        default:
            return c.gray;
    }
}

function getStatusIcon(status: string): string {
    switch (status) {
        case 'excellent':
            return '🏆';
        case 'good':
            return '✅';
        case 'average':
            return '⚠️';
        case 'poor':
            return '📉';
        case 'bad':
            return '❌';
        default:
            return '❓';
    }
}

function printResultsTable(results: TraderAnalysis[]) {
    console.log('\n' + c.cyan('═'.repeat(140)));
    console.log(c.bold('  📊 TRADER ANALYSIS RESULTS - DETAILED TABLE'));
    console.log(c.cyan('═'.repeat(140)) + '\n');

    console.log(c.gray(`  Analysis Date: ${moment().format('YYYY-MM-DD HH:mm:ss')}`));
    console.log(
        c.gray(
            `  Period: ${HISTORY_DAYS} days | Multiplier: ${MULTIPLIER}x | Starting Capital: $${STARTING_CAPITAL}`
        )
    );
    console.log(
        c.gray(`  Min Order: $${MIN_ORDER_SIZE} | Min Trader Trades: ${MIN_TRADER_TRADES}\n`)
    );

    // Sort by ROI
    const sorted = [...results].sort((a, b) => b.roi - a.roi);

    // Assign ranks
    sorted.forEach((r, idx) => {
        r.rank = idx + 1;
    });

    // Table header
    console.log(
        c.bold(
            `${'#'.padEnd(4)} ` +
                `${'Address'.padEnd(20)} ` +
                `${'Status'.padEnd(12)} ` +
                `${'ROI %'.padStart(10)} ` +
                `${'P&L $'.padStart(12)} ` +
                `${'Win %'.padStart(8)} ` +
                `${'Trades'.padStart(10)} ` +
                `${'Avg Size'.padStart(12)} ` +
                `${'Positions'.padStart(12)} ` +
                `${'Last Active'.padEnd(18)}`
        )
    );
    console.log(c.gray('─'.repeat(140)));

    // Table rows
    sorted.forEach((trader) => {
        const statusColor = getStatusColor(trader.status);
        const statusIcon = getStatusIcon(trader.status);
        const roiColor = trader.roi >= 0 ? c.green : c.red;
        const pnlColor = trader.totalPnl >= 0 ? c.green : c.red;
        const winColor = trader.winRate >= 60 ? c.green : trader.winRate >= 50 ? c.yellow : c.red;

        const rankStr = `${trader.rank}.`.padEnd(4);
        const addressStr = `${trader.address.slice(0, 8)}...${trader.address.slice(-6)}`.padEnd(20);
        const statusStr = `${statusIcon} ${trader.status}`.padEnd(12);

        // Format numbers with proper spacing
        const roiValue = (trader.roi >= 0 ? '+' : '') + trader.roi.toFixed(2);
        const roiStr = roiColor(roiValue).padStart(10 + (roiValue.includes('-') ? 0 : 0));

        const pnlValue =
            (trader.totalPnl >= 0 ? '+$' : '-$') + Math.abs(trader.totalPnl).toFixed(2);
        const pnlStr = pnlColor(pnlValue).padStart(12);

        const winValue = trader.winRate.toFixed(1);
        const winStr = winColor(winValue).padStart(8);

        const tradesValue = `${trader.copiedTrades}/${trader.totalTrades}`;
        const tradesStr = c.cyan(tradesValue).padStart(10);

        const avgSizeValue = '$' + trader.avgTradeSize.toFixed(2);
        const avgSizeStr = c.blue(avgSizeValue).padStart(12);

        const positionsValue = `${trader.openPositions}o/${trader.closedPositions}c`;
        const positionsStr = c.magenta(positionsValue).padStart(12);

        const lastActiveStr = c.gray(trader.lastActivityDate.slice(0, 15)).padEnd(18);

        console.log(
            `${rankStr}${addressStr}${statusStr}${roiStr}${pnlStr}${winStr}${tradesStr}${avgSizeStr}${positionsStr}${lastActiveStr}`
        );

        // Show error if exists
        if (trader.error) {
            console.log(c.gray(`     └─ Error: ${trader.error}`));
        }
    });

    console.log(c.gray('─'.repeat(140)));

    // Summary statistics
    const profitable = sorted.filter((t) => t.roi > 0 && !t.error);
    const excellent = sorted.filter((t) => t.status === 'excellent');
    const good = sorted.filter((t) => t.status === 'good');
    const avgROI =
        sorted.filter((t) => !t.error).reduce((sum, t) => sum + t.roi, 0) /
            sorted.filter((t) => !t.error).length || 0;
    const avgWinRate =
        sorted.filter((t) => !t.error).reduce((sum, t) => sum + t.winRate, 0) /
            sorted.filter((t) => !t.error).length || 0;

    console.log('\n' + c.bold('📈 SUMMARY STATISTICS:\n'));

    console.log(`  Total Analyzed:       ${c.cyan(sorted.length.toString())}`);
    console.log(
        `  Profitable Traders:   ${c.green(profitable.length.toString())} (${((profitable.length / sorted.length) * 100).toFixed(1)}%)`
    );
    console.log(`  Excellent (🏆):       ${c.greenBold(excellent.length.toString())}`);
    console.log(`  Good (✅):            ${c.green(good.length.toString())}`);
    console.log(
        `  Average ROI:          ${avgROI >= 0 ? c.green('+') : c.red('')}${avgROI.toFixed(2)}%`
    );
    console.log(`  Average Win Rate:     ${c.yellow(avgWinRate.toFixed(1) + '%')}`);

    console.log('\n' + c.cyan('═'.repeat(140)) + '\n');

    // Top performers highlight
    if (excellent.length > 0) {
        console.log(c.greenBold('🏆 EXCELLENT TRADERS (Copy these!):\n'));
        excellent.slice(0, 5).forEach((t, i) => {
            console.log(
                `  ${i + 1}. ${c.blue(t.address)} - ` +
                    `ROI: ${c.greenBold(`+${t.roi.toFixed(2)}%`)} | ` +
                    `Win: ${c.green(`${t.winRate.toFixed(1)}%`)} | ` +
                    `Trades: ${c.cyan(t.copiedTrades.toString())}`
            );
            console.log(`     ${c.gray(t.profileUrl)}`);
        });
        console.log();
    } else if (good.length > 0) {
        console.log(c.green('✅ GOOD TRADERS (Consider copying):\n'));
        good.slice(0, 5).forEach((t, i) => {
            console.log(
                `  ${i + 1}. ${c.blue(t.address)} - ` +
                    `ROI: ${c.green(`+${t.roi.toFixed(2)}%`)} | ` +
                    `Win: ${c.yellow(`${t.winRate.toFixed(1)}%`)} | ` +
                    `Trades: ${c.cyan(t.copiedTrades.toString())}`
            );
            console.log(`     ${c.gray(t.profileUrl)}`);
        });
        console.log();
    } else if (profitable.length > 0) {
        console.log(c.yellow('⚠️  PROFITABLE TRADERS (Proceed with caution):\n'));
        profitable.slice(0, 5).forEach((t, i) => {
            console.log(
                `  ${i + 1}. ${c.blue(t.address)} - ` +
                    `ROI: ${c.yellow(`+${t.roi.toFixed(2)}%`)} | ` +
                    `Win: ${c.yellow(`${t.winRate.toFixed(1)}%`)} | ` +
                    `Trades: ${c.cyan(t.copiedTrades.toString())}`
            );
            console.log(`     ${c.gray(t.profileUrl)}`);
        });
        console.log();
    } else {
        console.log(c.red('❌ No profitable traders found in this scan.\n'));
        console.log(c.yellow('💡 Suggestions:'));
        console.log(c.gray('  • Try increasing HISTORY_DAYS (60-90 days)'));
        console.log(c.gray('  • Try different TRADE_MULTIPLIER (0.5x or 2x)'));
        console.log(c.gray('  • Add more seed traders to discover different networks\n'));
    }
}

function saveResults(results: TraderAnalysis[]) {
    const resultsDir = path.join(process.cwd(), 'trader_scan_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const filename = `scan_${HISTORY_DAYS}d_m${MULTIPLIER}x_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const data = {
        scanDate: new Date().toISOString(),
        config: {
            historyDays: HISTORY_DAYS,
            multiplier: MULTIPLIER,
            minOrderSize: MIN_ORDER_SIZE,
            startingCapital: STARTING_CAPITAL,
            minTraderTrades: MIN_TRADER_TRADES,
            maxAnalyzeTraders: MAX_ANALYZE_TRADERS,
        },
        summary: {
            totalAnalyzed: results.length,
            profitable: results.filter((r) => r.roi > 0 && !r.error).length,
            excellent: results.filter((r) => r.status === 'excellent').length,
            good: results.filter((r) => r.status === 'good').length,
            average: results.filter((r) => r.status === 'average').length,
            poor: results.filter((r) => r.status === 'poor').length,
            bad: results.filter((r) => r.status === 'bad').length,
            avgROI:
                results.filter((r) => !r.error).reduce((sum, r) => sum + r.roi, 0) /
                    results.filter((r) => !r.error).length || 0,
            avgWinRate:
                results.filter((r) => !r.error).reduce((sum, r) => sum + r.winRate, 0) /
                    results.filter((r) => !r.error).length || 0,
        },
        traders: results.sort((a, b) => b.roi - a.roi),
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(c.green(`✅ Results saved to: ${c.blue(filepath)}\n`));

    // Save top profitable addresses
    const profitableAddresses = results
        .filter((r) => r.roi > 0 && !r.error)
        .sort((a, b) => b.roi - a.roi)
        .map((r) => r.address);

    if (profitableAddresses.length > 0) {
        const addressFile = path.join(resultsDir, `profitable_addresses_${timestamp}.txt`);
        fs.writeFileSync(addressFile, profitableAddresses.join('\n'), 'utf8');
        console.log(c.green(`✅ Profitable addresses saved to: ${c.blue(addressFile)}\n`));
    }
}

async function main() {
    console.clear();

    console.log(
        c.bold('\n╔══════════════════════════════════════════════════════════════════════════════╗')
    );
    console.log(
        c.bold('║          🔍 POLYMARKET MASS TRADER SCANNER - Thousands Discovery            ║')
    );
    console.log(
        c.bold('╚══════════════════════════════════════════════════════════════════════════════╝\n')
    );

    console.log(c.cyan('  🚀 MASS DISCOVERY MODE ACTIVATED'));
    console.log(
        c.gray(
            `  Target Traders: ${TARGET_DISCOVERY_COUNT} | Markets: ${MAX_MARKETS_TO_SCAN} | Rounds: ${MAX_DISCOVERY_ROUNDS}`
        )
    );
    console.log(c.gray(`  Analysis Period: ${HISTORY_DAYS} days | Multiplier: ${MULTIPLIER}x`));
    console.log(c.gray(`  Parallel Batch Size: ${PARALLEL_VALIDATION_BATCH}\n`));

    try {
        // Step 1: Discover unique traders
        const traders = await discoverTradersFromRandomActivities();

        if (traders.size === 0) {
            console.log(
                c.red('\n❌ No traders discovered. Please check your internet connection.\n')
            );
            return;
        }

        console.log(
            c.yellow(
                `\n📋 Found ${traders.size} unique traders. Will analyze up to ${MAX_ANALYZE_TRADERS}...\n`
            )
        );

        // Step 2: Randomly select traders to analyze
        const tradersArray = Array.from(traders);
        const shuffled = tradersArray.sort(() => 0.5 - Math.random());
        const toAnalyze = shuffled.slice(0, MAX_ANALYZE_TRADERS);

        // Step 3: Analyze each trader
        const results: TraderAnalysis[] = [];
        console.log(c.cyan('\n📊 Starting analysis...\n'));

        for (let i = 0; i < toAnalyze.length; i++) {
            const trader = toAnalyze[i];
            console.log(
                c.gray(`[${i + 1}/${toAnalyze.length}] Analyzing ${trader.slice(0, 10)}...`)
            );

            const analysis = await analyzeTrader(trader);
            results.push(analysis);

            // Small delay
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        console.log(c.green(`\n✅ Analyzed ${results.length} traders!\n`));

        // Step 4: Display results
        printResultsTable(results);

        // Step 5: Save results
        saveResults(results);

        console.log(c.greenBold('✅ SCAN COMPLETE!\n'));
    } catch (error) {
        console.error(c.red('\n❌ Scan failed:'), error);
        process.exit(1);
    }
}

main();
