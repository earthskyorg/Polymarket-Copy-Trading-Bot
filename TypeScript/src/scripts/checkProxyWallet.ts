import { ethers } from 'ethers';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PROXY_WALLET = ENV.PROXY_WALLET;
const PRIVATE_KEY = ENV.PRIVATE_KEY;
const RPC_URL = ENV.RPC_URL;

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
}

const checkProxyWallet = async () => {
    console.log('🔍 CHECKING PROXY WALLET AND MAIN WALLET\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // 1. Get EOA (main wallet) from private key
        const wallet = new ethers.Wallet(PRIVATE_KEY);
        const eoaAddress = wallet.address;

        console.log('📍 YOUR ADDRESSES:\n');
        console.log(`   EOA (Main wallet):  ${eoaAddress}`);
        console.log(`   Proxy Wallet (Contract): ${PROXY_WALLET}\n`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 2. Check activity on EOA
        console.log('🔎 CHECKING ACTIVITY ON MAIN WALLET (EOA):\n');
        const eoaActivityUrl = `https://data-api.polymarket.com/activity?user=${eoaAddress}&type=TRADE`;
        const eoaActivities: Activity[] = await fetchData(eoaActivityUrl);

        console.log(`   Address: ${eoaAddress}`);
        console.log(`   Trades: ${eoaActivities?.length || 0}`);
        console.log(`   Profile: https://polymarket.com/profile/${eoaAddress}\n`);

        if (eoaActivities && eoaActivities.length > 0) {
            const buyTrades = eoaActivities.filter((a) => a.side === 'BUY');
            const sellTrades = eoaActivities.filter((a) => a.side === 'SELL');
            const totalBuyVolume = buyTrades.reduce((sum, t) => sum + t.usdcSize, 0);
            const totalSellVolume = sellTrades.reduce((sum, t) => sum + t.usdcSize, 0);

            console.log('   📊 EOA Statistics:');
            console.log(`      • Buys: ${buyTrades.length} ($${totalBuyVolume.toFixed(2)})`);
            console.log(`      • Sells: ${sellTrades.length} ($${totalSellVolume.toFixed(2)})`);
            console.log(`      • Volume: $${(totalBuyVolume + totalSellVolume).toFixed(2)}\n`);

            // Show last 3 trades
            console.log('   📝 Last 3 trades:');
            eoaActivities.slice(0, 3).forEach((trade, idx) => {
                const date = new Date(trade.timestamp * 1000);
                console.log(`      ${idx + 1}. ${trade.side} - ${trade.title || 'Unknown'}`);
                console.log(
                    `         $${trade.usdcSize.toFixed(2)} @ ${date.toLocaleDateString()}`
                );
            });
            console.log('');
        } else {
            console.log('   ❌ No trades found on main wallet\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 3. Check activity on Proxy Wallet
        console.log('🔎 CHECKING ACTIVITY ON PROXY WALLET (CONTRACT):\n');
        const proxyActivityUrl = `https://data-api.polymarket.com/activity?user=${PROXY_WALLET}&type=TRADE`;
        const proxyActivities: Activity[] = await fetchData(proxyActivityUrl);

        console.log(`   Address: ${PROXY_WALLET}`);
        console.log(`   Trades: ${proxyActivities?.length || 0}`);
        console.log(`   Profile: https://polymarket.com/profile/${PROXY_WALLET}\n`);

        if (proxyActivities && proxyActivities.length > 0) {
            const buyTrades = proxyActivities.filter((a) => a.side === 'BUY');
            const sellTrades = proxyActivities.filter((a) => a.side === 'SELL');
            const totalBuyVolume = buyTrades.reduce((sum, t) => sum + t.usdcSize, 0);
            const totalSellVolume = sellTrades.reduce((sum, t) => sum + t.usdcSize, 0);

            console.log('   📊 Proxy Wallet Statistics:');
            console.log(`      • Buys: ${buyTrades.length} ($${totalBuyVolume.toFixed(2)})`);
            console.log(`      • Sells: ${sellTrades.length} ($${totalSellVolume.toFixed(2)})`);
            console.log(`      • Volume: $${(totalBuyVolume + totalSellVolume).toFixed(2)}\n`);

            // Show last 3 trades
            console.log('   📝 Last 3 trades:');
            proxyActivities.slice(0, 3).forEach((trade, idx) => {
                const date = new Date(trade.timestamp * 1000);
                console.log(`      ${idx + 1}. ${trade.side} - ${trade.title || 'Unknown'}`);
                console.log(
                    `         $${trade.usdcSize.toFixed(2)} @ ${date.toLocaleDateString()}`
                );
            });
            console.log('');
        } else {
            console.log('   ❌ No trades found on proxy wallet\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 4. Check connection between addresses
        console.log('🔗 CONNECTION BETWEEN ADDRESSES:\n');

        // Check if trades contain proxyWallet field
        if (eoaActivities && eoaActivities.length > 0) {
            const sampleTrade = eoaActivities[0];
            console.log(`   EOA trades contain proxyWallet: ${sampleTrade.proxyWallet || 'N/A'}`);
        }

        if (proxyActivities && proxyActivities.length > 0) {
            const sampleTrade = proxyActivities[0];
            console.log(
                `   Proxy trades contain proxyWallet: ${sampleTrade.proxyWallet || 'N/A'}`
            );
        }

        console.log('\n   💡 HOW IT WORKS:\n');
        console.log('   1. EOA (Externally Owned Account) - your main wallet');
        console.log('      • Controlled by private key');
        console.log('      • Signs transactions');
        console.log('      • Does NOT store funds on Polymarket\n');

        console.log('   2. Proxy Wallet - smart contract wallet');
        console.log('      • Created automatically by Polymarket');
        console.log('      • Stores USDC and position tokens');
        console.log('      • Executes trades on behalf of EOA');
        console.log('      • Linked to EOA through signature\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 5. Identify the problem
        console.log('❓ WHY NO STATISTICS ON PROFILE?\n');

        const eoaHasTrades = eoaActivities && eoaActivities.length > 0;
        const proxyHasTrades = proxyActivities && proxyActivities.length > 0;

        if (!eoaHasTrades && proxyHasTrades) {
            console.log('   🎯 PROBLEM FOUND!\n');
            console.log('   All trades go through Proxy Wallet, but statistics on Polymarket');
            console.log('   may be displayed on the main wallet profile (EOA).\n');

            console.log('   📊 WHERE TO VIEW STATISTICS:\n');
            console.log(`   ✅ CORRECT profile (with trading):`);
            console.log(`      https://polymarket.com/profile/${PROXY_WALLET}\n`);

            console.log(`   ❌ EOA profile (may be empty):`);
            console.log(`      https://polymarket.com/profile/${eoaAddress}\n`);

            console.log('   💡 SOLUTION:\n');
            console.log('   Use Proxy Wallet address to view statistics:');
            console.log(`   ${PROXY_WALLET}\n`);
        } else if (eoaHasTrades && !proxyHasTrades) {
            console.log('   Trades go through main wallet (EOA)');
            console.log('   Statistics should be displayed on EOA profile\n');
        } else if (eoaHasTrades && proxyHasTrades) {
            console.log('   Trades exist on both addresses!');
            console.log('   You may have used different wallets\n');
        } else {
            console.log('   ❌ No trades found on any address\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 6. Check via blockchain
        console.log('🔗 BLOCKCHAIN CHECK:\n');
        console.log(`   EOA (main):`);
        console.log(`   https://polygonscan.com/address/${eoaAddress}\n`);
        console.log(`   Proxy Wallet (contract):`);
        console.log(`   https://polygonscan.com/address/${PROXY_WALLET}\n`);

        // Check address type via RPC
        try {
            const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

            const eoaCode = await provider.getCode(eoaAddress);
            const proxyCode = await provider.getCode(PROXY_WALLET);

            console.log('   🔍 Address types:');
            console.log(
                `      EOA: ${eoaCode === '0x' ? '✅ Regular wallet (EOA)' : '⚠️  Smart contract'}`
            );
            console.log(
                `      Proxy: ${proxyCode === '0x' ? '❌ Regular wallet (error!)' : '✅ Smart contract (correct)'}\n`
            );
        } catch (error) {
            console.log('   ⚠️  Failed to check address types via RPC\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('✅ SUMMARY:\n');
        console.log('   Your bot uses PROXY_WALLET for trading.');
        console.log('   This is correct and safe!\n');
        console.log('   Statistics and charts should be displayed at:');
        console.log(`   🔗 https://polymarket.com/profile/${PROXY_WALLET}\n`);
        console.log('   If charts are still not there, this is a Polymarket UI bug.\n');
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

checkProxyWallet();
