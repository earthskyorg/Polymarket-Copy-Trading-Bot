# Profitability Simulation Guide

This guide explains how to use the profitability simulation tool to backtest copy trading a specific trader.

## What Does It Do?

The simulation script:

1. Fetches all historical trades from a trader
2. Simulates copying each trade with your capital percentage method
3. Calculates what your P&L would have been
4. Shows detailed position breakdown
5. Displays ROI and statistics

## Usage

### Basic Simulation

Run the simulation with default settings ($1000 starting capital, current `TRADE_MULTIPLIER` from `.env`):

```bash
npm run simulate
```

### Configuration

The simulation uses these parameters:

```typescript
// In src/scripts/simulateProfitability.ts:

const TRADER_ADDRESS = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b';
const STARTING_CAPITAL = 1000; // Starting with $1000
const MULTIPLIER = ENV.TRADE_MULTIPLIER; // From your .env file
```

To test different scenarios, modify these values in the script:

```typescript
// Test with $500 starting capital
const STARTING_CAPITAL = 500;

// Test with 3x multiplier
const MULTIPLIER = 3.0;

// Test different trader
const TRADER_ADDRESS = '0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292';
```

## Output Explanation

### Example Output

```
═══════════════════════════════════════════════════════════════════════════════
  📊 COPY TRADING SIMULATION REPORT
═══════════════════════════════════════════════════════════════════════════════

Trader: 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
Multiplier: 2.0x

Capital:
  Starting: $1000.00
  Current:  $1247.35

Performance:
  Total P&L:     +$247.35
  ROI:           +24.74%
  Unrealized:    +$47.35

Trades:
  Total trades:  156
  Copied:        98
  Skipped:       58 (below $1.00 minimum)

Open Positions:
  Count: 12

  1. Will Trump meet with Mohammed bin Salman in October?
     Outcome: Yes | Invested: $45.20 | Value: $52.30 | P&L: +$7.10

  2. Will Bitcoin hit $100k by year end?
     Outcome: No | Invested: $33.50 | Value: $28.20 | P&L: -$5.30

  ... and 10 more positions
```

### Key Metrics

**Capital:**

- `Starting`: Your initial capital
- `Current`: Your capital now (USDC + position values)

**Performance:**

- `Total P&L`: Overall profit/loss
- `ROI`: Return on investment percentage
- `Unrealized`: Profit/loss from open positions

**Trades:**

- `Total trades`: All trades the trader made
- `Copied`: Trades you would have copied
- `Skipped`: Trades below minimum or insufficient capital

## How It Works

### 1. Fetching Data

```typescript
// Gets all historical trades from Polymarket API
const trades = await fetchTraderActivity();
// Returns: [{timestamp, market, side, price, usdcSize, ...}]
```

### 2. Capital Percentage Simulation

For each trade:

```typescript
// Calculate trader's capital at that time
const traderCapital = calculateHistoricalCapital(timestamp);

// What % of capital is trader spending?
const traderPercent = trade.usdcSize / traderCapital;

// Your order size
const baseOrder = yourCapital * traderPercent;
const orderSize = baseOrder * MULTIPLIER;

// Check minimum and available capital
if (orderSize >= MIN_ORDER_SIZE && orderSize <= yourCapital) {
    // Execute simulated trade
    yourCapital -= orderSize;
    positions.push({...});
}
```

### 3. Position Tracking

```typescript
// For BUY trades
position.invested += orderSize;
position.shares += orderSize / price;

// For SELL trades
position.value -= sellAmount;
position.pnl = currentValue - invested;
```

### 4. Current Value Calculation

```typescript
// Fetch trader's current positions
const currentPositions = await fetchTraderPositions();

// Match your positions to trader's
// Calculate current value based on current market prices
yourPosition.currentValue = shares * currentPrice;
yourPosition.pnl = currentValue - invested;
```

## Testing Different Scenarios

### Scenario 1: Conservative (Low Multiplier)

```typescript
const STARTING_CAPITAL = 1000;
const MULTIPLIER = 0.5; // Half the trader's position sizes
```

**Good for:**

- Risk-averse traders
- Testing the waters
- Smaller capital

### Scenario 2: Aggressive (High Multiplier)

```typescript
const STARTING_CAPITAL = 1000;
const MULTIPLIER = 3.0; // 3x the trader's position sizes
```

**Good for:**

- Confident in trader's strategy
- Higher risk tolerance
- Trying to outperform

### Scenario 3: Different Capital

```typescript
const STARTING_CAPITAL = 5000; // Start with $5k
const MULTIPLIER = 1.0;
```

**Shows:**

- How performance scales with capital
- Whether you can copy more trades
- Impact of minimum order size

## Limitations

### Current Limitations

1. **Historical Capital Estimation**:

    - Trader's capital at each timestamp is estimated
    - Real capital fluctuates with market prices
    - Approximation may differ from reality

2. **Simplified Execution**:

    - Assumes instant fills at trader's price
    - No slippage modeling
    - No gas fees included

3. **Position Values**:

    - Current positions valued at latest market price
    - Doesn't account for liquidity issues
    - May differ from actual execution prices

4. **Closed Positions**:
    - Realized P&L not fully tracked yet
    - Focus on current open positions

### Future Improvements

- [ ] More accurate historical capital tracking
- [ ] Slippage simulation
- [ ] Gas fee inclusion
- [ ] Liquidity modeling
- [ ] Win rate statistics
- [ ] Average hold time
- [ ] Best/worst positions analysis

## Interpreting Results

### Good Signs ✅

- **Positive ROI**: Trader is profitable
- **High copied rate**: Most trades were large enough to copy
- **Consistent gains**: Multiple profitable positions
- **Reasonable drawdown**: Not too many losing positions

### Warning Signs ⚠️

- **High skip rate**: Many trades too small (consider lower multiplier or more capital)
- **Negative ROI**: Trader is losing money
- **Few copied trades**: Not enough data or trades too small
- **Large unrealized losses**: Open positions underwater

### Next Steps

1. **Run simulation** with your actual capital amount
2. **Test different multipliers** (0.5x, 1.0x, 2.0x, 3.0x)
3. **Compare traders** by changing `TRADER_ADDRESS`
4. **Check timeframes** - recent performance vs historical
5. **Decide** if you want to copy this trader

## Example Workflow

```bash
# 1. Test conservative approach
# Edit script: MULTIPLIER = 0.5
npm run simulate

# 2. Test aggressive approach
# Edit script: MULTIPLIER = 2.0
npm run simulate

# 3. Test with your actual capital
# Edit script: STARTING_CAPITAL = 500
npm run simulate

# 4. Compare different traders
# Edit script: TRADER_ADDRESS = '0x...'
npm run simulate
```

## Tips

1. **Start conservative**: Test with 1.0x multiplier first
2. **Check skip rate**: If too high, you need more capital or lower multiplier
3. **Look at open positions**: Are they mostly green or red?
4. **Consider timeframe**: Recent performance may differ from historical
5. **Multiple traders**: Simulate several traders to find the best one

## Support

If you encounter issues:

- Check trader address is correct (must be active Polymarket trader)
- Ensure internet connection (fetches from Polymarket API)
- Look at error messages for API rate limiting
- Try again in a few minutes if API is slow

Happy simulating! 🎮📊
