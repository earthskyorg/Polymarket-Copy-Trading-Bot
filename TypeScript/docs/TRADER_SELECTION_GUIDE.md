# Trader Selection Guide

This guide explains how to find and select the best low-risk, high-performance traders for copy trading.

## Overview

Selecting the right traders to copy is crucial for success. This guide covers:

1. **Risk Metrics** - Understanding MDD, Sharpe Ratio, and other risk indicators
2. **Performance Metrics** - ROI, win rate, profit factor
3. **Selection Criteria** - How to filter traders
4. **Using the Analysis Tool** - Step-by-step guide

## Risk Metrics Explained

### Maximum Drawdown (MDD)

**What it is:** The largest peak-to-trough decline in equity during a trading period.

**Why it matters:** Shows the worst-case scenario - how much you could lose from a peak.

**Good values:**

- Excellent: < 10%
- Good: 10-20%
- Acceptable: 20-30%
- Risky: > 30%

**Example:**

- Starting capital: $1,000
- Peak equity: $1,200
- Lowest point: $1,000
- MDD = (1,200 - 1,000) / 1,200 = 16.7%

### Sharpe Ratio

**What it is:** Risk-adjusted return metric. Measures excess return per unit of risk.

**Formula:** (Return - RiskFreeRate) / StandardDeviation

**Why it matters:** A high ROI means nothing if it comes with extreme volatility. Sharpe Ratio balances both.

**Good values:**

- Excellent: > 2.0
- Good: 1.5 - 2.0
- Acceptable: 1.0 - 1.5
- Poor: < 1.0

**Example:**

- Trader A: 20% ROI, Sharpe 0.8 (high risk)
- Trader B: 15% ROI, Sharpe 2.5 (low risk)
- **Choose Trader B** - better risk-adjusted return

### Calmar Ratio

**What it is:** ROI divided by Maximum Drawdown.

**Why it matters:** Shows return efficiency relative to worst-case loss.

**Good values:**

- Excellent: > 3.0
- Good: 2.0 - 3.0
- Acceptable: 1.0 - 2.0

### Volatility

**What it is:** Standard deviation of daily returns.

**Why it matters:** Lower volatility = more consistent, predictable returns.

**Good values:**

- Excellent: < 2% daily
- Good: 2-4% daily
- Risky: > 4% daily

## Performance Metrics

### ROI (Return on Investment)

**What it is:** Total return percentage over the period.

**Good values:**

- Excellent: > 30%
- Good: 15-30%
- Acceptable: 5-15%

### Win Rate

**What it is:** Percentage of profitable trades.

**Good values:**

- Excellent: > 65%
- Good: 55-65%
- Acceptable: 50-55%

### Profit Factor

**What it is:** Gross profit / Gross loss

**Good values:**

- Excellent: > 2.0
- Good: 1.5 - 2.0
- Acceptable: 1.0 - 1.5

## Using the Low-Risk Trader Finder

### Basic Usage

```bash
npm run find-low-risk 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b 0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292
```

### Configuration

Set environment variables to customize thresholds:

```bash
# Minimum ROI (default: 10%)
MIN_ROI_THRESHOLD=15.0

# Minimum Sharpe Ratio (default: 1.5)
MIN_SHARPE_THRESHOLD=2.0

# Maximum Drawdown (default: 20%)
MAX_MDD_THRESHOLD=15.0

# Minimum trades required (default: 50)
MIN_TRADER_TRADES=100

# Minimum trading days (default: 30)
MIN_TRADING_DAYS=60

# History period in days (default: 90)
SIM_HISTORY_DAYS=90
```

### Example: Finding Conservative Traders

```bash
MIN_ROI_THRESHOLD=10.0 \
MIN_SHARPE_THRESHOLD=2.0 \
MAX_MDD_THRESHOLD=10.0 \
npm run find-low-risk 0xaddress1 0xaddress2
```

This finds traders with:

- At least 10% ROI
- Sharpe Ratio >= 2.0 (excellent risk-adjusted returns)
- Maximum Drawdown <= 10% (very low risk)

### Example: Finding Balanced Traders

```bash
MIN_ROI_THRESHOLD=15.0 \
MIN_SHARPE_THRESHOLD=1.5 \
MAX_MDD_THRESHOLD=20.0 \
npm run find-low-risk 0xaddress1 0xaddress2
```

