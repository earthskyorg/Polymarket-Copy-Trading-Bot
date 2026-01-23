import mongoose from 'mongoose';

/**
 * Trade side type
 */
export type TradeSide = 'BUY' | 'SELL';

/**
 * Activity type
 */
export type ActivityType = 'TRADE' | 'REDEEM' | 'MERGE' | string;

/**
 * User activity interface representing a trade or activity
 */
export interface UserActivityInterface {
    _id: mongoose.Types.ObjectId;
    proxyWallet: string;
    timestamp: number;
    conditionId: string;
    type: ActivityType;
    size: number;
    usdcSize: number;
    transactionHash: string;
    price: number;
    asset: string;
    side: TradeSide;
    outcomeIndex: number;
    title: string;
    slug: string;
    icon: string;
    eventSlug: string;
    outcome: string;
    name: string;
    pseudonym: string;
    bio: string;
    profileImage: string;
    profileImageOptimized: string;
    bot: boolean;
    botExcutedTime: number;
    /** Tracks actual tokens we bought for this trade */
    myBoughtSize?: number;
}

/**
 * User position interface representing an open position
 */
export interface UserPositionInterface {
    _id: mongoose.Types.ObjectId;
    proxyWallet: string;
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
    mergeable: boolean;
    title: string;
    slug: string;
    icon: string;
    eventSlug: string;
    outcome: string;
    outcomeIndex: number;
    oppositeOutcome: string;
    oppositeAsset: string;
    endDate: string;
    negativeRisk: boolean;
}

/**
 * Order book entry interface
 */
export interface OrderBookEntry {
    price: string;
    size: string;
}

/**
 * Order book interface
 */
export interface OrderBook {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
}

/**
 * Position summary for display
 */
export interface PositionSummary {
    title: string;
    outcome: string;
    currentValue: number;
    percentPnl: number;
    avgPrice: number;
    curPrice: number;
}
