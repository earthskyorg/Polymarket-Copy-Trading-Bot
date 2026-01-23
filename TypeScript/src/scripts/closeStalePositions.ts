import { AssetType, ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { ENV } from '../config/env';
import createClobClient from '../utils/createClobClient';
import fetchData from '../utils/fetchData';

const PROXY_WALLET = ENV.PROXY_WALLET;
const USER_ADDRESSES = ENV.USER_ADDRESSES;
const RETRY_LIMIT = ENV.RETRY_LIMIT;

// Polymarket enforces a 1 token minimum on sell orders
const MIN_SELL_TOKENS = 1.0;
const ZERO_THRESHOLD = 0.0001;

interface Position {
    asset: string;
    conditionId: string;
    size: number;
    avgPrice: number;
    currentValue: number;
    curPrice: number;
    title?: string;
    outcome?: string;
    slug?: string;
    redeemable?: boolean;
}

interface SellResult {
    soldTokens: number;
    proceedsUsd: number;
    remainingTokens: number;
}

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

const isInsufficientBalanceOrAllowanceError = (message: string | undefined): boolean => {
    if (!message) {
        return false;
    }
    const lower = message.toLowerCase();
    return lower.includes('not enough balance') || lower.includes('allowance');
};

const updatePolymarketCache = async (clobClient: ClobClient, tokenId: string) => {
    try {
        await clobClient.updateBalanceAllowance({
            asset_type: AssetType.CONDITIONAL,
            token_id: tokenId,
        });
    } catch (error) {
        console.log(`⚠️  Failed to refresh balance cache for ${tokenId}:`, error);
    }
};

const sellEntirePosition = async (
    clobClient: ClobClient,
    position: Position
): Promise<SellResult> => {
    let remaining = position.size;
    let attempts = 0;
    let soldTokens = 0;
    let proceedsUsd = 0;

    if (remaining < MIN_SELL_TOKENS) {
        console.log(
            `   ❌ Position size ${remaining.toFixed(4)} < ${MIN_SELL_TOKENS} token minimum, skipping`
        );
        return { soldTokens: 0, proceedsUsd: 0, remainingTokens: remaining };
    }

    await updatePolymarketCache(clobClient, position.asset);

    while (remaining >= MIN_SELL_TOKENS && attempts < RETRY_LIMIT) {
        const orderBook = await clobClient.getOrderBook(position.asset);

        if (!orderBook.bids || orderBook.bids.length === 0) {
            console.log('   ❌ Order book has no bids – liquidity unavailable');
            break;
        }

        const bestBid = orderBook.bids.reduce((max, bid) => {
            return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
        }, orderBook.bids[0]);

        const bidSize = parseFloat(bestBid.size);
        const bidPrice = parseFloat(bestBid.price);

        if (bidSize < MIN_SELL_TOKENS) {
            console.log(
                `   ❌ Best bid only for ${bidSize.toFixed(2)} tokens (< ${MIN_SELL_TOKENS})`
            );
            break;
        }

        const sellAmount = Math.min(remaining, bidSize);

        if (sellAmount < MIN_SELL_TOKENS) {
            console.log(`   ❌ Remaining amount ${sellAmount.toFixed(4)} below minimum sell size`);
            break;
        }

        const orderArgs = {
            side: Side.SELL,
            tokenID: position.asset,
            amount: sellAmount,
            price: bidPrice,
        };

        try {
            const signedOrder = await clobClient.createMarketOrder(orderArgs);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);

            if (resp.success === true) {
                const tradeValue = sellAmount * bidPrice;
                soldTokens += sellAmount;
                proceedsUsd += tradeValue;
                remaining -= sellAmount;
                attempts = 0;
                console.log(
                    `   ✅ Sold ${sellAmount.toFixed(2)} tokens @ $${bidPrice.toFixed(3)} (≈ $${tradeValue.toFixed(2)})`
                );
            } else {
                attempts += 1;
                const errorMessage = extractOrderError(resp);

                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    console.log(
                        `   ❌ Order rejected: ${errorMessage ?? 'balance/allowance issue'}`
                    );
                    break;
                }
                console.log(
                    `   ⚠️  Sell attempt ${attempts}/${RETRY_LIMIT} failed${errorMessage ? ` – ${errorMessage}` : ''}`
                );
            }
        } catch (error) {
            attempts += 1;
            console.log(`   ⚠️  Sell attempt ${attempts}/${RETRY_LIMIT} threw error:`, error);
        }
    }

    if (remaining >= MIN_SELL_TOKENS) {
        console.log(`   ⚠️  Remaining unsold: ${remaining.toFixed(2)} tokens`);
    } else if (remaining > 0) {
        console.log(
            `   ℹ️  Residual dust < ${MIN_SELL_TOKENS} token left (${remaining.toFixed(4)})`
        );
    }

    return { soldTokens, proceedsUsd, remainingTokens: remaining };
};

