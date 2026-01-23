import mongoose, { Schema } from 'mongoose';

/**
 * Position Schema - Tracks open positions for each trader
 * Collections are created dynamically per wallet address: user_positions_{walletAddress}
 */
const positionSchema = new Schema(
    {
        proxyWallet: { type: String, index: true, sparse: true },
        asset: { type: String, index: true, sparse: true },
        conditionId: { type: String, index: true, sparse: true },
        size: { type: Number, default: 0 },
        avgPrice: { type: Number, default: 0 },
        initialValue: { type: Number, default: 0 },
        currentValue: { type: Number, default: 0 },
        cashPnl: { type: Number, default: 0 },
        percentPnl: { type: Number, default: 0 },
        totalBought: { type: Number, default: 0 },
        realizedPnl: { type: Number, default: 0 },
        percentRealizedPnl: { type: Number, default: 0 },
        curPrice: { type: Number, default: 0 },
        redeemable: { type: Boolean, default: false },
        mergeable: { type: Boolean, default: false },
        title: { type: String, index: 'text' },
        slug: { type: String, index: true, sparse: true },
        icon: { type: String },
        eventSlug: { type: String, index: true, sparse: true },
        outcome: { type: String },
        outcomeIndex: { type: Number },
        oppositeOutcome: { type: String },
        oppositeAsset: { type: String },
        endDate: { type: String },
        negativeRisk: { type: Boolean, default: false },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: undefined, // Will be set dynamically
    }
);

/**
 * Activity Schema - Tracks trade history and activities for each trader
 * Collections are created dynamically per wallet address: user_activities_{walletAddress}
 */
const activitySchema = new Schema(
    {
        proxyWallet: { type: String, index: true, sparse: true },
        timestamp: { type: Number, index: true, required: true }, // Unix timestamp
        conditionId: { type: String, index: true, sparse: true },
        type: { type: String, index: true }, // TRADE, REDEEM, MERGE
        size: { type: Number, default: 0 },
        usdcSize: { type: Number, default: 0 },
        transactionHash: { type: String, index: true, sparse: true, unique: false }, // Note: unique: false since we have multiple collections
        price: { type: Number, default: 0 },
        asset: { type: String, index: true, sparse: true },
        side: { type: String, index: true }, // BUY, SELL
        outcomeIndex: { type: Number },
        title: { type: String, index: 'text' },
        slug: { type: String, index: true, sparse: true },
        icon: { type: String },
        eventSlug: { type: String, index: true, sparse: true },
        outcome: { type: String },
        name: { type: String },
        pseudonym: { type: String },
        bio: { type: String },
        profileImage: { type: String },
        profileImageOptimized: { type: String },
        bot: { type: Boolean, default: false },
        botExcutedTime: { type: Number },
        myBoughtSize: { type: Number, default: 0 }, // Tracks actual tokens we bought
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        collection: undefined, // Will be set dynamically
    }
);

// Compound indexes for better query performance
positionSchema.index({ conditionId: 1, asset: 1 });
positionSchema.index({ proxyWallet: 1, conditionId: 1 });
positionSchema.index({ currentValue: -1 }); // For sorting by value
positionSchema.index({ percentPnl: -1 }); // For sorting by PnL

activitySchema.index({ timestamp: -1 }); // For sorting by time (newest first)
activitySchema.index({ conditionId: 1, timestamp: -1 }); // For querying trades by condition
activitySchema.index({ proxyWallet: 1, timestamp: -1 }); // For querying trades by wallet
activitySchema.index({ type: 1, timestamp: -1 }); // For filtering by activity type
activitySchema.index({ side: 1, timestamp: -1 }); // For filtering by trade side
activitySchema.index({ transactionHash: 1, timestamp: -1 }); // For finding specific transactions

const getUserPositionModel = (walletAddress: string) => {
    const collectionName = `user_positions_${walletAddress}`;
    return mongoose.model(collectionName, positionSchema, collectionName);
};

const getUserActivityModel = (walletAddress: string) => {
    const collectionName = `user_activities_${walletAddress}`;
    return mongoose.model(collectionName, activitySchema, collectionName);
};

export { getUserActivityModel, getUserPositionModel };
