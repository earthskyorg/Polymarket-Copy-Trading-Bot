# Simulation Quick Start

Quick guide to running simulations for backtesting copy trading strategies.

## 🚀 Quick Start (3 Steps)

### 1. Run a Simulation

```bash
# Interactive mode (easiest)
npm run sim

# Or quick test
npm run sim quick
```

### 2. Wait for Completion

The simulation will show:

- Loading historical trades
- Simulating each trade
- Final report with ROI and P&L

### 3. Compare Results

```bash
npm run compare
```

## 📊 Available Commands

### Simulations

```bash
# Interactive parameter selection
npm run sim

# Quick test (7 days, 2 multipliers)
npm run sim quick

# Standard test (30 days, 3 multipliers) ⭐
npm run sim standard

# Full test (90 days, 4 multipliers)
npm run sim full

# Custom simulation
npm run sim custom <trader_address> [days] [multiplier]
```

### Analyzing Results

```bash
# Show all results + top/worst + statistics
npm run compare

# Top 10 best configurations
npm run compare best 10

# 5 worst
npm run compare worst 5

# Statistics only
npm run compare stats

# Detailed information about a specific simulation
npm run compare detail <name_part>
```

## 💡 Usage Examples

### Example 1: Quick Trader Check

```bash
# Run quick test
npm run sim custom 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b 7 1.0

# If result is good - full test
npm run sim custom 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b 30 1.0

# Compare
npm run compare
```

### Example 2: Testing Different Multipliers

```bash
# Test with different levels of aggressiveness
npm run sim custom 0x7c3d... 30 0.5   # Conservative
npm run sim custom 0x7c3d... 30 1.0   # Standard
npm run sim custom 0x7c3d... 30 2.0   # Aggressive

# View results
npm run compare
```

### Example 3: Comparing Multiple Traders

```bash
# Run standard test
npm run sim

# In interactive menu:
# - Select "Standard"
# - Specify multiple addresses separated by commas

# Compare
npm run compare
```

## 📈 Interpreting Results

### What the Metrics Mean

| Metric            | Description                    | Good Result   |
| ----------------- | ------------------------------ | ------------- |
| **ROI**           | Return on investment (%)       | > 15%         |
| **Total P&L**     | Total profit/loss ($)          | Positive      |
| **Copied/Total**  | Percentage of copied trades    | > 70%         |
| **Unrealized P&L** | Profit from open positions   | Positive      |

### Good Signs ✅

- ROI above 15%
- Most trades copied (> 70%)
- Positive Unrealized P&L
- Stable profit across different periods

### Warning Signs ⚠️

- Negative ROI
- Many skipped trades (> 50%)
- Large negative Unrealized P&L
- Instability between periods

## 🎯 Recommended Workflow

### Step 1: Initial Screening

```bash
# Quick test of several traders
npm run sim quick
npm run compare best 3
```

### Step 2: Deep Analysis

```bash
# For best traders - standard test
npm run sim standard
npm run compare
```

### Step 3: Optimize Multiplier

```bash
# For top trader - test different multipliers
npm run sim custom <best_trader> 30 0.5
npm run sim custom <best_trader> 30 1.0
npm run sim custom <best_trader> 30 2.0
npm run compare
```

### Step 4: Final Check

```bash
# Full test with optimal multiplier
npm run sim custom <best_trader> 90 <best_multiplier>
npm run compare detail <result_name>
```

## ⚙️ Configuration

### Environment Variables

Create/update `.env`:

```bash
# For main bot
USER_ADDRESSES = '0xTrader1, 0xTrader2'
TRADE_MULTIPLIER = 1.5

# For simulations (optional)
SIM_TRADER_ADDRESS = '0x...'
SIM_HISTORY_DAYS = 30
SIM_MIN_ORDER_USD = 1.0
SIM_MAX_TRADES = 2000
```

### Caching

Historical data is cached in `trader_data_cache/`:

- Automatic update once per day
- Instant execution of repeated simulations
- Saves API requests

Clear cache:

```bash
rm -rf trader_data_cache/
```

## 📁 File Structure

```
polymarket-copy-trading-bot-v1/
├── simulation_results/          # Simulation results (JSON)
│   ├── new_logic_0x7c3d..._30d_std_m1p0_2025-10-22.json
│   └── ...
├── trader_data_cache/           # Historical data cache
│   ├── 0x7c3d..._30d_2025-10-22.json
│   └── ...
├── src/scripts/
│   ├── simulateProfitability.ts    # Main simulation script
│   ├── runSimulations.ts           # Runner for batch simulations
│   └── compareResults.ts           # Comparison tool
└── docs/
    ├── SIMULATION_RUNNER_GUIDE.md  # Complete guide
    └── SIMULATION_GUIDE.md         # How simulation works
```

## 🔍 Troubleshooting

### "No simulation results found"

Run a simulation first:

```bash
npm run sim quick
```

### "Failed to fetch trades"

Issues:

- Check internet connection
- Make sure trader address is correct
- Wait 1-2 minutes (API rate limit)

### Too Many Skipped Trades

Solutions:

1. Increase starting capital in `simulateProfitability.ts`
2. Use a smaller multiplier (0.5x)
3. Choose another trader with larger positions

### Simulation Runs Slowly

Speed up:

```bash
# Use quick preset
npm run sim quick

# Or limit trades
SIM_MAX_TRADES=500 npm run simulate
```

## 📚 Additional Documentation

- **[Complete Simulation Guide](./docs/SIMULATION_RUNNER_GUIDE.md)**
- **[How Simulation Works](./docs/SIMULATION_GUIDE.md)**
- **[Multi-Trader Guide](./docs/MULTI_TRADER_GUIDE.md)**
- **[Quick Start Guide](./docs/QUICK_START.md)**

## 💬 Help

For help:

```bash
npm run sim help
npm run compare help
```

---

**Important:** Past results do not guarantee future returns. Always start with small capital in real trading.

Happy simulating! 🚀📊
