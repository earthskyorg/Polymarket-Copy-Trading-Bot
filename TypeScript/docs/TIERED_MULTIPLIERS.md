# Tiered Trade Multipliers Guide

## Overview

Tiered trade multipliers allow you to apply different multiplier values based on the trader's position size. This powerful feature solves a critical problem when copying traders with much larger accounts than yours.

## The Problem

When copying a trader with a $500k-$1M account using a $2k account, you face a dilemma:

- **High copy percentage (0.4%)**: Captures small trades, but a single large $500k trade would require $2,000 - your entire balance!
- **Low copy percentage (0.004%)**: Makes large trades manageable, but you miss every trade below $250 (which is most of them)

You can't win with a single fixed percentage.

## The Solution

Tiered multipliers apply different scaling factors based on the **trader's order size**:

```
Small trades ($1-$10)     → 2.0x multiplier  → Don't miss opportunities
Medium trades ($10-$100)  → 1.0x multiplier  → Standard copying
Large trades ($100-$1k)   → 0.2x multiplier  → Reduce exposure
Huge trades ($500k+)      → 0.0002x multiplier → Manageable portions
```

## Configuration

### Basic Syntax

Add to your `.env` file:

```bash
TIERED_MULTIPLIERS=min-max:multiplier,min-max:multiplier,min+:multiplier
```

**Format rules:**
- Use `min-max` for bounded ranges (e.g., `100-500:0.2`)
- Use `min+` for infinite upper bound (e.g., `500000+:0.0002`) - must be last tier
- Ranges are in USD based on the **trader's order size**
- Separate tiers with commas

### Example Configurations

#### For $2k Account Copying $500k-$1M Trader

```bash
TIERED_MULTIPLIERS=1-10:2.0,10-100:1.0,100-500:0.2,500-1000:0.1,1000-5000:0.02,5000-10000:0.01,10000-50000:0.002,50000-100000:0.001,100000-500000:0.0005,500000+:0.0002
```

**What this does:**
| Trader Order | Multiplier | Your Copy Trade |
|--------------|------------|-----------------|
| $5           | 2.0x       | $10             |
| $50          | 1.0x       | $50             |
| $500         | 0.1x       | $50             |
| $10,000      | 0.002x     | $20             |
| $250,000     | 0.0002x    | $50             |

#### For $1k Account (Simpler)

```bash
TIERED_MULTIPLIERS=1-100:2.0,100-1000:0.5,1000-10000:0.1,10000+:0.01
```

**What this does:**
| Trader Order | Multiplier | Your Copy Trade |
|--------------|------------|-----------------|
| $50          | 2.0x       | $100            |
| $500         | 0.5x       | $250            |
| $5,000       | 0.1x       | $500            |
| $50,000      | 0.01x      | $500            |

#### For $500 Account (Conservative)

```bash
TIERED_MULTIPLIERS=1-50:1.5,50-500:0.5,500-5000:0.1,5000+:0.01
```

## How It Works

### 1. **Integration with Copy Strategies**

Tiered multipliers work with **all copy strategies**:

```bash
# With PERCENTAGE strategy
COPY_STRATEGY=PERCENTAGE
COPY_SIZE=10.0  # 10% of trader's order
TIERED_MULTIPLIERS=1-100:2.0,100-1000:0.5,1000+:0.1

# $50 trader order:
# Step 1: 10% × $50 = $5 (base amount)
# Step 2: $5 × 2.0x (tier multiplier) = $10 (final amount)
```

```bash
# With FIXED strategy
COPY_STRATEGY=FIXED
COPY_SIZE=25.0  # Fixed $25 per trade
TIERED_MULTIPLIERS=1-1000:2.0,1000+:0.1

# $100 trader order:
# Step 1: Fixed $25 (base amount)
# Step 2: $25 × 2.0x (tier multiplier) = $50 (final amount)
```

### 2. **BUY and SELL Symmetry**

