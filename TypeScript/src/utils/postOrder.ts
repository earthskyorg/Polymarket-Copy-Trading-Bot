import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { ENV } from '../config/env';
import { UserActivityInterface, UserPositionInterface, TradeSide } from '../interfaces/User';
import { getUserActivityModel } from '../models/userHistory';
import Logger from './logger';
import { calculateOrderSize, getTradeMultiplier } from '../config/copyStrategy';
import { TRADING_CONSTANTS, DB_FIELDS } from './constants';
import { TradingError, InsufficientFundsError, normalizeError } from './errors';

const RETRY_LIMIT = ENV.RETRY_LIMIT;
const COPY_STRATEGY_CONFIG = ENV.COPY_STRATEGY_CONFIG;
const MIN_ORDER_SIZE_USD = TRADING_CONSTANTS.MIN_ORDER_SIZE_USD;
const MIN_ORDER_SIZE_TOKENS = TRADING_CONSTANTS.MIN_ORDER_SIZE_TOKENS;

/**
 * Extract error message from order response
 * @param response - Order response object
 * @returns Error message or undefined
 */
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

/**
 * Check if error message indicates insufficient balance or allowance
 * @param message - Error message to check
 * @returns True if insufficient balance/allowance error
 */
const isInsufficientBalanceOrAllowanceError = (message: string | undefined): boolean => {
    if (!message) {
        return false;
    }
    const lower = message.toLowerCase();
    return lower.includes('not enough balance') || lower.includes('allowance');
};

/**
 * Post order to Polymarket based on trade condition
 * @param clobClient - CLOB client instance
 * @param condition - Trade condition: 'buy', 'sell', or 'merge'
 * @param my_position - Current position in our wallet
 * @param user_position - Current position in trader's wallet
 * @param trade - Trade activity to execute
 * @param my_balance - Our USDC balance
 * @param user_balance - Trader's total portfolio value
 * @param userAddress - Trader's wallet address
 * @throws TradingError if order execution fails
 */
