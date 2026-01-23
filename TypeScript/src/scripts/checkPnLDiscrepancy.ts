import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PROXY_WALLET = ENV.PROXY_WALLET;

interface Activity {
    proxyWallet: string;
    timestamp: number;
    conditionId: string;
    type: string;
    size: number;
    usdcSize: number;
    transactionHash: string;
    price: number;
    asset: string;
    side: 'BUY' | 'SELL';
    title?: string;
    slug?: string;
    outcome?: string;
}

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    initialValue: number;
    currentValue: number;
    cashPnl: number;
    percentPnl: number;
    totalBought: number;
    realizedPnl: number;
    percentRealizedPnl: number;
    curPrice: number;
    redeemable: boolean;
    title?: string;
    slug?: string;
    outcome?: string;
}

const checkDiscrepancy = async () => {
    console.log('🔍 Detailed P&L discrepancy check\n');
    console.log(`Wallet: ${PROXY_WALLET}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // 1. Get all positions (open and closed)
        console.log('📊 Fetching data from Polymarket API...\n');

        const positionsUrl = `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`;
        const positions: Position[] = await fetchData(positionsUrl);

        console.log(`Fetched positions: ${positions.length}\n`);

        // 2. Separate into open and closed
        const openPositions = positions.filter((p) => p.size > 0);
        const closedPositions = positions.filter((p) => p.size === 0);

        console.log(`• Open: ${openPositions.length}`);
        console.log(`• Closed: ${closedPositions.length}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 3. Analysis of OPEN positions
        console.log('📈 OPEN POSITIONS:\n');
        let totalOpenValue = 0;
        let totalOpenInitial = 0;
        let totalUnrealizedPnl = 0;
        let totalOpenRealized = 0;

        openPositions.forEach((pos, idx) => {
            totalOpenValue += pos.currentValue || 0;
            totalOpenInitial += pos.initialValue || 0;
            totalUnrealizedPnl += pos.cashPnl || 0;
            totalOpenRealized += pos.realizedPnl || 0;

            console.log(`${idx + 1}. ${pos.title || 'Unknown'} - ${pos.outcome || 'N/A'}`);
            console.log(`   Size: ${pos.size.toFixed(2)} @ $${pos.avgPrice.toFixed(3)}`);
            console.log(`   Current Value: $${pos.currentValue.toFixed(2)}`);
            console.log(`   Initial Value: $${pos.initialValue.toFixed(2)}`);
            console.log(
                `   Unrealized P&L: $${(pos.cashPnl || 0).toFixed(2)} (${(pos.percentPnl || 0).toFixed(2)}%)`
            );
            console.log(`   Realized P&L: $${(pos.realizedPnl || 0).toFixed(2)}`);
            console.log('');
        });

        console.log(`   TOTAL for open:`);
        console.log(`   • Current value: $${totalOpenValue.toFixed(2)}`);
        console.log(`   • Initial value: $${totalOpenInitial.toFixed(2)}`);
        console.log(`   • Unrealized P&L: $${totalUnrealizedPnl.toFixed(2)}`);
        console.log(`   • Realized P&L: $${totalOpenRealized.toFixed(2)}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 4. Analysis of CLOSED positions
        console.log('✅ CLOSED POSITIONS:\n');
        let totalClosedRealized = 0;
        let totalClosedInitial = 0;

        if (closedPositions.length > 0) {
            closedPositions.forEach((pos, idx) => {
                totalClosedRealized += pos.realizedPnl || 0;
                totalClosedInitial += pos.initialValue || 0;

                console.log(`${idx + 1}. ${pos.title || 'Unknown'} - ${pos.outcome || 'N/A'}`);
                console.log(`   Initial Value: $${pos.initialValue.toFixed(2)}`);
                console.log(`   Realized P&L: $${(pos.realizedPnl || 0).toFixed(2)}`);
                console.log(`   % P&L: ${(pos.percentRealizedPnl || 0).toFixed(2)}%`);
                console.log('');
            });

            console.log(`   TOTAL for closed:`);
            console.log(`   • Initial investments: $${totalClosedInitial.toFixed(2)}`);
            console.log(`   • Realized P&L: $${totalClosedRealized.toFixed(2)}\n`);
        } else {
            console.log('   ❌ No closed positions found in API\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 5. OVERALL statistics
        console.log('📊 OVERALL STATISTICS:\n');
        const totalRealized = totalOpenRealized + totalClosedRealized;

        console.log(`   • Open positions - Realized P&L: $${totalOpenRealized.toFixed(2)}`);
        console.log(
            `   • Closed positions - Realized P&L: $${totalClosedRealized.toFixed(2)}`
        );
        console.log(`   • Unrealized P&L: $${totalUnrealizedPnl.toFixed(2)}`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   💰 TOTAL REALIZED PROFIT: $${totalRealized.toFixed(2)}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 6. Check through trade history
        console.log('🔎 CHECK THROUGH TRADE HISTORY:\n');
        const activityUrl = `https://data-api.polymarket.com/activity?user=${PROXY_WALLET}&type=TRADE`;
        const activities: Activity[] = await fetchData(activityUrl);

        // Group trades by markets
        const marketTrades = new Map<string, { buys: Activity[]; sells: Activity[] }>();

        activities.forEach((trade) => {
            const key = `${trade.conditionId}:${trade.asset}`;
            if (!marketTrades.has(key)) {
                marketTrades.set(key, { buys: [], sells: [] });
            }
            const group = marketTrades.get(key)!;
            if (trade.side === 'BUY') {
                group.buys.push(trade);
            } else {
                group.sells.push(trade);
            }
        });

        console.log(`   Found markets with activity: ${marketTrades.size}\n`);

        // Calculate realized profit from trades
        let calculatedRealizedPnl = 0;
        let marketsWithProfit = 0;

        for (const [key, trades] of marketTrades.entries()) {
            const totalBought = trades.buys.reduce((sum, t) => sum + t.usdcSize, 0);
            const totalSold = trades.sells.reduce((sum, t) => sum + t.usdcSize, 0);
            const pnl = totalSold - totalBought;

            if (Math.abs(pnl) > 0.01) {
                const market = trades.buys[0] || trades.sells[0];
                console.log(`   ${market.title || 'Unknown'}`);
                console.log(`   • Bought: $${totalBought.toFixed(2)}`);
                console.log(`   • Sold: $${totalSold.toFixed(2)}`);
                console.log(`   • P&L: $${pnl.toFixed(2)}`);
                console.log('');

                if (totalSold > 0) {
                    calculatedRealizedPnl += pnl;
                    marketsWithProfit++;
                }
            }
        }

        console.log(
            `   💰 Calculated realized profit: $${calculatedRealizedPnl.toFixed(2)}`
        );
        console.log(`   📊 Markets with closed profit: ${marketsWithProfit}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 7. Conclusions
        console.log('💡 CONCLUSIONS:\n');
        console.log(`   1. API returns realized profit: $${totalRealized.toFixed(2)}`);
        console.log(`   2. Calculated from trade history: $${calculatedRealizedPnl.toFixed(2)}`);
        console.log(`   3. Polymarket UI shows: ~$12.02\n`);

        if (Math.abs(totalRealized - calculatedRealizedPnl) > 1) {
            console.log('   ⚠️  DISCREPANCY DETECTED!\n');
            console.log('   Possible reasons:');
            console.log('   • API only counts partially closed positions');
            console.log('   • UI includes unrealized partial sales');
            console.log('   • Data synchronization delay between UI and API');
            console.log('   • Different P&L calculation methodology\n');
        }

        console.log('   📈 Why chart shows $0.00:');
        console.log('   • Amount too small ($2-12) for visualization');
        console.log('   • Timeline doesn\'t start from $0');
        console.log('   • Chart requires at least several data points');
        console.log('   • UI update delay (can be 1-24 hours)\n');

        console.log('   🔧 Recommendations:');
        console.log('   1. Wait 24 hours for full update');
        console.log('   2. Close more positions to increase realized profit');
        console.log('   3. Try clearing browser cache');
        console.log('   4. Check in incognito mode\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

checkDiscrepancy();