Tiered multipliers apply to both BUY and SELL orders:

**Example:**
- Trader buys $10,000 (tier: 0.01x)
- You buy: $10,000 × 10% × 0.01x = $10

Later:
- Trader sells 50% of their position ($5,000 worth)
- You sell: 50% of your position × 0.01x (same tier)

The multiplier is always based on the **trader's current order size**, ensuring consistent scaling.

### 3. **Safety Limits Still Apply**

Tiered multipliers don't bypass safety limits:

```bash
MAX_ORDER_SIZE_USD=100.0
MIN_ORDER_SIZE_USD=1.0
TIERED_MULTIPLIERS=1-100:5.0,100+:0.1
```

Even with 5.0x multiplier, orders are still:
- ✅ Capped at `MAX_ORDER_SIZE_USD` ($100)
- ✅ Capped by available balance
- ✅ Rejected if below `MIN_ORDER_SIZE_USD` ($1)

## Use Cases

### Use Case 1: Copy High-Volume Micro Traders

**Problem:** Trader makes 50+ small trades ($10-$50) daily. With 10% copy rate, most fall below Polymarket's $1 minimum.

**Solution:**
```bash
COPY_PERCENTAGE=10.0
TIERED_MULTIPLIERS=1-100:3.0,100-1000:1.0,1000+:0.5
```

Now $5 trades → $1.50 (10% × 3.0x) = above minimum ✅

### Use Case 2: Copy Whale with Occasional Huge Positions

**Problem:** Trader usually makes $100-$1k trades, but occasionally drops $100k+ on high-conviction bets.

**Solution:**
```bash
COPY_STRATEGY=PERCENTAGE
COPY_SIZE=10.0
TIERED_MULTIPLIERS=1-1000:1.0,1000-10000:0.5,10000-100000:0.1,100000+:0.01
```

- Regular trades: Normal 10% copying
- $100k trades: Only 0.1% effective rate (10% × 0.01x)

### Use Case 3: Aggressive on Small Bets, Conservative on Large

**Problem:** Want to maximize exposure to trader's small "test" bets, but limit exposure to big swings.

**Solution:**
```bash
COPY_STRATEGY=PERCENTAGE
COPY_SIZE=5.0  # Conservative base 5%
TIERED_MULTIPLIERS=1-50:4.0,50-500:2.0,500-5000:1.0,5000+:0.2
```

- $10 trades: 5% × 4.0x = 20% effective
- $10,000 trades: 5% × 0.2x = 1% effective

## Best Practices

### 1. **Design Your Tiers Based on Trader Behavior**

Analyze the trader's history:
```bash
# If trader makes:
# - 60% of trades: $10-$100
# - 30% of trades: $100-$1,000
# - 10% of trades: $1,000-$10,000

# Design tiers around these ranges:
TIERED_MULTIPLIERS=10-100:1.5,100-1000:1.0,1000-10000:0.3,10000+:0.1
```

### 2. **Start Conservative, Then Adjust**

Begin with narrow multiplier ranges:
```bash
# Initial (safe)
TIERED_MULTIPLIERS=1-1000:1.0,1000+:0.5

# After testing (more aggressive)
TIERED_MULTIPLIERS=1-100:2.0,100-1000:1.0,1000+:0.2
```

### 3. **Ensure No Gaps in Coverage**

❌ **Bad (gaps):**
```bash
TIERED_MULTIPLIERS=1-100:2.0,200-1000:1.0  # Gap: $100-$200 missing!
```

✅ **Good (continuous):**
```bash
TIERED_MULTIPLIERS=1-100:2.0,100-1000:1.0,1000+:0.5
```

### 4. **Combine with MAX_ORDER_SIZE_USD**

Use tiers for scaling, but set absolute caps:
```bash
TIERED_MULTIPLIERS=1-100:5.0,100-1000:2.0,1000+:0.5
MAX_ORDER_SIZE_USD=100.0  # Never risk more than $100 per trade
```

