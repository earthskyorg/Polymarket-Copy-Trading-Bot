import * as dotenv from 'dotenv';
import axios from 'axios';
import moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables (optional for this script)
dotenv.config();

// Simple fetch function that doesn't require full config
async function fetchData(url: string): Promise<any> {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`HTTP ${error.response?.status}: ${error.message}`);
        }
        throw error;
    }
}

// Load environment variables (optional for this script)
dotenv.config();

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
    timestamp: number;
    asset: string;
    side: 'BUY' | 'SELL';
    price: number;
    usdcSize: number;
    size: number;
    conditionId: string;
    transactionHash: string;
}

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    currentValue: number;
    initialValue: number;
    avgPrice: number;
}

interface EquityPoint {
    timestamp: number;
    equity: number;
    pnl: number;
}

interface TraderAnalysis {
    address: string;
    name?: string;
    profileUrl: string;

    // Performance metrics
    roi: number;
    totalPnl: number;
    startingCapital: number;
    currentCapital: number;

    // Risk metrics
    maxDrawdown: number; // Maximum Drawdown as percentage
    maxDrawdownAmount: number; // Maximum Drawdown in USD
    sharpeRatio: number; // Sharpe Ratio (risk-adjusted return)
    calmarRatio: number; // Calmar Ratio (ROI / Max Drawdown)

    // Trading stats
    totalTrades: number;
    winRate: number;
    avgTradeSize: number;
    profitFactor: number; // Gross profit / Gross loss

    // Time-based metrics
    tradingDays: number;
    avgDailyReturn: number;
    volatility: number; // Standard deviation of daily returns

    // Activity
    lastActivityTime: number;
    lastActivityDate: string;

    // Risk score (0-100, lower is better)
    riskScore: number;

    // Status
    status: 'excellent' | 'good' | 'average' | 'poor' | 'bad';
    error?: string;
}

// Configuration
const STARTING_CAPITAL = 1000;
const HISTORY_DAYS = parseInt(process.env.SIM_HISTORY_DAYS || '90', 10); // 90 days for better statistics
const MIN_TRADER_TRADES = parseInt(process.env.MIN_TRADER_TRADES || '50', 10);
const MIN_TRADING_DAYS = parseInt(process.env.MIN_TRADING_DAYS || '30', 10);

// Risk thresholds
const MAX_MDD_THRESHOLD = parseFloat(process.env.MAX_MDD_THRESHOLD || '20.0'); // Max 20% drawdown
const MIN_SHARPE_THRESHOLD = parseFloat(process.env.MIN_SHARPE_THRESHOLD || '1.5'); // Min Sharpe Ratio 1.5
const MIN_ROI_THRESHOLD = parseFloat(process.env.MIN_ROI_THRESHOLD || '10.0'); // Min 10% ROI

/**
 * Fetch trader's trading activity
 */