const postOrder = async (
    clobClient: ClobClient,
    condition: 'buy' | 'sell' | 'merge',
    my_position: UserPositionInterface | undefined,
    user_position: UserPositionInterface | undefined,
    trade: UserActivityInterface,
    my_balance: number,
    user_balance: number,
    userAddress: string
): Promise<void> => {
    const UserActivity = getUserActivityModel(userAddress);
    
    // Merge strategy
    if (condition === 'merge') {
        Logger.info('Executing MERGE strategy...');
        if (!my_position) {
            Logger.warning('No position to merge');
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
            return;
        }
        let remaining = my_position.size;

        // Check minimum order size
        if (remaining < MIN_ORDER_SIZE_TOKENS) {
            Logger.warning(
                `Position size (${remaining.toFixed(2)} tokens) too small to merge - skipping`
            );
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
            return;
        }

        let retry = 0;
        let abortDueToFunds = false;
        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                Logger.warning('No bids available in order book');
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]!);

            Logger.info(`Best bid: ${maxPriceBid.size} @ $${maxPriceBid.price}`);
            
            // Determine order size based on available liquidity
            const orderSize = remaining <= parseFloat(maxPriceBid.size) 
                ? remaining 
                : parseFloat(maxPriceBid.size);
            
            const orderArgs = {
                side: Side.SELL,
                tokenID: my_position.asset,
                amount: orderSize,
                price: parseFloat(maxPriceBid.price),
            };
            
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(orderArgs);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                Logger.orderResult(
                    true,
                    `Sold ${orderArgs.amount} tokens at $${orderArgs.price}`
                );
                remaining -= orderArgs.amount;
            } else {
                const errorMessage = extractOrderError(resp);
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }
        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { bot: true, botExcutedTime: RETRY_LIMIT }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else if (condition === 'buy') {
        // Buy strategy
        Logger.info('Executing BUY strategy...');

        Logger.info(`Your balance: $${my_balance.toFixed(2)}`);
        Logger.info(`Trader bought: $${trade.usdcSize.toFixed(2)}`);

        // Get current position size for position limit checks
        const currentPositionValue = my_position ? my_position.size * my_position.avgPrice : 0;

        // Use new copy strategy system
        const orderCalc = calculateOrderSize(
            COPY_STRATEGY_CONFIG,
            trade.usdcSize,
            my_balance,
            currentPositionValue
        );

        // Log the calculation reasoning
        Logger.info(`📊 ${orderCalc.reasoning}`);

        // Check if order should be executed
        if (orderCalc.finalAmount === 0) {
            Logger.warning(`❌ Cannot execute: ${orderCalc.reasoning}`);
            if (orderCalc.belowMinimum) {
                Logger.warning(`💡 Increase COPY_SIZE or wait for larger trades`);
            }
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
            return;
        }

        let remaining = orderCalc.finalAmount;

        let retry = 0;
        let abortDueToFunds = false;
        let totalBoughtTokens = 0; // Track total tokens bought for this trade

        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.asks || orderBook.asks.length === 0) {
                Logger.warning('No asks available in order book');
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                break;
            }

            const minPriceAsk = orderBook.asks.reduce((min, ask) => {
                return parseFloat(ask.price) < parseFloat(min.price) ? ask : min;
            }, orderBook.asks[0]!);

            Logger.info(`Best ask: ${minPriceAsk.size} @ $${minPriceAsk.price}`);
            if (parseFloat(minPriceAsk.price) - TRADING_CONSTANTS.MAX_PRICE_SLIPPAGE > trade.price) {
                Logger.warning('Price slippage too high - skipping trade');
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                break;
            }

            // Check if remaining amount is below minimum before creating order
            if (remaining < MIN_ORDER_SIZE_USD) {
                Logger.info(
                    `Remaining amount ($${remaining.toFixed(2)}) below minimum - completing trade`
                );
                await UserActivity.updateOne(
                    { _id: trade._id },
                    { [DB_FIELDS.BOT_EXECUTED]: true, [DB_FIELDS.MY_BOUGHT_SIZE]: totalBoughtTokens }
                );
                break;
            }

            const maxOrderSize = parseFloat(minPriceAsk.size) * parseFloat(minPriceAsk.price);
            const orderSize = Math.min(remaining, maxOrderSize);

            const orderArgs = {
                side: Side.BUY,
                tokenID: trade.asset,
                amount: orderSize,
                price: parseFloat(minPriceAsk.price),
            };

            Logger.info(
                `Creating order: $${orderSize.toFixed(2)} @ $${minPriceAsk.price} (Balance: $${my_balance.toFixed(2)})`
            );
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(orderArgs);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                const tokensBought = orderArgs.amount / orderArgs.price;
                totalBoughtTokens += tokensBought;
                Logger.orderResult(
                    true,
                    `Bought $${orderArgs.amount.toFixed(2)} at $${orderArgs.price} (${tokensBought.toFixed(2)} tokens)`
                );
                remaining -= orderArgs.amount;
            } else {
                const errorMessage = extractOrderError(resp);
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }
        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                {
                    [DB_FIELDS.BOT_EXECUTED]: true,
                    [DB_FIELDS.BOT_EXECUTED_TIME]: RETRY_LIMIT,
                    [DB_FIELDS.MY_BOUGHT_SIZE]: totalBoughtTokens,
                }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne(
                { _id: trade._id },
                {
                    [DB_FIELDS.BOT_EXECUTED]: true,
                    [DB_FIELDS.BOT_EXECUTED_TIME]: retry,
                    [DB_FIELDS.MY_BOUGHT_SIZE]: totalBoughtTokens,
                }
            );
        } else {
            await UserActivity.updateOne(
                { _id: trade._id },
                { [DB_FIELDS.BOT_EXECUTED]: true, [DB_FIELDS.MY_BOUGHT_SIZE]: totalBoughtTokens }
            );
        }

        // Log the tracked purchase for later sell reference
        if (totalBoughtTokens > 0) {
            Logger.info(
                `📝 Tracked purchase: ${totalBoughtTokens.toFixed(2)} tokens for future sell calculations`
            );
        }
    } else if (condition === 'sell') {
        // Sell strategy
        Logger.info('Executing SELL strategy...');
        let remaining = 0;
        if (!my_position) {
            Logger.warning('No position to sell');
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
            return;
        }

        // Get all previous BUY trades for this asset to calculate total bought
        const previousBuys = await UserActivity.find({
            asset: trade.asset,
            conditionId: trade.conditionId,
            side: DB_FIELDS.SIDE_BUY,
            [DB_FIELDS.BOT_EXECUTED]: true,
            [DB_FIELDS.MY_BOUGHT_SIZE]: { $exists: true, $gt: 0 },
        }).exec();

        const totalBoughtTokens = previousBuys.reduce(
            (sum, buy) => sum + (buy.myBoughtSize || 0),
            0
        );

        if (totalBoughtTokens > 0) {
            Logger.info(
                `📊 Found ${previousBuys.length} previous purchases: ${totalBoughtTokens.toFixed(2)} tokens bought`
            );
        }

        if (!user_position) {
            // Trader sold entire position - we sell entire position too
            remaining = my_position.size;
            Logger.info(
                `Trader closed entire position → Selling all your ${remaining.toFixed(2)} tokens`
            );
        } else {
            // Calculate the % of position the trader is selling
            const trader_sell_percent = trade.size / (user_position.size + trade.size);
            const trader_position_before = user_position.size + trade.size;

            Logger.info(
                `Position comparison: Trader has ${trader_position_before.toFixed(2)} tokens, You have ${my_position.size.toFixed(2)} tokens`
            );
            Logger.info(
                `Trader selling: ${trade.size.toFixed(2)} tokens (${(trader_sell_percent * 100).toFixed(2)}% of their position)`
            );

            // Use tracked bought tokens if available, otherwise fallback to current position
            let baseSellSize;
            if (totalBoughtTokens > 0) {
                baseSellSize = totalBoughtTokens * trader_sell_percent;
                Logger.info(
                    `Calculating from tracked purchases: ${totalBoughtTokens.toFixed(2)} × ${(trader_sell_percent * 100).toFixed(2)}% = ${baseSellSize.toFixed(2)} tokens`
                );
            } else {
                baseSellSize = my_position.size * trader_sell_percent;
                Logger.warning(
                    `No tracked purchases found, using current position: ${my_position.size.toFixed(2)} × ${(trader_sell_percent * 100).toFixed(2)}% = ${baseSellSize.toFixed(2)} tokens`
                );
            }

            // Apply tiered or single multiplier based on trader's order size (symmetrical with BUY logic)
            const multiplier = getTradeMultiplier(COPY_STRATEGY_CONFIG, trade.usdcSize);
            remaining = baseSellSize * multiplier;

            if (multiplier !== 1.0) {
                Logger.info(
                    `Applying ${multiplier}x multiplier (based on trader's $${trade.usdcSize.toFixed(2)} order): ${baseSellSize.toFixed(2)} → ${remaining.toFixed(2)} tokens`
                );
            }
        }

        // Check minimum order size
        if (remaining < MIN_ORDER_SIZE_TOKENS) {
            Logger.warning(
                `❌ Cannot execute: Sell amount ${remaining.toFixed(2)} tokens below minimum (${MIN_ORDER_SIZE_TOKENS} token)`
            );
            Logger.warning(`💡 This happens when position sizes are too small or mismatched`);
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
            return;
        }

        // Cap sell amount to available position size
        if (remaining > my_position.size) {
            Logger.warning(
                `⚠️  Calculated sell ${remaining.toFixed(2)} tokens > Your position ${my_position.size.toFixed(2)} tokens`
            );
            Logger.warning(`Capping to maximum available: ${my_position.size.toFixed(2)} tokens`);
            remaining = my_position.size;
        }

        let retry = 0;
        let abortDueToFunds = false;
        let totalSoldTokens = 0; // Track total tokens sold

        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                Logger.warning('No bids available in order book');
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]!);

            Logger.info(`Best bid: ${maxPriceBid.size} @ $${maxPriceBid.price}`);

            // Check if remaining amount is below minimum before creating order
            if (remaining < MIN_ORDER_SIZE_TOKENS) {
                Logger.info(
                    `Remaining amount (${remaining.toFixed(2)} tokens) below minimum - completing trade`
                );
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                break;
            }

            const sellAmount = Math.min(remaining, parseFloat(maxPriceBid.size));

            // Final check: don't create orders below minimum
            if (sellAmount < MIN_ORDER_SIZE_TOKENS) {
                Logger.info(
                    `Order amount (${sellAmount.toFixed(2)} tokens) below minimum - completing trade`
                );
                await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
                break;
            }

            const orderArgs = {
                side: Side.SELL,
                tokenID: trade.asset,
                amount: sellAmount,
                price: parseFloat(maxPriceBid.price),
            };
            // Order args logged internally
            const signedOrder = await clobClient.createMarketOrder(orderArgs);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                totalSoldTokens += orderArgs.amount;
                Logger.orderResult(
                    true,
                    `Sold ${orderArgs.amount} tokens at $${orderArgs.price}`
                );
                remaining -= orderArgs.amount;
            } else {
                const errorMessage = extractOrderError(resp);
                if (isInsufficientBalanceOrAllowanceError(errorMessage)) {
                    abortDueToFunds = true;
                    Logger.warning(
                        `Order rejected: ${errorMessage || 'Insufficient balance or allowance'}`
                    );
                    Logger.warning(
                        'Skipping remaining attempts. Top up funds or run `npm run check-allowance` before retrying.'
                    );
                    break;
                }
                retry += 1;
                Logger.warning(
                    `Order failed (attempt ${retry}/${RETRY_LIMIT})${errorMessage ? ` - ${errorMessage}` : ''}`
                );
            }
        }

        // Update tracked purchases after successful sell
        if (totalSoldTokens > 0 && totalBoughtTokens > 0) {
            const sellPercentage = totalSoldTokens / totalBoughtTokens;

            if (sellPercentage >= 0.99) {
                // Sold essentially all tracked tokens - clear tracking
                await UserActivity.updateMany(
                    {
                        asset: trade.asset,
                        conditionId: trade.conditionId,
                        side: DB_FIELDS.SIDE_BUY,
                        [DB_FIELDS.BOT_EXECUTED]: true,
                        [DB_FIELDS.MY_BOUGHT_SIZE]: { $exists: true, $gt: 0 },
                    },
                    { $set: { [DB_FIELDS.MY_BOUGHT_SIZE]: 0 } }
                );
                Logger.info(
                    `🧹 Cleared purchase tracking (sold ${(sellPercentage * 100).toFixed(1)}% of position)`
                );
            } else {
                // Partial sell - reduce tracked purchases proportionally
                for (const buy of previousBuys) {
                    const newSize = (buy.myBoughtSize || 0) * (1 - sellPercentage);
                    await UserActivity.updateOne(
                        { _id: buy._id },
                        { $set: { [DB_FIELDS.MY_BOUGHT_SIZE]: newSize } }
                    );
                }
                Logger.info(
                    `📝 Updated purchase tracking (sold ${(sellPercentage * 100).toFixed(1)}% of tracked position)`
                );
            }
        }

        if (abortDueToFunds) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { [DB_FIELDS.BOT_EXECUTED]: true, [DB_FIELDS.BOT_EXECUTED_TIME]: RETRY_LIMIT }
            );
            return;
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne(
                { _id: trade._id },
                { [DB_FIELDS.BOT_EXECUTED]: true, [DB_FIELDS.BOT_EXECUTED_TIME]: retry }
            );
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { [DB_FIELDS.BOT_EXECUTED]: true });
        }
    } else {
        Logger.error(`Unknown condition: ${condition}`);
    }
};

export default postOrder;