### 5. **Account for Your Balance**

If you have $2,000 balance and copy at 5% per trade:
```bash
# With 1.0x max multiplier, max risk = $100 per trade
TIERED_MULTIPLIERS=1-500:1.0,500-5000:0.2,5000+:0.05
MAX_ORDER_SIZE_USD=100.0
```

## Backward Compatibility

### Single TRADE_MULTIPLIER (Legacy)

Old configuration still works:
```bash
COPY_PERCENTAGE=10.0
TRADE_MULTIPLIER=2.0  # Simple 2x multiplier for all trades
```

### Priority Order

If both are set, tiered multipliers take precedence:
```bash
TRADE_MULTIPLIER=2.0  # ← Ignored
TIERED_MULTIPLIERS=1-100:5.0,100+:0.1  # ← Used
```

## Monitoring

### Log Messages

The bot shows which tier is applied:

```
ℹ 10% of trader's $5.00 = $0.50 → 2x multiplier: $0.50 → $1.00
✓ Order size: $1.00 (within limits)

ℹ 10% of trader's $250000.00 = $25000.00 → 0.0002x multiplier: $25000.00 → $50.00
✓ Order size: $50.00 (within limits)
```

### Startup Message

When bot starts with tiered multipliers:
```
✓ Loaded 10 tiered multipliers
```

## Troubleshooting

### "Overlapping tiers" Error

**Error:**
```
Failed to parse TIERED_MULTIPLIERS: Overlapping tiers: [100-500] and [400-1000]
```

**Fix:** Ensure tier ranges don't overlap:
```bash
# ❌ Bad
TIERED_MULTIPLIERS=100-500:1.0,400-1000:0.5

# ✅ Good
TIERED_MULTIPLIERS=100-500:1.0,500-1000:0.5
```

### "Invalid tier format" Error

**Error:**
```
Failed to parse TIERED_MULTIPLIERS: Invalid tier format: "100"
```

**Fix:** Each tier needs a range and multiplier:
```bash
# ❌ Bad
TIERED_MULTIPLIERS=100:1.0

# ✅ Good
TIERED_MULTIPLIERS=100-1000:1.0
# or
TIERED_MULTIPLIERS=100+:1.0
```

### "Infinite upper bound must be last" Error

**Error:**
```
Failed to parse TIERED_MULTIPLIERS: Tier with infinite upper bound must be last: 1000+
```

**Fix:** Put infinite tier (`+`) at the end:
```bash
# ❌ Bad
TIERED_MULTIPLIERS=1000+:0.1,100-1000:1.0

# ✅ Good
TIERED_MULTIPLIERS=100-1000:1.0,1000+:0.1
```

### Still Missing Small Trades

**Problem:** Even with high multiplier, small trades below $1 are skipped.

**Check:**
1. Verify `MIN_ORDER_SIZE_USD`:
   ```bash
   MIN_ORDER_SIZE_USD=1.0  # Polymarket minimum
   ```

2. Calculate effective copy amount:
   ```
   Trader order: $3
   Copy %: 10%
   Multiplier: 2.0x

   Final: $3 × 10% × 2.0x = $0.60 ← Below $1 minimum!
   ```

3. **Solution:** Increase multiplier or base copy percentage:
   ```bash
   # Increase tier multiplier
   TIERED_MULTIPLIERS=1-10:5.0,10-100:2.0,100+:1.0

   # Or increase base copy percentage
   COPY_SIZE=20.0  # Instead of 10.0
   ```

### Orders Capped at MAX_ORDER_SIZE

**Problem:** All large orders are capped at $100.

**Check `MAX_ORDER_SIZE_USD`:**
```bash
MAX_ORDER_SIZE_USD=100.0  # This is the cap

# If you want larger orders, increase it:
MAX_ORDER_SIZE_USD=500.0
```

## Complete Example Configuration

Here's a complete `.env` configuration for a $2,000 account copying a $800,000 trader:

