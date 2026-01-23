import type { CopyStrategyConfig } from '../copyStrategy';
import {
    calculateOrderSize,
    CopyStrategy,
    getTradeMultiplier,
    parseTieredMultipliers,
    validateCopyStrategyConfig
} from '../copyStrategy';

describe('calculateOrderSize', () => {
    const baseConfig: CopyStrategyConfig = {
        strategy: CopyStrategy.PERCENTAGE,
        copySize: 10.0,
        maxOrderSizeUSD: 100.0,
        minOrderSizeUSD: 1.0,
    };

    describe('PERCENTAGE strategy', () => {
        it('should calculate correct percentage of trader order', () => {
            const result = calculateOrderSize(baseConfig, 100, 1000, 0);
            expect(result.finalAmount).toBe(10);
            expect(result.strategy).toBe(CopyStrategy.PERCENTAGE);
            expect(result.belowMinimum).toBe(false);
        });

        it('should cap at maxOrderSizeUSD', () => {
            const result = calculateOrderSize(baseConfig, 2000, 10000, 0);
            expect(result.finalAmount).toBe(100); // Capped at max
            expect(result.cappedByMax).toBe(true);
        });

        it('should return 0 if below minimum', () => {
            const result = calculateOrderSize(baseConfig, 5, 1000, 0);
            expect(result.finalAmount).toBe(0);
            expect(result.belowMinimum).toBe(true);
        });

        it('should reduce to fit available balance', () => {
            const result = calculateOrderSize(baseConfig, 100, 5, 0);
            expect(result.finalAmount).toBeLessThanOrEqual(5 * 0.99);
            expect(result.reducedByBalance).toBe(true);
        });
    });

    describe('FIXED strategy', () => {
        const fixedConfig: CopyStrategyConfig = {
            strategy: CopyStrategy.FIXED,
            copySize: 50.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
        };

        it('should use fixed amount', () => {
            const result = calculateOrderSize(fixedConfig, 1000, 10000, 0);
            expect(result.finalAmount).toBe(50);
            expect(result.strategy).toBe(CopyStrategy.FIXED);
        });

        it('should cap at maxOrderSizeUSD', () => {
            const fixedConfigLarge: CopyStrategyConfig = {
                ...fixedConfig,
                copySize: 200.0,
            };
            const result = calculateOrderSize(fixedConfigLarge, 1000, 10000, 0);
            expect(result.finalAmount).toBe(100);
            expect(result.cappedByMax).toBe(true);
        });
    });

    describe('Position limits', () => {
        it('should respect maxPositionSizeUSD', () => {
            const configWithLimit: CopyStrategyConfig = {
                ...baseConfig,
                maxPositionSizeUSD: 50.0,
            };
            const result = calculateOrderSize(configWithLimit, 100, 1000, 40);
            expect(result.finalAmount).toBe(10); // 40 + 10 = 50, within limit
        });

        it('should reduce order if it would exceed maxPositionSizeUSD', () => {
            const configWithLimit: CopyStrategyConfig = {
                ...baseConfig,
                maxPositionSizeUSD: 50.0,
            };
            const result = calculateOrderSize(configWithLimit, 100, 1000, 45);
            expect(result.finalAmount).toBeLessThanOrEqual(5);
        });
    });
});

describe('validateCopyStrategyConfig', () => {
    it('should validate correct config', () => {
        const config: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 10.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
        };
        const errors = validateCopyStrategyConfig(config);
        expect(errors).toHaveLength(0);
    });

    it('should detect invalid copySize', () => {
        const config: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: -5.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
        };
        const errors = validateCopyStrategyConfig(config);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect copySize > 100 for PERCENTAGE', () => {
        const config: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 150.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
        };
        const errors = validateCopyStrategyConfig(config);
        expect(errors.some((e) => e.includes('copySize'))).toBe(true);
    });

    it('should detect minOrderSizeUSD > maxOrderSizeUSD', () => {
        const config: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 10.0,
            maxOrderSizeUSD: 10.0,
            minOrderSizeUSD: 20.0,
        };
        const errors = validateCopyStrategyConfig(config);
        expect(errors.some((e) => e.includes('minOrderSizeUSD'))).toBe(true);
    });
});

