import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ENV } from '../config/env';

// Console colors
const colors = {
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
    white: (text: string) => `\x1b[37m${text}\x1b[0m`,
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
    sharesHeld: number; // Track actual shares
    trades: {
        timestamp: number;
        side: 'BUY' | 'SELL';
        price: number;
        size: number;
        usdcSize: number;
        traderSize: number;
        yourSize: number;
    }[];
}

interface TraderAuditResult {
    address: string;
    shortAddress: string;
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
    trades: Trade[];
    positions: Map<string, SimulatedPosition>;
    error?: string;
}

interface CombinedBotResult {
    startingCapital: number;
    currentCapital: number;
    totalPnl: number;
    roi: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalTrades: number;
    copiedTrades: number;
    skippedTrades: number;
    openPositions: number;
    closedPositions: number;
    winRate: number;
    capitalPerTrader: number;
}

interface AuditReport {
    timestamp: string;
    config: {
        traders: string[];
        days: number;
        multiplier: number;
        startingCapital: number;
        minOrderSize: number;
        capitalPerTrader: number;
        copyPercentage: number; // NEW: Fixed percentage to copy
    };
    individualResults: TraderAuditResult[];
    combinedResult: CombinedBotResult;
    analysis: {
        totalProfit: number;
        totalROI: number;
        bestTrader: string;
        worstTrader: string;
        avgWinRate: number;
        diversificationBenefit: number;
        expectedCombinedROI: number;
        actualCombinedROI: number;
        roiDeviation: number;
    };
}

// Configuration from environment variables
const AUDIT_DAYS = parseInt(process.env.AUDIT_DAYS || '14');
const AUDIT_MULTIPLIER = parseFloat(process.env.AUDIT_MULTIPLIER || '1.0');
const AUDIT_STARTING_CAPITAL = parseFloat(process.env.AUDIT_STARTING_CAPITAL || '1000');
const MIN_ORDER_SIZE = parseFloat(process.env.SIM_MIN_ORDER_USD || '1.0');
const MAX_TRADES_LIMIT = parseInt(process.env.SIM_MAX_TRADES || '3000');

// NEW: Copy a fixed percentage of trader's order size instead of portfolio percentage
const COPY_PERCENTAGE = parseFloat(process.env.COPY_PERCENTAGE || '1.0'); // Copy 1% of trader's order size by default

function parseTraderAddresses(): string[] {
    const envAddresses = process.env.AUDIT_ADDRESSES || process.env.USER_ADDRESSES || '';

    if (!envAddresses) {
        console.log(colors.yellow('⚠️  No AUDIT_ADDRESSES or USER_ADDRESSES found in environment'));
        console.log(colors.yellow('    Using default test addresses...\n'));
        return [
            '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
            '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292',
        ];
    }

    if (envAddresses.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(envAddresses);
            return parsed.map((addr: string) => addr.toLowerCase().trim());
        } catch (e) {
            console.log(colors.yellow('⚠️  Failed to parse JSON array, trying comma-separated...'));
        }
    }

    return envAddresses
        .split(',')
        .map((addr) => addr.toLowerCase().trim())
        .filter((addr) => addr.length > 0);
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
        const sinceTimestamp = Math.floor((Date.now() - AUDIT_DAYS * 24 * 60 * 60 * 1000) / 1000);

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

