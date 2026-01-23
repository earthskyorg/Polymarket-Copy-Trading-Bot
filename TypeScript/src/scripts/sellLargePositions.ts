import { ethers } from 'ethers';
import { AssetType, ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { SignatureType } from '@polymarket/order-utils';
import { ENV } from '../config/env';
import fetchData from '../utils/fetchData';

const PROXY_WALLET = ENV.PROXY_WALLET;
const PRIVATE_KEY = ENV.PRIVATE_KEY;
const CLOB_HTTP_URL = ENV.CLOB_HTTP_URL;
const RPC_URL = ENV.RPC_URL;
const POLYGON_CHAIN_ID = 137;
const RETRY_LIMIT = ENV.RETRY_LIMIT;

const SELL_PERCENTAGE = 0.8; // 80%
const MIN_POSITION_VALUE = 17; // Продаем только позиции > $17

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

const isGnosisSafe = async (
    address: string,
    provider: ethers.providers.JsonRpcProvider
): Promise<boolean> => {
    try {
        const code = await provider.getCode(address);
        return code !== '0x';
    } catch (error) {
        console.error(`Error checking wallet type: ${error}`);
        return false;
    }
};

const createClobClient = async (
    provider: ethers.providers.JsonRpcProvider
): Promise<ClobClient> => {
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const isProxySafe = await isGnosisSafe(PROXY_WALLET, provider);
    const signatureType = isProxySafe ? SignatureType.POLY_GNOSIS_SAFE : SignatureType.EOA;

    console.log(`Wallet type: ${isProxySafe ? 'Gnosis Safe' : 'EOA'}`);

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = function () {};
    console.error = function () {};

    let clobClient = new ClobClient(
        CLOB_HTTP_URL,
        POLYGON_CHAIN_ID,
        wallet,
        undefined,
        signatureType,
        isProxySafe ? PROXY_WALLET : undefined
    );

    let creds = await clobClient.createApiKey();
    if (!creds.key) {
        creds = await clobClient.deriveApiKey();
    }

    clobClient = new ClobClient(
        CLOB_HTTP_URL,
        POLYGON_CHAIN_ID,
        wallet,
        creds,
        signatureType,
        isProxySafe ? PROXY_WALLET : undefined
    );

    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    return clobClient;
};

const updatePolymarketCache = async (clobClient: ClobClient, tokenId: string) => {
    try {
        console.log('🔄 Updating Polymarket balance cache for token...');
        const updateParams = {
            asset_type: AssetType.CONDITIONAL,
            token_id: tokenId,
        };

        await clobClient.updateBalanceAllowance(updateParams);
        console.log('✅ Cache updated successfully\n');
    } catch (error) {
        console.log('⚠️  Warning: Could not update cache:', error);
    }
};

const sellPosition = async (clobClient: ClobClient, position: Position, sellSize: number) => {
    let remaining = sellSize;
    let retry = 0;

    console.log(
        `\n🔄 Starting to sell ${sellSize.toFixed(2)} tokens (${(SELL_PERCENTAGE * 100).toFixed(0)}% of position)`
    );
    console.log(`Token ID: ${position.asset.slice(0, 20)}...`);
    console.log(`Market: ${position.title} - ${position.outcome}\n`);

    // Update Polymarket cache before selling
    await updatePolymarketCache(clobClient, position.asset);

    while (remaining > 0 && retry < RETRY_LIMIT) {
        try {
            // Get current order book
            const orderBook = await clobClient.getOrderBook(position.asset);

            if (!orderBook.bids || orderBook.bids.length === 0) {
                console.log('❌ No bids available in order book');
                break;
            }

            // Find best bid
            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            console.log(`📊 Best bid: ${maxPriceBid.size} tokens @ $${maxPriceBid.price}`);

            // Determine order size
            let orderAmount: number;
            if (remaining <= parseFloat(maxPriceBid.size)) {
                orderAmount = remaining;
            } else {
                orderAmount = parseFloat(maxPriceBid.size);
            }

            // Create sell order
            const orderArgs = {
                side: Side.SELL,
                tokenID: position.asset,
                amount: orderAmount,
                price: parseFloat(maxPriceBid.price),
            };

            console.log(`📤 Selling ${orderAmount.toFixed(2)} tokens at $${orderArgs.price}...`);

            const signedOrder = await clobClient.createMarketOrder(orderArgs);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);

            if (resp.success === true) {
                retry = 0;
                const soldValue = (orderAmount * orderArgs.price).toFixed(2);
                console.log(
                    `✅ SUCCESS: Sold ${orderAmount.toFixed(2)} tokens at $${orderArgs.price} (Total: $${soldValue})`
                );
                remaining -= orderAmount;

                if (remaining > 0) {
                    console.log(`⏳ Remaining to sell: ${remaining.toFixed(2)} tokens\n`);
                }
            } else {
                retry += 1;
                const errorMsg = extractOrderError(resp);
                console.log(
                    `⚠️  Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMsg ? `: ${errorMsg}` : ''}`
                );

                if (retry < RETRY_LIMIT) {
                    console.log('🔄 Retrying...\n');
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            retry += 1;
            console.error(`❌ Error during sell attempt ${retry}/${RETRY_LIMIT}:`, error);

            if (retry < RETRY_LIMIT) {
                console.log('🔄 Retrying...\n');
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }

    if (remaining > 0) {
        console.log(`\n⚠️  Could not sell all tokens. Remaining: ${remaining.toFixed(2)} tokens`);
        return false;
    } else {
        console.log(`\n🎉 Successfully sold ${sellSize.toFixed(2)} tokens!`);
        return true;
    }
};

const extractOrderError = (response: unknown): string | undefined => {
    if (!response) {
        return undefined;
    }

    if (typeof response === 'string') {
        return response;
    }

    if (typeof response === 'object') {
        const data = response as Record<string, unknown>;

        const directError = data.error;
        if (typeof directError === 'string') {
            return directError;
        }

        if (typeof directError === 'object' && directError !== null) {
            const nested = directError as Record<string, unknown>;
            if (typeof nested.error === 'string') {
                return nested.error;
            }
            if (typeof nested.message === 'string') {
                return nested.message;
            }
        }

        if (typeof data.errorMsg === 'string') {
            return data.errorMsg;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }
    }

    return undefined;
};

async function main() {
    console.log('🚀 Sell Large Positions Script');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`📍 Wallet: ${PROXY_WALLET}`);
    console.log(`📊 Sell percentage: ${(SELL_PERCENTAGE * 100).toFixed(0)}%`);
    console.log(`💰 Minimum position value: $${MIN_POSITION_VALUE}\n`);

    try {
        // Create provider and client
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const clobClient = await createClobClient(provider);

        console.log('✅ Connected to Polymarket\n');

        // Get all positions
        console.log('📥 Fetching positions...');
        const positions: Position[] = await fetchData(
            `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`
        );
        console.log(`Found ${positions.length} position(s)\n`);

        // Filter large positions
        const largePositions = positions.filter((p) => p.currentValue > MIN_POSITION_VALUE);

        if (largePositions.length === 0) {
            console.log(`✅ No positions larger than $${MIN_POSITION_VALUE} found.`);
            process.exit(0);
        }

        // Sort by size
        largePositions.sort((a, b) => b.currentValue - a.currentValue);

        console.log(`🎯 Found ${largePositions.length} large position(s):\n`);
        for (const pos of largePositions) {
            console.log(`  • ${pos.title || 'Unknown'} [${pos.outcome}]`);
            console.log(
                `    Current: $${pos.currentValue.toFixed(2)} (${pos.size.toFixed(2)} shares)`
            );
            console.log(
                `    Will sell: ${(pos.size * SELL_PERCENTAGE).toFixed(2)} shares (${(SELL_PERCENTAGE * 100).toFixed(0)}%)`
            );
            console.log(``);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let successCount = 0;
        let failureCount = 0;
        let totalSold = 0;

        // Sell each position
        for (let i = 0; i < largePositions.length; i++) {
            const position = largePositions[i];
            const sellSize = Math.floor(position.size * SELL_PERCENTAGE);

            console.log(`\n📦 Position ${i + 1}/${largePositions.length}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Market: ${position.title || 'Unknown'}`);
            console.log(`Outcome: ${position.outcome || 'Unknown'}`);
            console.log(`Position size: ${position.size.toFixed(2)} tokens`);
            console.log(`Average price: $${position.avgPrice.toFixed(4)}`);
            console.log(`Current value: $${position.currentValue.toFixed(2)}`);
            console.log(
                `PnL: $${position.cashPnl.toFixed(2)} (${position.percentPnl.toFixed(2)}%)`
            );

            if (sellSize < 1.0) {
                console.log(
                    `\n⚠️  Skipping: Sell size (${sellSize.toFixed(2)} tokens) is below minimum (1.0 token)\n`
                );
                failureCount++;
                continue;
            }

            const success = await sellPosition(clobClient, position, sellSize);

            if (success) {
                successCount++;
                totalSold += sellSize;
            } else {
                failureCount++;
            }

            // Pause between sales
            if (i < largePositions.length - 1) {
                console.log('\n⏳ Waiting 2 seconds before next sale...\n');
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Successful sales: ${successCount}/${largePositions.length}`);
        console.log(`❌ Failed sales: ${failureCount}/${largePositions.length}`);
        console.log(`📦 Total tokens sold: ${totalSold.toFixed(2)}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('✅ Script completed!');
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