describe('parseTieredMultipliers', () => {
    it('should parse valid tiered multipliers', () => {
        const input = '1-10:2.0,10-100:1.0,100-500:0.2,500+:0.1';
        const tiers = parseTieredMultipliers(input);

        expect(tiers).toHaveLength(4);
        expect(tiers[0]).toEqual({ min: 1, max: 10, multiplier: 2.0 });
        expect(tiers[1]).toEqual({ min: 10, max: 100, multiplier: 1.0 });
        expect(tiers[2]).toEqual({ min: 100, max: 500, multiplier: 0.2 });
        expect(tiers[3]).toEqual({ min: 500, max: null, multiplier: 0.1 });
    });

    it('should handle infinite upper bound', () => {
        const input = '1000+:0.001';
        const tiers = parseTieredMultipliers(input);

        expect(tiers).toHaveLength(1);
        expect(tiers[0]).toEqual({ min: 1000, max: null, multiplier: 0.001 });
    });

    it('should return empty array for empty string', () => {
        const tiers = parseTieredMultipliers('');
        expect(tiers).toHaveLength(0);
    });

    it('should throw error for invalid format', () => {
        expect(() => parseTieredMultipliers('invalid')).toThrow('Invalid tier format');
        expect(() => parseTieredMultipliers('100:0.5')).toThrow('Invalid range format');
        expect(() => parseTieredMultipliers('100-50:0.5')).toThrow('Invalid maximum value');
    });

    it('should throw error for overlapping tiers', () => {
        const input = '1-100:2.0,50-200:1.0';
        expect(() => parseTieredMultipliers(input)).toThrow('Overlapping tiers');
    });

    it('should throw error for infinite tier not at end', () => {
        const input = '1-100:2.0,100+:1.0,200-300:0.5';
        expect(() => parseTieredMultipliers(input)).toThrow('infinite upper bound must be last');
    });

    it('should throw error for invalid multiplier', () => {
        expect(() => parseTieredMultipliers('100-200:abc')).toThrow('Invalid multiplier');
        expect(() => parseTieredMultipliers('100-200:-1')).toThrow('Invalid multiplier');
    });
});

describe('getTradeMultiplier', () => {
    const tieredConfig: CopyStrategyConfig = {
        strategy: CopyStrategy.PERCENTAGE,
        copySize: 10.0,
        maxOrderSizeUSD: 1000.0,
        minOrderSizeUSD: 1.0,
        tieredMultipliers: [
            { min: 1, max: 10, multiplier: 2.0 },
            { min: 10, max: 100, multiplier: 1.0 },
            { min: 100, max: 500, multiplier: 0.2 },
            { min: 500, max: 1000, multiplier: 0.1 },
            { min: 1000, max: 5000, multiplier: 0.02 },
            { min: 5000, max: null, multiplier: 0.001 }
        ]
    };

    it('should return correct multiplier for small trades', () => {
        expect(getTradeMultiplier(tieredConfig, 5)).toBe(2.0);
        expect(getTradeMultiplier(tieredConfig, 9.99)).toBe(2.0);
    });

    it('should return correct multiplier for medium trades', () => {
        expect(getTradeMultiplier(tieredConfig, 10)).toBe(1.0);
        expect(getTradeMultiplier(tieredConfig, 50)).toBe(1.0);
        expect(getTradeMultiplier(tieredConfig, 100)).toBe(0.2);
        expect(getTradeMultiplier(tieredConfig, 250)).toBe(0.2);
    });

    it('should return correct multiplier for large trades', () => {
        expect(getTradeMultiplier(tieredConfig, 500)).toBe(0.1);
        expect(getTradeMultiplier(tieredConfig, 1000)).toBe(0.02);
        expect(getTradeMultiplier(tieredConfig, 5000)).toBe(0.001);
        expect(getTradeMultiplier(tieredConfig, 100000)).toBe(0.001);
    });

    it('should return 1.0 if no tiered multipliers configured', () => {
        const noTierConfig: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 10.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
        };
        expect(getTradeMultiplier(noTierConfig, 100)).toBe(1.0);
    });

    it('should use single multiplier if configured', () => {
        const singleMultiplierConfig: CopyStrategyConfig = {
            strategy: CopyStrategy.PERCENTAGE,
            copySize: 10.0,
            maxOrderSizeUSD: 100.0,
            minOrderSizeUSD: 1.0,
            tradeMultiplier: 2.5
        };
        expect(getTradeMultiplier(singleMultiplierConfig, 100)).toBe(2.5);
    });

    it('should prefer tiered multipliers over single multiplier', () => {
        const bothConfig: CopyStrategyConfig = {
            ...tieredConfig,
            tradeMultiplier: 5.0 // Should be ignored
        };
        expect(getTradeMultiplier(bothConfig, 5)).toBe(2.0); // Uses tiered
    });
});