## Selection Criteria

### Recommended Filters

**For Conservative Investors:**

- ROI >= 10%
- Sharpe Ratio >= 2.0
- MDD <= 10%
- Win Rate >= 60%
- Trading Days >= 60

**For Balanced Investors:**

- ROI >= 15%
- Sharpe Ratio >= 1.5
- MDD <= 20%
- Win Rate >= 55%
- Trading Days >= 30

**For Aggressive Investors:**

- ROI >= 20%
- Sharpe Ratio >= 1.0
- MDD <= 30%
- Win Rate >= 50%
- Trading Days >= 30

### Red Flags to Avoid

❌ **High ROI but low Sharpe Ratio** - Too risky
❌ **High MDD (> 30%)** - Could lose too much
❌ **Low win rate (< 50%)** - More losses than wins
❌ **Short trading history (< 30 days)** - Not enough data
❌ **High volatility (> 5%)** - Unpredictable
❌ **Negative Calmar Ratio** - Poor risk efficiency

## Interpreting Results

### Risk Score

The tool calculates a **Risk Score (0-100, lower is better)** based on:

- Maximum Drawdown (40% weight)
- Sharpe Ratio (30% weight)
- Volatility (20% weight)
- Win Rate (10% weight)

**Interpretation:**

- 0-30: Excellent (low risk)
- 30-50: Good
- 50-70: Average
- 70-100: High risk

### Status Categories

- **excellent**: Meets all strict criteria
- **good**: Meets relaxed criteria
- **average**: Meets minimum criteria
- **poor**: Below minimum but not losing
- **bad**: Losing money or insufficient data

## Best Practices

### 1. Diversify

Don't copy just one trader. Select 3-5 traders with different:

- Strategies
- Market focuses
- Risk profiles

### 2. Regular Review

Re-evaluate traders monthly:

- Check if metrics are still good
- Remove underperformers
- Add new promising traders

### 3. Start Small

When adding a new trader:

- Start with small allocation
- Monitor for 1-2 weeks
- Scale up if performance is good

### 4. Monitor Drawdowns

Watch for:

- Increasing MDD
- Decreasing Sharpe Ratio
- Declining win rate

### 5. Check Activity

Ensure traders are:

- Still actively trading
- Not changing strategy drastically
- Maintaining performance

## Example Workflow

1. **Find Candidates:**

    ```bash
    # Get list from Polymarket leaderboard
    # Or use known good traders
    ```

2. **Analyze:**

    ```bash
    npm run find-low-risk 0xaddr1 0xaddr2 0xaddr3
    ```

3. **Review Results:**

    - Check risk scores
    - Verify metrics meet your criteria
    - Review trading history

4. **Add to Bot:**

    ```bash
    # Update .env
    USER_ADDRESSES='0xaddr1, 0xaddr2, 0xaddr3'
    ```

5. **Monitor:**
    - Check bot logs daily
    - Review performance weekly
    - Re-analyze monthly

## Advanced: Custom Analysis

For more control, modify the script or create your own:

```typescript
// Custom filter example
const customFilter = (trader: TraderAnalysis) => {
    return (
        trader.roi >= 20 &&
        trader.sharpeRatio >= 2.0 &&
        trader.maxDrawdown <= 15 &&
        trader.winRate >= 60 &&
        trader.tradingDays >= 60 &&
        trader.riskScore < 25
    );
};
```

## Resources

- [Polymarket Leaderboard](https://polymarket.com/leaderboard)
- [Predictfolio](https://predictfolio.com) - Detailed trader analytics
- [Sharpe Ratio Explained](https://www.investopedia.com/terms/s/sharperatio.asp)
- [Maximum Drawdown Explained](https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp)

## Troubleshooting

**No traders found matching criteria:**

- Relax thresholds (lower MIN_SHARPE_THRESHOLD, increase MAX_MDD_THRESHOLD)
- Check if traders have enough trading history
- Verify trader addresses are correct

**Analysis takes too long:**

- Reduce SIM_HISTORY_DAYS
- Analyze fewer traders at once
- Check API rate limits

**Results seem inaccurate:**

- Increase MIN_TRADER_TRADES for more data
- Increase MIN_TRADING_DAYS for longer history
- Verify current position prices are accurate
