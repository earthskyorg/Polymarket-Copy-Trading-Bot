/**
 * Copy Trading Strategy Configuration
 *
 * This module defines the strategy for copying trades from followed traders.
 * Three strategies are supported:
 * - PERCENTAGE: Copy a fixed percentage of trader's order size
 * - FIXED: Copy a fixed dollar amount per trade
 * - ADAPTIVE: Dynamically adjust percentage based on trader's order size
 */

export enum CopyStrategy {
    PERCENTAGE = 'PERCENTAGE',
    FIXED = 'FIXED',
    ADAPTIVE = 'ADAPTIVE',
}

/**
 * Tier definition for tiered multipliers
 * Example: { min: 100, max: 500, multiplier: 0.2 }
 * means trades between $100-$500 use 0.2x multiplier
 */
export interface MultiplierTier {
    min: number;          // Minimum trade size in USD (inclusive)
    max: number | null;   // Maximum trade size in USD (exclusive), null = infinity
    multiplier: number;   // Multiplier to apply
}

export interface CopyStrategyConfig {
    // Core strategy
    strategy: CopyStrategy;

    // Main parameter (meaning depends on strategy)
    // PERCENTAGE: Percentage of trader's order (e.g., 10.0 = 10%)
    // FIXED: Fixed dollar amount per trade (e.g., 50.0 = $50)
    // ADAPTIVE: Base percentage for adaptive scaling
    copySize: number;

    // Adaptive strategy parameters (only used if strategy = ADAPTIVE)
    adaptiveMinPercent?: number; // Minimum percentage for large orders
    adaptiveMaxPercent?: number; // Maximum percentage for small orders
    adaptiveThreshold?: number; // Threshold in USD to trigger adaptation

    // Tiered multipliers (optional - applies to all strategies)
    // If set, multiplier is applied based on trader's order size
    tieredMultipliers?: MultiplierTier[];

    // Legacy single multiplier (for backward compatibility)
    // Ignored if tieredMultipliers is set
    tradeMultiplier?: number;

    // Safety limits
    maxOrderSizeUSD: number; // Maximum size for a single order
    minOrderSizeUSD: number; // Minimum size for a single order
    maxPositionSizeUSD?: number; // Maximum total size for a position (optional)
    maxDailyVolumeUSD?: number; // Maximum total volume per day (optional)
}

export interface OrderSizeCalculation {
    traderOrderSize: number; // Original trader's order size
    baseAmount: number; // Calculated amount before limits
    finalAmount: number; // Final amount after applying limits
    strategy: CopyStrategy; // Strategy used
    cappedByMax: boolean; // Whether capped by MAX_ORDER_SIZE
    reducedByBalance: boolean; // Whether reduced due to balance
    belowMinimum: boolean; // Whether below minimum threshold
    reasoning: string; // Human-readable explanation
}

/**
 * Calculate order size based on copy strategy
 */
export function calculateOrderSize(
    config: CopyStrategyConfig,
    traderOrderSize: number,
    availableBalance: number,
    currentPositionSize: number = 0
): OrderSizeCalculation {
    let baseAmount: number;
    let reasoning: string;

    // Step 1: Calculate base amount based on strategy
    switch (config.strategy) {
        case CopyStrategy.PERCENTAGE:
            baseAmount = traderOrderSize * (config.copySize / 100);
            reasoning = `${config.copySize}% of trader's $${traderOrderSize.toFixed(2)} = $${baseAmount.toFixed(2)}`;
            break;

        case CopyStrategy.FIXED:
            baseAmount = config.copySize;
            reasoning = `Fixed amount: $${baseAmount.toFixed(2)}`;
            break;

        case CopyStrategy.ADAPTIVE:
            const adaptivePercent = calculateAdaptivePercent(config, traderOrderSize);
            baseAmount = traderOrderSize * (adaptivePercent / 100);
            reasoning = `Adaptive ${adaptivePercent.toFixed(1)}% of trader's $${traderOrderSize.toFixed(2)} = $${baseAmount.toFixed(2)}`;
            break;

        default:
            throw new Error(`Unknown strategy: ${config.strategy}`);
    }

    // Step 1.5: Apply tiered or single multiplier based on trader's order size
    const multiplier = getTradeMultiplier(config, traderOrderSize);
    let finalAmount = baseAmount * multiplier;

    if (multiplier !== 1.0) {
        reasoning += ` → ${multiplier}x multiplier: $${baseAmount.toFixed(2)} → $${finalAmount.toFixed(2)}`;
    }
    let cappedByMax = false;
    let reducedByBalance = false;
    let belowMinimum = false;

    // Step 2: Apply maximum order size limit
    if (finalAmount > config.maxOrderSizeUSD) {
        finalAmount = config.maxOrderSizeUSD;
        cappedByMax = true;
        reasoning += ` → Capped at max $${config.maxOrderSizeUSD}`;
    }

    // Step 3: Apply maximum position size limit (if configured)
    if (config.maxPositionSizeUSD) {
        const newTotalPosition = currentPositionSize + finalAmount;
        if (newTotalPosition > config.maxPositionSizeUSD) {
            const allowedAmount = Math.max(0, config.maxPositionSizeUSD - currentPositionSize);
            if (allowedAmount < config.minOrderSizeUSD) {
                finalAmount = 0;
                reasoning += ` → Position limit reached`;
            } else {
                finalAmount = allowedAmount;
                reasoning += ` → Reduced to fit position limit`;
            }
        }
    }

    // Step 4: Check available balance (with 1% safety buffer)
    const maxAffordable = availableBalance * 0.99;
    if (finalAmount > maxAffordable) {
        finalAmount = maxAffordable;
        reducedByBalance = true;
        reasoning += ` → Reduced to fit balance ($${maxAffordable.toFixed(2)})`;
    }

    // Step 5: Check minimum order size
    if (finalAmount < config.minOrderSizeUSD) {
        belowMinimum = true;
        reasoning += ` → Below minimum $${config.minOrderSizeUSD}`;
        finalAmount = 0; // Don't execute
    }

    return {
        traderOrderSize,
        baseAmount,
        finalAmount,
        strategy: config.strategy,
        cappedByMax,
        reducedByBalance,
        belowMinimum,
        reasoning,
    };
}