```bash
# ============================================
# Copy Strategy
# ============================================
COPY_STRATEGY=PERCENTAGE
COPY_SIZE=10.0  # Base 10% of trader's orders

# ============================================
# Tiered Multipliers
# ============================================
# Designed for $800k trader → $2k account
TIERED_MULTIPLIERS=1-10:3.0,10-50:2.0,50-100:1.5,100-500:1.0,500-1000:0.5,1000-5000:0.1,5000-10000:0.05,10000-50000:0.01,50000-100000:0.005,100000+:0.001

# ============================================
# Safety Limits
# ============================================
MAX_ORDER_SIZE_USD=150.0     # Never more than $150 per trade (7.5% of balance)
MIN_ORDER_SIZE_USD=1.0       # Polymarket minimum
MAX_POSITION_SIZE_USD=500.0  # Never more than $500 in one market (25% of balance)
MAX_DAILY_VOLUME_USD=1000.0  # Never more than $1k per day (50% of balance)
```

**Expected behavior:**
| Trader Order | Calculation | Your Copy |
|--------------|-------------|-----------|
| $5 | $5 × 10% × 3.0x | $1.50 |
| $25 | $25 × 10% × 2.0x | $5.00 |
| $75 | $75 × 10% × 1.5x | $11.25 |
| $300 | $300 × 10% × 1.0x | $30.00 |
| $750 | $750 × 10% × 0.5x | $37.50 |
| $3,000 | $3,000 × 10% × 0.1x | $30.00 |
| $8,000 | $8,000 × 10% × 0.05x | $40.00 |
| $25,000 | $25,000 × 10% × 0.01x | $25.00 |
| $75,000 | $75,000 × 10% × 0.005x | $37.50 |
| $500,000 | $500,000 × 10% × 0.001x | $50.00 |

## Advanced: Calculating Your Tiers

### Step 1: Analyze Trader's Order Distribution

Check their trade history and group by size:
```
$1-$100: 45% of trades
$100-$1,000: 30% of trades
$1,000-$10,000: 20% of trades
$10,000+: 5% of trades
```

### Step 2: Determine Your Risk Tolerance

For a $2,000 account:
- Low risk: Max $20 per trade (1%)
- Medium risk: Max $50 per trade (2.5%)
- High risk: Max $100 per trade (5%)

### Step 3: Calculate Multipliers

Target: $30 average copy trade size

```
For $50 average trader order (45% of trades):
$50 × 10% × M = $30
M = 30 / 5 = 6.0x

For $500 average trader order (30% of trades):
$500 × 10% × M = $30
M = 30 / 50 = 0.6x

For $5,000 average trader order (20% of trades):
$5,000 × 10% × M = $30
M = 30 / 500 = 0.06x

For $50,000 average trader order (5% of trades):
$50,000 × 10% × M = $30
M = 30 / 5,000 = 0.006x
```

### Step 4: Apply and Tune

```bash
TIERED_MULTIPLIERS=1-100:6.0,100-1000:0.6,1000-10000:0.06,10000+:0.006
MAX_ORDER_SIZE_USD=50.0  # Safety cap
```

Monitor for a week and adjust based on:
- Are you missing profitable small trades? → Increase small-tier multipliers
- Are large trades too risky? → Decrease large-tier multipliers
- Hitting MAX_ORDER_SIZE too often? → Increase cap or decrease multipliers

## Summary

**Tiered multipliers solve the fundamental problem of copying large traders with small accounts.**

Key benefits:
- ✅ Don't miss small trades that fall below minimum order size
- ✅ Don't over-allocate to large trades that would drain your balance
- ✅ Automatically scale your copies proportionally to trader's behavior
- ✅ Maintain symmetry between BUY and SELL operations
- ✅ Work seamlessly with all copy strategies (PERCENTAGE, FIXED, ADAPTIVE)

Start with a simple 3-4 tier configuration and refine based on your results!
