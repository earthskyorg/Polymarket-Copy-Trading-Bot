import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';
import getMyBalance from '../utils/getMyBalance';

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
    title?: string;
    slug?: string;
    outcome?: string;
}

const checkMyStats = async () => {
    console.log('🔍 Checking your wallet statistics on Polymarket\n');
    console.log(`Wallet: ${PROXY_WALLET}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // 1. USDC Balance
        console.log('💰 USDC BALANCE');
        const balance = await getMyBalance(PROXY_WALLET);
        console.log(`   Available: $${balance.toFixed(2)}\n`);

        // 2. Open Positions
        console.log('📊 OPEN POSITIONS');
        const positionsUrl = `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`;
        const positions: Position[] = await fetchData(positionsUrl);

        if (positions && positions.length > 0) {
            console.log(`   Total positions: ${positions.length}\n`);

            let totalValue = 0;
            let totalInitialValue = 0;
            let totalUnrealizedPnl = 0;
            let totalRealizedPnl = 0;

            positions.forEach((pos) => {
                totalValue += pos.currentValue || 0;
                totalInitialValue += pos.initialValue || 0;
                totalUnrealizedPnl += pos.cashPnl || 0;
                totalRealizedPnl += pos.realizedPnl || 0;
            });

            console.log(`   💵 Current value: $${totalValue.toFixed(2)}`);
            console.log(`   💵 Initial value: $${totalInitialValue.toFixed(2)}`);
            console.log(
                `   📈 Unrealized P&L: $${totalUnrealizedPnl.toFixed(2)} (${((totalUnrealizedPnl / totalInitialValue) * 100).toFixed(2)}%)`
            );
            console.log(`   ✅ Realized P&L: $${totalRealizedPnl.toFixed(2)}\n`);

            // Top 5 positions by profit
            console.log('   🏆 Top-5 positions by profit:\n');
            const topPositions = [...positions]
                .sort((a, b) => (b.percentPnl || 0) - (a.percentPnl || 0))
                .slice(0, 5);

            topPositions.forEach((pos, idx) => {
                const pnlSign = (pos.percentPnl || 0) >= 0 ? '📈' : '📉';
                console.log(`   ${idx + 1}. ${pnlSign} ${pos.title || 'Unknown'}`);
                console.log(`      ${pos.outcome || 'N/A'}`);
                console.log(
                    `      Size: ${pos.size.toFixed(2)} tokens @ $${pos.avgPrice.toFixed(3)}`
                );
                console.log(
                    `      P&L: $${(pos.cashPnl || 0).toFixed(2)} (${(pos.percentPnl || 0).toFixed(2)}%)`
                );
                console.log(`      Current price: $${pos.curPrice.toFixed(3)}`);
                if (pos.slug) {
                    console.log(`      📍 https://polymarket.com/event/${pos.slug}`);
                }
                console.log('');
            });
        } else {
            console.log('   ❌ No open positions found\n');
        }

        // 3. Trade History (last 50)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📜 TRADE HISTORY (last 20)\n');
        const activityUrl = `https://data-api.polymarket.com/activity?user=${PROXY_WALLET}&type=TRADE`;
        const activities: Activity[] = await fetchData(activityUrl);

        if (activities && activities.length > 0) {
            console.log(`   Total trades in API: ${activities.length}\n`);

            // Trade statistics
            const buyTrades = activities.filter((a) => a.side === 'BUY');
            const sellTrades = activities.filter((a) => a.side === 'SELL');
            const totalBuyVolume = buyTrades.reduce((sum, t) => sum + t.usdcSize, 0);
            const totalSellVolume = sellTrades.reduce((sum, t) => sum + t.usdcSize, 0);

            console.log('   📊 Trade statistics:');
            console.log(
                `      • Buys: ${buyTrades.length} (volume: $${totalBuyVolume.toFixed(2)})`
            );
            console.log(
                `      • Sells: ${sellTrades.length} (volume: $${totalSellVolume.toFixed(2)})`
            );
            console.log(`      • Total volume: $${(totalBuyVolume + totalSellVolume).toFixed(2)}\n`);

            // Last 20 trades
            const recentTrades = activities.slice(0, 20);
            console.log('   📝 Last 20 trades:\n');

            recentTrades.forEach((trade, idx) => {
                const date = new Date(trade.timestamp * 1000);
                const sideIcon = trade.side === 'BUY' ? '🟢' : '🔴';
                console.log(
                    `   ${idx + 1}. ${sideIcon} ${trade.side} - ${date.toLocaleString('en-US')}`
                );
                console.log(`      ${trade.title || 'Unknown Market'}`);
                console.log(`      ${trade.outcome || 'N/A'}`);
                console.log(
                    `      Volume: $${trade.usdcSize.toFixed(2)} @ $${trade.price.toFixed(3)}`
                );
                console.log(
                    `      TX: ${trade.transactionHash.slice(0, 10)}...${trade.transactionHash.slice(-8)}`
                );
                console.log(`      🔗 https://polygonscan.com/tx/${trade.transactionHash}`);
                console.log('');
            });
        } else {
            console.log('   ❌ Trade history not found\n');
        }

        // 4. Why no P&L charts
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('❓ WHY NO P&L CHARTS ON POLYMARKET?\n');
        console.log('   Profit/Loss charts on Polymarket only show REALIZED');
        console.log('   profit (closed positions). This is why it shows $0.00:\n');

        if (positions && positions.length > 0) {
            const totalRealizedPnl = positions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
            const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.cashPnl || 0), 0);

            console.log('   ✅ Realized P&L (closed positions):');
            console.log(`      → $${totalRealizedPnl.toFixed(2)} ← THIS is displayed on the chart\n`);

            console.log('   📊 Unrealized P&L (open positions):');
            console.log(
                `      → $${totalUnrealizedPnl.toFixed(2)} ← THIS is NOT displayed on the chart\n`
            );

            if (totalRealizedPnl === 0) {
                console.log('   💡 Solution: To see charts, you need to:');
                console.log('      1. Close several positions with profit');
                console.log('      2. Wait 5-10 minutes for Polymarket API to update');
                console.log('      3. P&L chart will start displaying data\n');
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Check completed!\n');
        console.log(`📱 Your profile: https://polymarket.com/profile/${PROXY_WALLET}\n`);
    } catch (error) {
        console.error('❌ Error fetching data:', error);
    }
};

checkMyStats();