/**
 * Calculate adaptive percentage based on trader's order size
 *
 * Logic:
 * - Small orders (< threshold): Use higher percentage (up to maxPercent)
 * - Large orders (> threshold): Use lower percentage (down to minPercent)
 * - Medium orders: Linear interpolation between copySize and min/max
 */
function calculateAdaptivePercent(config: CopyStrategyConfig, traderOrderSize: number): number {
    const minPercent = config.adaptiveMinPercent ?? config.copySize;
    const maxPercent = config.adaptiveMaxPercent ?? config.copySize;
    const threshold = config.adaptiveThreshold ?? 500;

    if (traderOrderSize >= threshold) {
        // Large order: scale down to minPercent
        // At threshold = minPercent, at 10x threshold = minPercent
        const factor = Math.min(1, traderOrderSize / threshold - 1);
        return lerp(config.copySize, minPercent, factor);
    } else {
        // Small order: scale up to maxPercent
        // At $0 = maxPercent, at threshold = copySize
        const factor = traderOrderSize / threshold;
        return lerp(maxPercent, config.copySize, factor);
    }
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Validate copy strategy configuration
 */
export function validateCopyStrategyConfig(config: CopyStrategyConfig): string[] {
    const errors: string[] = [];

    // Validate copySize
    if (config.copySize <= 0) {
        errors.push('copySize must be positive');
    }

    if (config.strategy === CopyStrategy.PERCENTAGE && config.copySize > 100) {
        errors.push('copySize for PERCENTAGE strategy should be <= 100');
    }

    // Validate limits
    if (config.maxOrderSizeUSD <= 0) {
        errors.push('maxOrderSizeUSD must be positive');
    }

    if (config.minOrderSizeUSD <= 0) {
        errors.push('minOrderSizeUSD must be positive');
    }

    if (config.minOrderSizeUSD > config.maxOrderSizeUSD) {
        errors.push('minOrderSizeUSD cannot be greater than maxOrderSizeUSD');
    }

    // Validate adaptive parameters
    if (config.strategy === CopyStrategy.ADAPTIVE) {
        if (!config.adaptiveMinPercent || !config.adaptiveMaxPercent) {
            errors.push('ADAPTIVE strategy requires adaptiveMinPercent and adaptiveMaxPercent');
        }

        if (config.adaptiveMinPercent && config.adaptiveMaxPercent) {
            if (config.adaptiveMinPercent > config.adaptiveMaxPercent) {
                errors.push('adaptiveMinPercent cannot be greater than adaptiveMaxPercent');
            }
        }
    }

    return errors;
}

/**
 * Get recommended configuration for different balance sizes
 */
export function getRecommendedConfig(balanceUSD: number): CopyStrategyConfig {
    if (balanceUSD < 500) {
        // Small balance: Conservative
        return {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 5.0,
            maxOrderSizeUSD: 20.0,
            minOrderSizeUSD: 1.0,
            maxPositionSizeUSD: 50.0,
            maxDailyVolumeUSD: 100.0,
        };
    } else if (balanceUSD < 2000) {
        // Medium balance: Balanced
        return {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 10.0,
            maxOrderSizeUSD: 50.0,
            minOrderSizeUSD: 1.0,
            maxPositionSizeUSD: 200.0,
            maxDailyVolumeUSD: 500.0,
        };
    } else {
        // Large balance: Adaptive
        return {
            strategy: CopyStrategy.ADAPTIVE,
            copySize: 10.0,
            adaptiveMinPercent: 5.0,
            adaptiveMaxPercent: 15.0,
            adaptiveThreshold: 300.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
            maxPositionSizeUSD: 1000.0,
            maxDailyVolumeUSD: 2000.0,
        };
    }
}

/**
 * Parse tiered multipliers from environment string
 * Format: "1-10:2.0,10-100:1.0,100-500:0.2,500+:0.1"
 *
 * @param tiersStr - Comma-separated tier definitions
 * @returns Array of MultiplierTier objects, sorted by min value
 * @throws Error if format is invalid
 */
export function parseTieredMultipliers(tiersStr: string): MultiplierTier[] {
    if (!tiersStr || tiersStr.trim() === '') {
        return [];
    }

    const tiers: MultiplierTier[] = [];
    const tierDefs = tiersStr.split(',').map(t => t.trim()).filter(t => t);

    for (const tierDef of tierDefs) {
        // Format: "min-max:multiplier" or "min+:multiplier"
        const parts = tierDef.split(':');
        if (parts.length !== 2) {
            throw new Error(`Invalid tier format: "${tierDef}". Expected "min-max:multiplier" or "min+:multiplier"`);
        }

        const [range, multiplierStr] = parts;
        const multiplier = parseFloat(multiplierStr);

        if (isNaN(multiplier) || multiplier < 0) {
            throw new Error(`Invalid multiplier in tier "${tierDef}": ${multiplierStr}`);
        }

        // Parse range
        if (range.endsWith('+')) {
            // Infinite upper bound: "500+"
            const min = parseFloat(range.slice(0, -1));
            if (isNaN(min) || min < 0) {
                throw new Error(`Invalid minimum value in tier "${tierDef}": ${range}`);
            }
            tiers.push({ min, max: null, multiplier });
        } else if (range.includes('-')) {
            // Bounded range: "100-500"
            const parts = range.split('-');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                throw new Error(`Invalid range format in tier "${tierDef}": "${range}"`);
            }
            const minStr = parts[0];
            const maxStr = parts[1];
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);

            if (isNaN(min) || min < 0) {
                throw new Error(`Invalid minimum value in tier "${tierDef}": ${minStr}`);
            }
            if (isNaN(max) || max <= min) {
                throw new Error(`Invalid maximum value in tier "${tierDef}": ${maxStr} (must be > ${min})`);
            }

            tiers.push({ min, max, multiplier });
        } else {
            throw new Error(`Invalid range format in tier "${tierDef}". Use "min-max" or "min+"`);
        }
    }

    // Sort tiers by min value
    tiers.sort((a, b) => a.min - b.min);

    // Validate no overlaps and no gaps
    for (let i = 0; i < tiers.length - 1; i++) {
        const current = tiers[i];
        const next = tiers[i + 1];

        if (current.max === null) {
            throw new Error(`Tier with infinite upper bound must be last: ${current.min}+`);
        }

        if (current.max > next.min) {
            throw new Error(`Overlapping tiers: [${current.min}-${current.max}] and [${next.min}-${next.max || '∞'}]`);
        }
    }

    return tiers;
}

/**
 * Get the appropriate multiplier for a given trade size
 *
 * @param config - Copy strategy configuration
 * @param traderOrderSize - Trader's order size in USD
 * @returns Multiplier to apply (1.0 if no multiplier configured)
 */
export function getTradeMultiplier(config: CopyStrategyConfig, traderOrderSize: number): number {
    // Use tiered multipliers if configured
    if (config.tieredMultipliers && config.tieredMultipliers.length > 0) {
        for (const tier of config.tieredMultipliers) {
            if (traderOrderSize >= tier.min) {
                if (tier.max === null || traderOrderSize < tier.max) {
                    return tier.multiplier;
                }
            }
        }
        // If no tier matches, use the last tier's multiplier
        return config.tieredMultipliers[config.tieredMultipliers.length - 1].multiplier;
    }

    // Fall back to single multiplier if configured
    if (config.tradeMultiplier !== undefined) {
        return config.tradeMultiplier;
    }

    // Default: no multiplier
    return 1.0;
}