describe('calculateOrderSize with tiered multipliers', () => {
    const tieredConfig: CopyStrategyConfig = {
        strategy: CopyStrategy.PERCENTAGE,
        copySize: 10.0, // 10%
        maxOrderSizeUSD: 1000.0,
        minOrderSizeUSD: 1.0,
        tieredMultipliers: [
            { min: 1, max: 10, multiplier: 2.0 },
            { min: 10, max: 100, multiplier: 1.0 },
            { min: 100, max: 1000, multiplier: 0.2 },
            { min: 1000, max: null, multiplier: 0.01 }
        ]
    };

    it('should apply 2.0x multiplier for small trades ($1-$10)', () => {
        // $5 trade × 10% = $0.50 × 2.0x = $1.00
        const result = calculateOrderSize(tieredConfig, 5, 1000, 0);
        expect(result.baseAmount).toBe(0.5);
        expect(result.finalAmount).toBe(1.0);
    });

    it('should apply 1.0x multiplier for medium trades ($10-$100)', () => {
        // $50 trade × 10% = $5.00 × 1.0x = $5.00
        const result = calculateOrderSize(tieredConfig, 50, 1000, 0);
        expect(result.finalAmount).toBe(5.0);
    });

    it('should apply 0.2x multiplier for large trades ($100-$1000)', () => {
        // $500 trade × 10% = $50.00 × 0.2x = $10.00
        const result = calculateOrderSize(tieredConfig, 500, 1000, 0);
        expect(result.finalAmount).toBe(10.0);
    });

    it('should apply 0.01x multiplier for very large trades ($1000+)', () => {
        // $250,000 trade × 10% = $25,000 × 0.01x = $250
        const result = calculateOrderSize(tieredConfig, 250000, 10000, 0);
        expect(result.finalAmount).toBe(250.0);
    });

    it('should include multiplier in reasoning', () => {
        const result = calculateOrderSize(tieredConfig, 5, 1000, 0);
        expect(result.reasoning).toContain('2x multiplier');
    });

    it('should work with FIXED strategy', () => {
        const fixedTieredConfig: CopyStrategyConfig = {
            strategy: CopyStrategy.FIXED,
            copySize: 50.0, // Fixed $50
            maxOrderSizeUSD: 1000.0,
            minOrderSizeUSD: 1.0,
            tieredMultipliers: [
                { min: 1, max: 1000, multiplier: 2.0 },
                { min: 1000, max: null, multiplier: 0.1 }
            ]
        };

        // Small trader order ($100) → fixed $50 × 2.0x = $100
        const smallResult = calculateOrderSize(fixedTieredConfig, 100, 1000, 0);
        expect(smallResult.finalAmount).toBe(100.0);

        // Large trader order ($10,000) → fixed $50 × 0.1x = $5
        const largeResult = calculateOrderSize(fixedTieredConfig, 10000, 1000, 0);
        expect(largeResult.finalAmount).toBe(5.0);
    });
});