const loadPositions = async (address: string): Promise<Position[]> => {
    const url = `https://data-api.polymarket.com/positions?user=${address}`;
    const data = await fetchData(url);
    const positions = Array.isArray(data) ? (data as Position[]) : [];
    return positions.filter((pos) => (pos.size || 0) > ZERO_THRESHOLD);
};

const buildTrackedSet = async (): Promise<Set<string>> => {
    const tracked = new Set<string>();

    for (const user of USER_ADDRESSES) {
        try {
            const positions = await loadPositions(user);
            positions.forEach((pos) => {
                if ((pos.size || 0) > ZERO_THRESHOLD) {
                    tracked.add(`${pos.conditionId}:${pos.asset}`);
                }
            });
        } catch (error) {
            console.log(`⚠️  Failed to load positions for ${user}:`, error);
        }
    }

    return tracked;
};

const logPositionHeader = (position: Position, index: number, total: number) => {
    console.log(`\n${index + 1}/${total} ▶ ${position.title || position.slug || position.asset}`);
    if (position.outcome) {
        console.log(`   Outcome: ${position.outcome}`);
    }
    console.log(
        `   Size: ${position.size.toFixed(2)} tokens @ avg $${position.avgPrice.toFixed(3)}`
    );
    console.log(
        `   Est. value: $${position.currentValue.toFixed(2)} (cur price $${position.curPrice.toFixed(3)})`
    );
    if (position.redeemable) {
        console.log('   ℹ️  Market is redeemable — consider redeeming if value stays flat at $0.');
    }
};

const main = async () => {
    console.log('🚀 Closing stale positions (tracked traders already exited)');
    console.log('════════════════════════════════════════════════════');
    console.log(`Wallet: ${PROXY_WALLET}`);

    const clobClient = await createClobClient();
    console.log('✅ Connected to Polymarket CLOB');

    const [myPositions, trackedPositions] = await Promise.all([
        loadPositions(PROXY_WALLET),
        buildTrackedSet(),
    ]);

    if (myPositions.length === 0) {
        console.log('\n🎉 No open positions detected for proxy wallet.');
        return;
    }

    const stalePositions = myPositions.filter(
        (pos) => !trackedPositions.has(`${pos.conditionId}:${pos.asset}`)
    );

    if (stalePositions.length === 0) {
        console.log('\n✅ All positions still held by tracked traders. Nothing to close.');
        return;
    }

    console.log(`\nFound ${stalePositions.length} stale position(s) to unwind.`);

    let totalTokens = 0;
    let totalProceeds = 0;

    for (let i = 0; i < stalePositions.length; i += 1) {
        const position = stalePositions[i];
        logPositionHeader(position, i, stalePositions.length);

        try {
            const result = await sellEntirePosition(clobClient, position);
            totalTokens += result.soldTokens;
            totalProceeds += result.proceedsUsd;
        } catch (error) {
            console.log('   ❌ Failed to close position due to unexpected error:', error);
        }
    }

    console.log('\n════════════════════════════════════════════════════');
    console.log('✅ Close-out summary');
    console.log(`Markets touched: ${stalePositions.length}`);
    console.log(`Tokens sold: ${totalTokens.toFixed(2)}`);
    console.log(`USDC realized (approx.): $${totalProceeds.toFixed(2)}`);
    console.log('════════════════════════════════════════════════════\n');
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script aborted due to error:', error);
        process.exit(1);
    });