async function fetchTraderActivity(traderAddress: string): Promise<Trade[]> {
    try {
        const cutoffTime = Math.floor(Date.now() / 1000) - HISTORY_DAYS * 24 * 60 * 60;
        const url = `https://data-api.polymarket.com/activity?user=${traderAddress}&type=TRADE`;
        const activities = await fetchData(url);

        if (!Array.isArray(activities)) {
            return [];
        }

        return activities
            .filter((activity: any) => activity.timestamp >= cutoffTime)
            .map((activity: any) => ({
                timestamp: activity.timestamp,
                asset: activity.asset,
                side: activity.side,
                price: activity.price,
                usdcSize: activity.usdcSize,
                size: activity.size,
                conditionId: activity.conditionId,
                transactionHash: activity.transactionHash,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        console.error(`Error fetching activity for ${traderAddress}:`, error);
        return [];
    }
}

/**
 * Calculate equity curve from trades
 */
function calculateEquityCurve(trades: Trade[], positions: Map<string, Position>): EquityPoint[] {
    const equityPoints: EquityPoint[] = [];
    let currentEquity = STARTING_CAPITAL;
    let peakEquity = STARTING_CAPITAL;

    // Group trades by day for daily equity calculation
    const tradesByDay = new Map<number, Trade[]>();
    for (const trade of trades) {
        const day = Math.floor(trade.timestamp / (24 * 60 * 60));
        if (!tradesByDay.has(day)) {
            tradesByDay.set(day, []);
        }
        tradesByDay.get(day)!.push(trade);
    }

    // Calculate equity for each day
    const sortedDays = Array.from(tradesByDay.keys()).sort();
    for (const day of sortedDays) {
        const dayTrades = tradesByDay.get(day)!;

        // Update positions based on trades
        for (const trade of dayTrades) {
            const position = positions.get(trade.conditionId);
            if (trade.side === 'BUY') {
                // Simulate buying
                const cost = trade.usdcSize;
                currentEquity -= cost;

                if (position) {
                    position.size += trade.size;
                    position.initialValue += cost;
                } else {
                    positions.set(trade.conditionId, {
                        asset: trade.asset,
                        conditionId: trade.conditionId,
                        size: trade.size,
                        currentValue: 0,
                        initialValue: cost,
                        avgPrice: trade.price,
                    });
                }
            } else if (trade.side === 'SELL' && position) {
                // Simulate selling
                const revenue = trade.usdcSize;
                currentEquity += revenue;
                position.size = Math.max(0, position.size - trade.size);
                if (position.size === 0) {
                    positions.delete(trade.conditionId);
                }
            }
        }

        // Update current value of open positions
        let totalPositionValue = 0;
        for (const position of positions.values()) {
            // Estimate current value (simplified - in real scenario would fetch current prices)
            totalPositionValue += position.initialValue; // Simplified
        }

        const totalEquity = currentEquity + totalPositionValue;
        peakEquity = Math.max(peakEquity, totalEquity);

        equityPoints.push({
            timestamp: day * 24 * 60 * 60,
            equity: totalEquity,
            pnl: totalEquity - STARTING_CAPITAL,
        });
    }

    return equityPoints;
}

/**
 * Calculate Maximum Drawdown (MDD)
 */
function calculateMaxDrawdown(equityPoints: EquityPoint[]): { mdd: number; mddAmount: number } {
    if (equityPoints.length === 0) {
        return { mdd: 0, mddAmount: 0 };
    }

    let peak = equityPoints[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownAmount = 0;

    for (const point of equityPoints) {
        if (point.equity > peak) {
            peak = point.equity;
        }

        const drawdown = peak - point.equity;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        if (drawdownPercent > maxDrawdown) {
            maxDrawdown = drawdownPercent;
            maxDrawdownAmount = drawdown;
        }
    }

    return { mdd: maxDrawdown, mddAmount: maxDrawdownAmount };
}

/**
 * Calculate Sharpe Ratio
 */
function calculateSharpeRatio(equityPoints: EquityPoint[], riskFreeRate: number = 0): number {
    if (equityPoints.length < 2) {
        return 0;
    }

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < equityPoints.length; i++) {
        const prevEquity = equityPoints[i - 1].equity;
        const currEquity = equityPoints[i].equity;
        if (prevEquity > 0) {
            const dailyReturn = ((currEquity - prevEquity) / prevEquity) * 100;
            returns.push(dailyReturn);
        }
    }

    if (returns.length === 0) {
        return 0;
    }

    // Calculate average return
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    // Calculate standard deviation
    const variance =
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
        return 0;
    }

    // Annualize (assuming 365 trading days)
    const annualizedReturn = avgReturn * 365;
    const annualizedStdDev = stdDev * Math.sqrt(365);

    // Sharpe Ratio = (Return - RiskFreeRate) / StdDev
    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculate volatility (standard deviation of daily returns)
 */
function calculateVolatility(equityPoints: EquityPoint[]): number {
    if (equityPoints.length < 2) {
        return 0;
    }

    const returns: number[] = [];
    for (let i = 1; i < equityPoints.length; i++) {
        const prevEquity = equityPoints[i - 1].equity;
        const currEquity = equityPoints[i].equity;
        if (prevEquity > 0) {
            const dailyReturn = ((currEquity - prevEquity) / prevEquity) * 100;
            returns.push(dailyReturn);
        }
    }

    if (returns.length === 0) {
        return 0;
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
}

/**
 * Calculate profit factor
 */
function calculateProfitFactor(trades: Trade[], positions: Map<string, Position>): number {
    let grossProfit = 0;
    let grossLoss = 0;

    // Simplified calculation - in real scenario would track realized P&L
    for (const position of positions.values()) {
        const pnl = position.currentValue - position.initialValue;
        if (pnl > 0) {
            grossProfit += pnl;
        } else {
            grossLoss += Math.abs(pnl);
        }
    }

    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
}

/**
 * Calculate risk score (0-100, lower is better)
 */
function calculateRiskScore(
    mdd: number,
    sharpeRatio: number,
    volatility: number,
    winRate: number
): number {
    // Normalize metrics to 0-100 scale
    // Lower MDD is better, higher Sharpe is better, lower volatility is better, higher win rate is better

    const mddScore = Math.min(100, (mdd / 50) * 100); // 50% MDD = 100 points
    const sharpeScore = Math.max(0, 100 - (sharpeRatio / 3) * 100); // Higher Sharpe = lower score
    const volatilityScore = Math.min(100, (volatility / 10) * 100); // 10% volatility = 100 points
    const winRateScore = Math.max(0, 100 - winRate); // Higher win rate = lower score

    // Weighted average
    return mddScore * 0.4 + sharpeScore * 0.3 + volatilityScore * 0.2 + winRateScore * 0.1;
}

/**
 * Analyze trader with risk metrics
 */
async function analyzeTrader(traderAddress: string): Promise<TraderAnalysis> {
    try {
        const trades = await fetchTraderActivity(traderAddress);

        if (trades.length < MIN_TRADER_TRADES) {
            return {
                address: traderAddress,
                profileUrl: `https://polymarket.com/profile/${traderAddress}`,
                roi: 0,
                totalPnl: 0,
                startingCapital: STARTING_CAPITAL,
                currentCapital: STARTING_CAPITAL,
                maxDrawdown: 0,
                maxDrawdownAmount: 0,
                sharpeRatio: 0,
                calmarRatio: 0,
                totalTrades: trades.length,
                winRate: 0,
                avgTradeSize: 0,
                profitFactor: 0,
                tradingDays: 0,
                avgDailyReturn: 0,
                volatility: 0,
                lastActivityTime: 0,
                lastActivityDate: 'Unknown',
                riskScore: 100,
                status: 'bad',
                error: `Not enough trades (${trades.length} < ${MIN_TRADER_TRADES})`,
            };
        }

        // Calculate trading period
        const firstTrade = trades[0];
        const lastTrade = trades[trades.length - 1];
        const tradingDays = Math.max(
            1,
            Math.floor((lastTrade.timestamp - firstTrade.timestamp) / (24 * 60 * 60))
        );

        if (tradingDays < MIN_TRADING_DAYS) {
            return {
                address: traderAddress,
                profileUrl: `https://polymarket.com/profile/${traderAddress}`,
                roi: 0,
                totalPnl: 0,
                startingCapital: STARTING_CAPITAL,
                currentCapital: STARTING_CAPITAL,
                maxDrawdown: 0,
                maxDrawdownAmount: 0,
                sharpeRatio: 0,
                calmarRatio: 0,
                totalTrades: trades.length,
                winRate: 0,
                avgTradeSize: 0,
                profitFactor: 0,
                tradingDays,
                avgDailyReturn: 0,
                volatility: 0,
                lastActivityTime: lastTrade.timestamp,
                lastActivityDate: moment.unix(lastTrade.timestamp).fromNow(),
                riskScore: 100,
                status: 'bad',
                error: `Trading period too short (${tradingDays} days < ${MIN_TRADING_DAYS} days)`,
            };
        }

        // Simulate positions
        const positions = new Map<string, Position>();
        const equityPoints = calculateEquityCurve(trades, positions);

        // Get current positions from API
        const currentPositions: Position[] = await fetchData(
            `https://data-api.polymarket.com/positions?user=${traderAddress}`
        );

        // Update positions with current values
        for (const pos of currentPositions) {
            positions.set(pos.conditionId, pos);
        }

        // Calculate final equity
        let currentEquity = STARTING_CAPITAL;
        for (const trade of trades) {
            if (trade.side === 'BUY') {
                currentEquity -= trade.usdcSize;
            } else {
                currentEquity += trade.usdcSize;
            }
        }

        // Add current position values
        let totalPositionValue = 0;
        for (const position of positions.values()) {
            totalPositionValue += position.currentValue || position.initialValue;
        }

        const finalEquity = currentEquity + totalPositionValue;
        const totalPnl = finalEquity - STARTING_CAPITAL;
        const roi = (totalPnl / STARTING_CAPITAL) * 100;

        // Calculate risk metrics
        const { mdd, mddAmount } = calculateMaxDrawdown(equityPoints);
        const sharpeRatio = calculateSharpeRatio(equityPoints);
        const volatility = calculateVolatility(equityPoints);
        const calmarRatio = mdd > 0 ? roi / mdd : roi > 0 ? Infinity : 0;

        // Calculate win rate (simplified)
        const closedPositions = Array.from(positions.values()).filter((p) => p.size === 0);
        const winningPositions = closedPositions.filter(
            (p) => (p.currentValue || p.initialValue) > p.initialValue
        );
        const winRate =
            closedPositions.length > 0
                ? (winningPositions.length / closedPositions.length) * 100
                : 0;

        // Calculate profit factor
        const profitFactor = calculateProfitFactor(trades, positions);

        // Calculate average trade size
        const totalVolume = trades.reduce((sum, t) => sum + t.usdcSize, 0);
        const avgTradeSize = trades.length > 0 ? totalVolume / trades.length : 0;

        // Calculate average daily return
        const avgDailyReturn = tradingDays > 0 ? roi / tradingDays : 0;

        // Calculate risk score
        const riskScore = calculateRiskScore(mdd, sharpeRatio, volatility, winRate);

        // Determine status based on risk-adjusted metrics
        let status: 'excellent' | 'good' | 'average' | 'poor' | 'bad';
        if (
            roi >= MIN_ROI_THRESHOLD &&
            sharpeRatio >= MIN_SHARPE_THRESHOLD &&
            mdd <= MAX_MDD_THRESHOLD &&
            riskScore < 30
        ) {
            status = 'excellent';
        } else if (
            roi >= MIN_ROI_THRESHOLD * 0.7 &&
            sharpeRatio >= MIN_SHARPE_THRESHOLD * 0.7 &&
            mdd <= MAX_MDD_THRESHOLD * 1.5 &&
            riskScore < 50
        ) {
            status = 'good';
        } else if (roi >= 0 && sharpeRatio >= 0.5 && mdd <= 40 && riskScore < 70) {
            status = 'average';
        } else if (roi >= -10) {
            status = 'poor';
        } else {
            status = 'bad';
        }

        return {
            address: traderAddress,
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            roi,
            totalPnl,
            startingCapital: STARTING_CAPITAL,
            currentCapital: finalEquity,
            maxDrawdown: mdd,
            maxDrawdownAmount: mddAmount,
            sharpeRatio,
            calmarRatio,
            totalTrades: trades.length,
            winRate,
            avgTradeSize,
            profitFactor,
            tradingDays,
            avgDailyReturn,
            volatility,
            lastActivityTime: lastTrade.timestamp,
            lastActivityDate: moment.unix(lastTrade.timestamp).fromNow(),
            riskScore,
            status,
        };
    } catch (error) {
        return {
            address: traderAddress,
            profileUrl: `https://polymarket.com/profile/${traderAddress}`,
            roi: 0,
            totalPnl: 0,
            startingCapital: STARTING_CAPITAL,
            currentCapital: STARTING_CAPITAL,
            maxDrawdown: 0,
            maxDrawdownAmount: 0,
            sharpeRatio: 0,
            calmarRatio: 0,
            totalTrades: 0,
            winRate: 0,
            avgTradeSize: 0,
            profitFactor: 0,
            tradingDays: 0,
            avgDailyReturn: 0,
            volatility: 0,
            lastActivityTime: 0,
            lastActivityDate: 'Unknown',
            riskScore: 100,
            status: 'bad',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Print analysis results
 */
function printResults(results: TraderAnalysis[]) {
    console.log(
        '\n' +
            colors.bold(colors.cyan('═══════════════════════════════════════════════════════════'))
    );
    console.log(colors.bold(colors.cyan('  🎯 LOW-RISK HIGH-PERFORMANCE TRADERS ANALYSIS')));
    console.log(
        colors.bold(colors.cyan('═══════════════════════════════════════════════════════════\n'))
    );

    // Show all results first (for debugging)
    console.log(colors.cyan('\n📊 All Analyzed Traders:\n'));
    for (const trader of results) {
        if (trader.error) {
            console.log(
                colors.red(
                    `❌ ${trader.address.slice(0, 10)}...${trader.address.slice(-8)}: ${trader.error}`
                )
            );
        } else {
            console.log(
                colors.gray(
                    `${trader.address.slice(0, 10)}...${trader.address.slice(-8)}: ROI=${trader.roi.toFixed(2)}%, Sharpe=${trader.sharpeRatio.toFixed(2)}, MDD=${trader.maxDrawdown.toFixed(2)}%, Risk=${trader.riskScore.toFixed(1)}`
                )
            );
        }
    }

    // Filter and sort by risk score
    const filtered = results
        .filter((r) => r.status !== 'bad' && !r.error)
        .filter((r) => r.roi >= MIN_ROI_THRESHOLD)
        .filter((r) => r.sharpeRatio >= MIN_SHARPE_THRESHOLD)
        .filter((r) => r.maxDrawdown <= MAX_MDD_THRESHOLD)
        .sort((a, b) => a.riskScore - b.riskScore);

    if (filtered.length === 0) {
        console.log(colors.yellow('\n⚠️  No traders found matching the criteria.'));
        console.log(
            colors.gray(
                `   Criteria: ROI >= ${MIN_ROI_THRESHOLD}%, Sharpe >= ${MIN_SHARPE_THRESHOLD}, MDD <= ${MAX_MDD_THRESHOLD}%`
            )
        );
        console.log(
            colors.gray(
                `   Try relaxing thresholds or check if traders have enough trading history.\n`
            )
        );
        return;
    }

    console.log(colors.green(`✅ Found ${filtered.length} low-risk profitable traders:\n`));

    for (const trader of filtered.slice(0, 20)) {
        const statusColor =
            trader.status === 'excellent'
                ? colors.green
                : trader.status === 'good'
                  ? colors.cyan
                  : trader.status === 'average'
                    ? colors.yellow
                    : colors.red;

        console.log(colors.bold(`📍 ${trader.address.slice(0, 10)}...${trader.address.slice(-8)}`));
        console.log(`   Profile: ${trader.profileUrl}`);
        console.log(`   Status: ${statusColor(trader.status.toUpperCase())}`);
        console.log(`   Risk Score: ${colors.bold(trader.riskScore.toFixed(1))} (lower is better)`);
        console.log(
            `   ROI: ${trader.roi >= 0 ? colors.green : colors.red}${trader.roi.toFixed(2)}%`
        );
        console.log(
            `   Sharpe Ratio: ${colors.cyan(trader.sharpeRatio.toFixed(2))} ${trader.sharpeRatio >= 2 ? '⭐' : ''}`
        );
        console.log(`   Max Drawdown: ${colors.yellow(trader.maxDrawdown.toFixed(2))}%`);
        console.log(`   Calmar Ratio: ${colors.blue(trader.calmarRatio.toFixed(2))}`);
        console.log(`   Win Rate: ${trader.winRate.toFixed(1)}%`);
        console.log(`   Profit Factor: ${trader.profitFactor.toFixed(2)}`);
        console.log(`   Volatility: ${trader.volatility.toFixed(2)}%`);
        console.log(`   Trading Days: ${trader.tradingDays}`);
        console.log(`   Total Trades: ${trader.totalTrades}`);
        console.log(`   Last Activity: ${trader.lastActivityDate}`);
        console.log('');
    }

    // Save to file
    const outputDir = path.join(process.cwd(), 'trader_analysis');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `low-risk-traders-${moment().format('YYYY-MM-DD-HHmmss')}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2));
    console.log(colors.green(`\n💾 Results saved to: ${filepath}\n`));
}

/**
 * Main function
 */
async function main() {
    console.log(colors.bold(colors.cyan('\n🔍 Finding Low-Risk High-Performance Traders...\n')));

    // Get trader addresses from command line or use default list
    const traderAddresses = process.argv.slice(2);

    if (traderAddresses.length === 0) {
        console.log(colors.yellow('⚠️  No trader addresses provided.'));
        console.log(colors.gray('   Usage: npm run find-low-risk <address1> <address2> ...'));
        console.log(colors.gray('   Or set TRADER_ADDRESSES environment variable\n'));
        process.exit(1);
    }

    console.log(colors.cyan(`📊 Analyzing ${traderAddresses.length} trader(s)...\n`));

    const results: TraderAnalysis[] = [];

    for (let i = 0; i < traderAddresses.length; i++) {
        const address = traderAddresses[i];
        console.log(colors.gray(`[${i + 1}/${traderAddresses.length}] Analyzing ${address}...`));

        const analysis = await analyzeTrader(address);
        results.push(analysis);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    printResults(results);
}

main().catch((error) => {
    console.error(colors.red('Fatal error:'), error);
    process.exit(1);
});
