import { UserPositionInterface } from '../interfaces/User';
import fetchData from './fetchData';
import getMyBalance from './getMyBalance';
import { ENV } from '../config/env';

const PROXY_WALLET = ENV.PROXY_WALLET;

/**
 * Position statistics for a trader
 */
export interface PositionStats {
    totalValue: number;
    initialValue: number;
    weightedPnl: number;
    overallPnl: number;
}

/**
 * Calculate position statistics from an array of positions
 *
 * @param positions - Array of positions to analyze
 * @returns Calculated position statistics
 */
export const calculatePositionStats = (positions: UserPositionInterface[]): PositionStats => {
    let totalValue = 0;
    let initialValue = 0;
    let weightedPnl = 0;

    positions.forEach((pos) => {
        const value = pos.currentValue ?? 0;
        const initial = pos.initialValue ?? 0;
        const pnl = pos.percentPnl ?? 0;

        totalValue += value;
        initialValue += initial;
        weightedPnl += value * pnl;
    });

    const overallPnl = totalValue > 0 ? weightedPnl / totalValue : 0;

    return {
        totalValue,
        initialValue,
        weightedPnl,
        overallPnl,
    };
};

/**
 * Fetch positions and balance for a user
 *
 * @param userAddress - Address of the user to fetch data for
 * @returns Object containing positions and calculated balance
 */
export const fetchUserPositionsAndBalance = async (
    userAddress: string
): Promise<{
    positions: UserPositionInterface[];
    balance: number;
}> => {
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${userAddress}`;
    const positions = (await fetchData(positionsUrl)) as UserPositionInterface[];

    const positionsArray = Array.isArray(positions) ? positions : [];

    // Calculate balance from positions (current value)
    const balance = positionsArray.reduce((total, pos) => {
        return total + (pos.currentValue ?? 0);
    }, 0);

    return {
        positions: positionsArray,
        balance,
    };
};

/**
 * Fetch my (proxy wallet) positions and USDC balance
 *
 * @returns Object containing my positions and USDC balance
 */
export const fetchMyPositionsAndBalance = async (): Promise<{
    positions: UserPositionInterface[];
    usdcBalance: number;
    totalBalance: number;
}> => {
    const positionsUrl = `https://data-api.polymarket.com/positions?user=${PROXY_WALLET}`;
    const positions = (await fetchData(positionsUrl)) as UserPositionInterface[];

    const positionsArray = Array.isArray(positions) ? positions : [];

    // Get USDC balance
    const usdcBalance = await getMyBalance(PROXY_WALLET);

    // Calculate total balance (USDC + positions value)
    const positionsValue = positionsArray.reduce((total, pos) => {
        return total + (pos.currentValue ?? 0);
    }, 0);

    const totalBalance = usdcBalance + positionsValue;

    return {
        positions: positionsArray,
        usdcBalance,
        totalBalance,
    };
};

/**
 * Find a position by condition ID
 *
 * @param positions - Array of positions to search
 * @param conditionId - Condition ID to find
 * @returns Found position or undefined
 */
export const findPositionByConditionId = (
    positions: UserPositionInterface[],
    conditionId: string
): UserPositionInterface | undefined => {
    return positions.find((position) => position.conditionId === conditionId);
};