// FIXED: Copy fixed percentage of trader's order size
async function simulateTrader(
    traderAddress: string,
    startingCapital: number
): Promise<TraderAuditResult> {
    const startTime = Date.now();
    const shortAddress = `${traderAddress.slice(0, 6)}...${traderAddress.slice(-4)}`;

    try {
        console.log(colors.gray(`  Fetching trades for ${shortAddress}...`));
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length === 0) {
            return {
                address: traderAddress,
                shortAddress,
                startingCapital,
                currentCapital: startingCapital,
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
                trades: [],
                positions: new Map(),
                error: 'No trades found',
            };
        }

        console.log(colors.gray(`  Simulating ${trades.length} trades for ${shortAddress}...`));

        let yourCapital = startingCapital;
        let totalInvested = 0;
        let copiedTrades = 0;
        let skippedTrades = 0;

        const positions = new Map<string, SimulatedPosition>();

        for (const trade of trades) {
            // FIXED: Copy fixed percentage of trader's order size
            const baseOrderSize = trade.usdcSize * (COPY_PERCENTAGE / 100);
            let orderSize = baseOrderSize * AUDIT_MULTIPLIER;

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
                        invested: 0,
                        currentValue: 0,
                        pnl: 0,
                        closed: false,
                        sharesHeld: 0,
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
                    traderSize: trade.usdcSize,
                    yourSize: orderSize,
                });

                pos.invested += orderSize;
                pos.sharesHeld += sharesReceived;
                pos.currentValue = pos.sharesHeld * trade.price;
                yourCapital -= orderSize;
                totalInvested += orderSize;
                copiedTrades++;
            } else if (trade.side === 'SELL') {
                if (positions.has(positionKey)) {
                    const pos = positions.get(positionKey)!;

                    if (pos.sharesHeld > 0) {
                        // FIXED: Sell proportionally to what we have
                        const traderSellPercent = trade.size / (trade.size + 1); // Approximate
                        const sharesToSell = Math.min(
                            pos.sharesHeld * traderSellPercent,
                            pos.sharesHeld
                        );
                        const sellValue = sharesToSell * trade.price;

                        pos.trades.push({
                            timestamp: trade.timestamp,
                            side: 'SELL',
                            price: trade.price,
                            size: sharesToSell,
                            usdcSize: sellValue,
                            traderSize: trade.usdcSize,
                            yourSize: sellValue,
                        });

                        pos.sharesHeld -= sharesToSell;
                        pos.currentValue = pos.sharesHeld * trade.price;
                        pos.exitPrice = trade.price;
                        yourCapital += sellValue;

                        if (pos.sharesHeld < 0.001) {
                            pos.closed = true;
                            pos.sharesHeld = 0;
                            pos.currentValue = 0;
                        }

                        copiedTrades++;
                    } else {
                        skippedTrades++;
                    }
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
            if (!simPos.closed && simPos.sharesHeld > 0) {
                const assetId = key.split(':')[0];
                const traderPos = traderPositions.find((tp) => tp.asset === assetId);

                if (traderPos && traderPos.size > 0) {
                    const currentPrice = traderPos.currentValue / traderPos.size;
                    simPos.currentValue = simPos.sharesHeld * currentPrice;
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
                .filter((p) => !p.closed && p.sharesHeld > 0)
                .reduce((sum, p) => sum + p.currentValue, 0);

        const totalPnl = currentCapital - startingCapital;
        const roi = (totalPnl / startingCapital) * 100;

        const closedPositions = Array.from(positions.values()).filter((p) => p.closed);
        const winningPositions = closedPositions.filter((p) => p.pnl > 0);
        const winRate =
            closedPositions.length > 0
                ? (winningPositions.length / closedPositions.length) * 100
                : 0;

        const avgTradeSize = copiedTrades > 0 ? totalInvested / copiedTrades : 0;

        return {
            address: traderAddress,
            shortAddress,
            startingCapital,
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
            openPositions: Array.from(positions.values()).filter(
                (p) => !p.closed && p.sharesHeld > 0
            ).length,
            closedPositions: closedPositions.length,
            simulationTime: Date.now() - startTime,
            trades,
            positions,
        };
    } catch (error) {
        return {
            address: traderAddress,
            shortAddress,
            startingCapital,
            currentCapital: startingCapital,
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
            trades: [],
            positions: new Map(),
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function simulateCombinedBot(traderResults: TraderAuditResult[]): Promise<CombinedBotResult> {
    console.log(colors.cyan('\n🤖 Simulating combined bot copying all traders...\n'));

    const validResults = traderResults.filter((r) => !r.error && r.copiedTrades > 0);
    const capitalPerTrader = AUDIT_STARTING_CAPITAL / validResults.length;

    let totalCapital = 0;
    let totalPnl = 0;
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalCopiedTrades = 0;
    let totalSkippedTrades = 0;
    let totalOpenPositions = 0;
    let totalClosedPositions = 0;
    let totalWinningPositions = 0;

    for (const result of validResults) {
        const scaleFactor = capitalPerTrader / result.startingCapital;

        totalCapital += result.currentCapital * scaleFactor;
        totalPnl += result.totalPnl * scaleFactor;
        totalRealizedPnl += result.realizedPnl * scaleFactor;
        totalUnrealizedPnl += result.unrealizedPnl * scaleFactor;
        totalCopiedTrades += result.copiedTrades;
        totalSkippedTrades += result.skippedTrades;
        totalOpenPositions += result.openPositions;
        totalClosedPositions += result.closedPositions;

        const winningPositions = Array.from(result.positions.values()).filter(
            (p) => p.closed && p.pnl > 0
        ).length;
        totalWinningPositions += winningPositions;
    }

    const roi = (totalPnl / AUDIT_STARTING_CAPITAL) * 100;
    const winRate =
        totalClosedPositions > 0 ? (totalWinningPositions / totalClosedPositions) * 100 : 0;

    return {
        startingCapital: AUDIT_STARTING_CAPITAL,
        currentCapital: totalCapital,
        totalPnl,
        roi,
        realizedPnl: totalRealizedPnl,
        unrealizedPnl: totalUnrealizedPnl,
        totalTrades: totalCopiedTrades + totalSkippedTrades,
        copiedTrades: totalCopiedTrades,
        skippedTrades: totalSkippedTrades,
        openPositions: totalOpenPositions,
        closedPositions: totalClosedPositions,
        winRate,
        capitalPerTrader,
    };
}

function printAuditReport(report: AuditReport) {
    console.log('\n' + colors.cyan('═'.repeat(100)));
    console.log(colors.cyan('  🔍 COPY TRADING ALGORITHM AUDIT REPORT (FIXED)'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    console.log(colors.bold('📋 AUDIT CONFIGURATION:'));
    console.log(`  Period: ${colors.yellow(report.config.days + ' days')}`);
    console.log(`  Multiplier: ${colors.yellow(report.config.multiplier + 'x')}`);
    console.log(
        `  Copy Percentage: ${colors.yellow(report.config.copyPercentage + '%')} of trader's order size`
    );
    console.log(
        `  Starting Capital: ${colors.green('$' + report.config.startingCapital.toFixed(2))}`
    );
    console.log(
        `  Capital per Trader: ${colors.green('$' + report.config.capitalPerTrader.toFixed(2))}`
    );
    console.log(`  Traders: ${colors.cyan(String(report.config.traders.length))}\n`);

    console.log(colors.bold('👥 INDIVIDUAL TRADER RESULTS:\n'));

    const validResults = report.individualResults.filter((r) => !r.error);
    validResults.forEach((result, idx) => {
        const roiColor = result.roi >= 0 ? colors.green : colors.red;
        const roiSign = result.roi >= 0 ? '+' : '';

        console.log(`${idx + 1}. ${colors.blue(result.shortAddress)}`);
        console.log(
            `   ROI: ${roiColor(roiSign + result.roi.toFixed(2) + '%')} | ` +
                `P&L: ${roiSign}$${result.totalPnl.toFixed(2)} | ` +
                `Trades: ${result.copiedTrades}/${result.totalTrades} | ` +
                `Win Rate: ${result.winRate.toFixed(1)}%`
        );
        console.log(
            `   Positions: ${result.openPositions} open, ${result.closedPositions} closed | ` +
                `Realized: $${result.realizedPnl.toFixed(2)}, Unrealized: $${result.unrealizedPnl.toFixed(2)}\n`
        );
    });

    const errors = report.individualResults.filter((r) => r.error);
    if (errors.length > 0) {
        console.log(colors.yellow(`⚠️  ${errors.length} traders had errors:\n`));
        errors.forEach((r) => {
            console.log(`  • ${r.shortAddress} - ${colors.gray(r.error || 'Unknown error')}`);
        });
        console.log();
    }

    console.log(colors.cyan('─'.repeat(100)) + '\n');
    console.log(colors.bold('🤖 COMBINED BOT RESULT (copying all traders):\n'));

    const combined = report.combinedResult;
    const combinedRoiColor = combined.roi >= 0 ? colors.green : colors.red;
    const combinedRoiSign = combined.roi >= 0 ? '+' : '';

    console.log(`  Starting Capital: ${colors.green('$' + combined.startingCapital.toFixed(2))}`);
    console.log(`  Current Capital:  ${colors.green('$' + combined.currentCapital.toFixed(2))}`);
    console.log(
        `  Total P&L:        ${combinedRoiColor(combinedRoiSign + '$' + combined.totalPnl.toFixed(2))}`
    );
    console.log(
        `  ROI:              ${combinedRoiColor(combinedRoiSign + combined.roi.toFixed(2) + '%')}`
    );
    console.log(`  Realized P&L:     $${combined.realizedPnl.toFixed(2)}`);
    console.log(`  Unrealized P&L:   $${combined.unrealizedPnl.toFixed(2)}`);
    console.log(`  Win Rate:         ${combined.winRate.toFixed(1)}%`);
    console.log(
        `  Trades:           ${combined.copiedTrades} copied, ${combined.skippedTrades} skipped`
    );
    console.log(
        `  Positions:        ${combined.openPositions} open, ${combined.closedPositions} closed\n`
    );

    console.log(colors.cyan('─'.repeat(100)) + '\n');
    console.log(colors.bold('📊 COMPARATIVE ANALYSIS:\n'));

    const analysis = report.analysis;

    console.log(`  Best Trader:               ${colors.green(analysis.bestTrader)}`);
    console.log(`  Worst Trader:              ${colors.red(analysis.worstTrader)}`);
    console.log(
        `  Average Win Rate:          ${colors.yellow(analysis.avgWinRate.toFixed(1) + '%')}`
    );
    console.log();
    console.log(
        `  Expected Combined ROI:     ${colors.yellow(analysis.expectedCombinedROI.toFixed(2) + '%')} (mathematical average)`
    );
    console.log(
        `  Actual Combined ROI:       ${combinedRoiColor(combinedRoiSign + analysis.actualCombinedROI.toFixed(2) + '%')}`
    );

    const deviationColor =
        Math.abs(analysis.roiDeviation) < 1
            ? colors.green
            : Math.abs(analysis.roiDeviation) < 5
              ? colors.yellow
              : colors.red;
    console.log(
        `  ROI Deviation:             ${deviationColor(analysis.roiDeviation.toFixed(2) + '%')} ${Math.abs(analysis.roiDeviation) < 1 ? '✓' : '⚠️'}`
    );

    const diversificationColor = analysis.diversificationBenefit >= 0 ? colors.green : colors.red;
    const diversificationSign = analysis.diversificationBenefit >= 0 ? '+' : '';
    console.log(
        `  Diversification Benefit:   ${diversificationColor(diversificationSign + analysis.diversificationBenefit.toFixed(2) + '%')}`
    );
    console.log();

    console.log(colors.cyan('─'.repeat(100)) + '\n');
    console.log(colors.bold('🎯 AUDIT CONCLUSIONS:\n'));

    if (Math.abs(analysis.roiDeviation) < 1) {
        console.log(`  ${colors.green('✓')} Algorithm working correctly (ROI deviation < 1%)`);
    } else if (Math.abs(analysis.roiDeviation) < 5) {
        console.log(
            `  ${colors.yellow('⚠')} Minor deviation detected (${analysis.roiDeviation.toFixed(2)}%)`
        );
    } else {
        console.log(
            `  ${colors.red('✗')} Significant deviation detected (${analysis.roiDeviation.toFixed(2)}%)`
        );
        console.log(`      ${colors.yellow('→ Review algorithm logic for potential issues')}`);
    }

    if (analysis.diversificationBenefit > 5) {
        console.log(
            `  ${colors.green('✓')} Strong diversification benefit (+${analysis.diversificationBenefit.toFixed(2)}%)`
        );
    } else if (analysis.diversificationBenefit > 0) {
        console.log(
            `  ${colors.yellow('○')} Moderate diversification benefit (+${analysis.diversificationBenefit.toFixed(2)}%)`
        );
    } else {
        console.log(
            `  ${colors.red('✗')} Negative diversification (${analysis.diversificationBenefit.toFixed(2)}%)`
        );
        console.log(`      ${colors.yellow('→ Consider trader selection criteria')}`);
    }

    if (combined.roi > 15) {
        console.log(
            `  ${colors.green('✓')} Excellent performance (${combined.roi.toFixed(2)}% ROI)`
        );
    } else if (combined.roi > 5) {
        console.log(`  ${colors.yellow('○')} Good performance (${combined.roi.toFixed(2)}% ROI)`);
    } else if (combined.roi > 0) {
        console.log(`  ${colors.yellow('○')} Modest performance (${combined.roi.toFixed(2)}% ROI)`);
    } else {
        console.log(`  ${colors.red('✗')} Negative performance (${combined.roi.toFixed(2)}% ROI)`);
        console.log(`      ${colors.yellow('→ Review trader selection and risk management')}`);
    }

    console.log('\n' + colors.cyan('═'.repeat(100)) + '\n');
}

function saveAuditReport(report: AuditReport) {
    const resultsDir = path.join(process.cwd(), 'audit_results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit_FIXED_${report.config.days}d_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    const serializedResults = report.individualResults.map((r) => ({
        ...r,
        positions: Array.from(r.positions.entries()).map(([key, pos]) => ({
            key,
            ...pos,
        })),
    }));

    const data = {
        ...report,
        individualResults: serializedResults,
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(colors.green(`✓ Audit report saved to: ${filepath}\n`));
}

async function main() {
    console.log(colors.cyan('\n' + '═'.repeat(100)));
    console.log(colors.cyan('  🔍 INDEPENDENT AUDIT: COPY TRADING ALGORITHM VERIFICATION (FIXED)'));
    console.log(colors.cyan('═'.repeat(100)) + '\n');

    console.log(colors.bold('AUDIT PARAMETERS:'));
    console.log(`  History Period: ${colors.yellow(AUDIT_DAYS + ' days')}`);
    console.log(`  Trade Multiplier: ${colors.yellow(AUDIT_MULTIPLIER + 'x')}`);
    console.log(
        `  Copy Percentage: ${colors.yellow(COPY_PERCENTAGE + '%')} of trader's order size`
    );
    console.log(`  Starting Capital: ${colors.green('$' + AUDIT_STARTING_CAPITAL.toFixed(2))}`);
    console.log(`  Min Order Size: ${colors.yellow('$' + MIN_ORDER_SIZE.toFixed(2))}\n`);

    try {
        const traderAddresses = parseTraderAddresses();
        console.log(colors.cyan(`📊 Analyzing ${traderAddresses.length} traders:\n`));
        traderAddresses.forEach((addr, idx) => {
            console.log(`  ${idx + 1}. ${addr}`);
        });
        console.log();

        const capitalPerTrader = AUDIT_STARTING_CAPITAL / traderAddresses.length;
        console.log(
            colors.gray(`Capital allocation: $${capitalPerTrader.toFixed(2)} per trader\n`)
        );

        console.log(colors.cyan('🔄 Running individual trader simulations...\n'));
        const individualResults: TraderAuditResult[] = [];

        for (let i = 0; i < traderAddresses.length; i++) {
            const trader = traderAddresses[i];
            console.log(colors.bold(`[${i + 1}/${traderAddresses.length}] ${trader}`));

            const result = await simulateTrader(trader, capitalPerTrader);
            individualResults.push(result);

            if (!result.error && result.copiedTrades > 0) {
                const roiColor = result.roi >= 0 ? colors.green : colors.red;
                console.log(
                    `  ${roiColor(result.roi >= 0 ? '✓' : '✗')} ROI: ${result.roi.toFixed(2)}% | P&L: $${result.totalPnl.toFixed(2)} | Trades: ${result.copiedTrades}`
                );
            } else {
                console.log(`  ${colors.yellow('⚠')} ${result.error || 'No trades copied'}`);
            }
            console.log();

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const combinedResult = await simulateCombinedBot(individualResults);

        const validResults = individualResults.filter((r) => !r.error && r.copiedTrades > 0);

        const bestTrader = validResults.reduce(
            (best, current) => (current.roi > best.roi ? current : best),
            validResults[0]
        );

        const worstTrader = validResults.reduce(
            (worst, current) => (current.roi < worst.roi ? current : worst),
            validResults[0]
        );

        const avgWinRate =
            validResults.reduce((sum, r) => sum + r.winRate, 0) / validResults.length;
        const expectedCombinedROI =
            validResults.reduce((sum, r) => sum + r.roi, 0) / validResults.length;
        const actualCombinedROI = combinedResult.roi;
        const roiDeviation = actualCombinedROI - expectedCombinedROI;
        const diversificationBenefit = actualCombinedROI - expectedCombinedROI;

        const report: AuditReport = {
            timestamp: new Date().toISOString(),
            config: {
                traders: traderAddresses,
                days: AUDIT_DAYS,
                multiplier: AUDIT_MULTIPLIER,
                startingCapital: AUDIT_STARTING_CAPITAL,
                minOrderSize: MIN_ORDER_SIZE,
                capitalPerTrader,
                copyPercentage: COPY_PERCENTAGE,
            },
            individualResults,
            combinedResult,
            analysis: {
                totalProfit: combinedResult.totalPnl,
                totalROI: combinedResult.roi,
                bestTrader: bestTrader.shortAddress,
                worstTrader: worstTrader.shortAddress,
                avgWinRate,
                diversificationBenefit,
                expectedCombinedROI,
                actualCombinedROI,
                roiDeviation,
            },
        };

        printAuditReport(report);
        saveAuditReport(report);

        console.log(colors.green('✅ Audit completed successfully!\n'));
    } catch (error) {
        console.error(colors.red('\n✗ Audit failed:'), error);
        process.exit(1);
    }
}

main();
