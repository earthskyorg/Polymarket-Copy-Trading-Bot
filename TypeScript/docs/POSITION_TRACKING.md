# Position Tracking System

## Problem

When you top up your account after buying a position, when selling that position, the bot may sell the wrong number of tokens because the calculation is based on the current balance, not the actually purchased amount.

### Problem example:

1. You have balance $100, trader has $500
2. Trader buys $50 → you buy $10 (proportionally 20%)
3. **You top up balance to $500**
4. Trader sells 50% of position
5. **Old logic**: will sell 50% of current position (incorrect)
6. **New logic**: will sell 50% of actually purchased tokens (correct)

## Solution

The purchase tracking system remembers the actual number of purchased tokens and uses this information when selling.

### How it works:

#### 1. On purchase (BUY)

- Bot calculates proportional order size from current balance
- **After successful purchase** saves the actual number of purchased tokens in the `myBoughtSize` field
- This number is saved in MongoDB database for each transaction

#### 2. On sale (SELL)

- Bot loads all previous purchases for this asset/conditionId
- Sums all purchased tokens (`myBoughtSize`)
- Calculates the percentage the trader is selling
- **Applies this percentage to actually purchased tokens**, not to current position
- After sale, updates tracked purchases:
    - If sold ≥99% → clears tracking completely
    - If sold partially → proportionally decreases `myBoughtSize` for all purchases

## Code changes

### 1. Data model (`userHistory.ts`)

```typescript
myBoughtSize: { type: Number, required: false } // Tracks actual tokens we bought
```

### 2. Interface (`User.ts`)

```typescript
myBoughtSize?: number; // Tracks actual tokens we bought
```

### 3. Purchase logic (`postOrder.ts`)

- Tracks `totalBoughtTokens` during purchase
- Saves this value to database: `{ myBoughtSize: totalBoughtTokens }`
- Logs for debugging: `📝 Tracked purchase: X.XX tokens`

### 4. Sale logic (`postOrder.ts`)

- Loads previous purchases:
    ```typescript
    const previousBuys = await UserActivity.find({
        asset: trade.asset,
        conditionId: trade.conditionId,
        side: 'BUY',
        bot: true,
        myBoughtSize: { $exists: true, $gt: 0 },
    });
    ```
- Calculates from purchased tokens, not from current position
- Updates tracking after sale

## Advantages

1. ✅ **Correct proportions**: Sale is always proportional to actually purchased
2. ✅ **Independence from top-ups**: Can top up balance at any time
3. ✅ **Accuracy**: Tracking real tokens, not calculation from balance
4. ✅ **Transparency**: Visible in logs how many tokens are tracked
5. ✅ **Fallback**: If no tracked purchases, uses old logic

## Debug logs

### On purchase:

```
✅ Bought $10.00 at $0.52 (19.23 tokens)
📝 Tracked purchase: 19.23 tokens for future sell calculations
```

### On sale:

```
📊 Found 2 previous purchases: 35.45 tokens bought
Calculating from tracked purchases: 35.45 × 50.00% = 17.72 tokens
✅ Sold 17.72 tokens at $0.55
📝 Updated purchase tracking (sold 50.0% of tracked position)
```

### On full sale:

```
🧹 Cleared purchase tracking (sold 100.0% of position)
```

## Backward compatibility

- **Old positions** (without `myBoughtSize`): uses old logic (calculation from current position)
- **New positions**: uses new tracking logic
- Warning in logs: `⚠️ No tracked purchases found, using current position`

## Migration

No action required:

- Existing positions will continue working with old logic
- New purchases will automatically start being tracked
- Gradually all positions will transition to the new system

## Testing

To verify it works:

1. Buy a position with balance X
2. Top up balance to Y (Y > X)
3. Wait for trader to sell
4. Check logs - should see "📊 Found N previous purchases"
5. Verify that the correct number of tokens was sold

## FAQ

**Q: What if I manually sell part of a position?**
A: The system only tracks automatic bot trades. Manual sales are not counted.

**Q: What if trader closed the entire position?**
A: Bot will sell your entire current position (doesn't depend on tracking).

**Q: Can this feature be disabled?**
A: No need - the system automatically falls back to old logic if tracking is unavailable.
