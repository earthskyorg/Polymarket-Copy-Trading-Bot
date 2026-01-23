# 🚀 Quick Start Guide

Get your Polymarket copy trading bot running in **5 minutes**. This guide walks you through the essential setup steps to start copying trades from top performers.

## What You'll Need

Before starting, ensure you have:

- ✅ **Node.js v18+** - [Download here](https://nodejs.org/)
- ✅ **MongoDB Database** - [Free tier on MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
- ✅ **Polygon Wallet** - MetaMask or any Web3 wallet
- ✅ **USDC on Polygon** - For executing trades
- ✅ **MATIC** - Small amount for gas fees (~$5-10 worth)

**Don't have USDC?** Bridge from Ethereum using [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge/deposit) or buy directly on an exchange that supports Polygon withdrawals.

---

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd polymarket-copy-trading-bot-v1

# Install packages
npm install
```

### Step 2: Configure Environment

```bash
# Copy the example config
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Traders to copy (find addresses on Polymarket leaderboard)
USER_ADDRESSES = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'

# Your trading wallet (the wallet that will execute trades)
PROXY_WALLET = 'your_polygon_wallet_address'
PRIVATE_KEY = 'your_private_key_without_0x_prefix'

# MongoDB (get free database at mongodb.com/cloud/atlas)
MONGO_URI = 'mongodb+srv://username:password@cluster.mongodb.net/database'

# Polygon RPC (get free key at infura.io or alchemy.com)
RPC_URL = 'https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID'

# Don't change these
CLOB_HTTP_URL = 'https://clob.polymarket.com/'
CLOB_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws'
USDC_CONTRACT_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
```

### Step 3: Build and Run

```bash
# Compile TypeScript
npm run build

# Start the bot
npm start
```

---

## Expected Output

When the bot starts successfully, you should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 POLYMARKET COPY TRADING BOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Tracking 1 trader(s):
   1. 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b

💼 Your Wallet:
   0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C

✓ MongoDB connected
ℹ Initializing CLOB client...
✓ CLOB client ready
──────────────────────────────────────────────────────────────────────
[2:35:54 PM] ⏳ Waiting for trades from 1 trader(s)...
```

The sandglass icon (⏳⌛) will animate while waiting for trades.

---

## Finding Traders to Copy

### Method 1: Polymarket Leaderboard

1. Visit [Polymarket Leaderboard](https://polymarket.com/leaderboard)
2. Sort by "Profit" or "Volume"
3. Click on a trader to view their profile
4. Copy their wallet address from the URL
5. Add to `USER_ADDRESSES` in `.env`

### Method 2: Predictfolio

1. Visit [Predictfolio](https://predictfolio.com)
2. Browse top performers
3. Check detailed stats (win rate, P&L, trade history)
4. Copy wallet address
5. Add to `USER_ADDRESSES`

### What to Look For

✅ **Good Trader Characteristics:**

- Positive total P&L (green numbers)
- Win rate above 55%
- Consistent trading activity (not just one lucky bet)
- Position sizes you can afford to copy proportionally
- Recent activity (traded in last 7 days)

❌ **Red Flags:**

- One massive winning bet with no other activity
- Win rate below 50%
- Position sizes too large for your capital
- Inactive for weeks/months

---

## How Trading Works

When a trader you're following makes a trade, the bot:

### 1. Detects the Trade

Checks every second for new positions

### 2. Calculates Your Position Size

```
ratio = your_balance / (trader_balance + trade_size)
your_trade_size = trader_trade_size × ratio
```

**Example:**

- Trader has $10,000, buys $1,000 worth (10% of capital)
- You have $1,000
- Ratio: `1,000 / (10,000 + 1,000) = 0.091` (9.1%)
- You buy: `$1,000 × 0.091 = $91` (9.1% of your capital)

### 3. Checks Price Slippage

- Compares current market price to trader's execution price
- Skips trade if difference is > $0.05 (to avoid bad fills)

### 4. Executes Order

- Places market order at best available price
- Uses Fill-or-Kill (FOK) order type
- Retries up to 3 times if initial order fails

### 5. Logs Result

```
──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Side:   BUY
Amount: $1,000
Price:  0.68
──────────────────────────────────────────────────────────────────────

Balances:
  Your balance:   $1000.00
  Trader balance: $10000.00

ℹ Executing BUY strategy...
ℹ Position ratio: 9.1%
ℹ Best ask: 100 @ $0.685
✓ Order executed: Bought 133 tokens at $0.685
──────────────────────────────────────────────────────────────────────
```

---

## Safety Tips

⚠️ **IMPORTANT:** This bot trades with real money. Follow these guidelines:

### 1. Start Small

- Begin with $100-500 to test the bot
- Verify it's copying trades correctly
- Scale up gradually once confident

### 2. Use a Dedicated Wallet

- Don't use your main wallet
- Create a fresh wallet just for the bot
- Only keep trading capital there

### 3. Monitor Daily

- Check logs at least once per day
- Verify trades are executing as expected
- Watch for any errors or failed orders

### 4. Diversify

- Don't copy just one trader
- Track 3-5 different strategies
- Example: `USER_ADDRESSES = 'trader1, trader2, trader3'`

### 5. Know Your Limits

- Bot has no built-in stop-loss
- Can potentially lose all funds if traders lose
- Only invest what you can afford to lose

---

## Troubleshooting

### Bot Won't Start

**Error: "USER_ADDRESSES is not defined"**

- Check your `.env` file exists
- Verify `USER_ADDRESSES` is spelled correctly
- Ensure no extra spaces around the `=` sign

**Error: "MongoDB connection failed"**

- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist (allow `0.0.0.0/0` for testing)
- Ensure database user has read/write permissions

### No Trades Detected

1. **Verify trader is active**

    - Check their Polymarket profile
    - Confirm they've traded recently

2. **Check logs for errors**

    - Look for API connection issues
    - Verify MongoDB is storing data

3. **Increase verbosity**
    - Bot only shows trades when they happen
    - Silence is normal when traders aren't trading

### Trades Failing

**"Insufficient balance"**

- Ensure `PROXY_WALLET` has USDC
- Verify you have MATIC for gas

**"Price slippage too high"**

- Market moved too fast
- Consider increasing tolerance in code
- Or increase `FETCH_INTERVAL` to 2-3 seconds

**"No bids/asks available"**

- Market may have low liquidity
- Try trading more popular markets
- Check Polymarket directly to verify

### Performance Issues

**Bot using too much CPU**

- Increase `FETCH_INTERVAL` from 1 to 2-3 seconds
- Reduce number of traders tracked

**Trades executing too slowly**

- Decrease `FETCH_INTERVAL` to 0.5 seconds (risky)
- Use faster RPC endpoint (Alchemy vs Infura)
- Ensure stable internet connection

---

## Next Steps

Once your bot is running successfully:

1. **First 24 Hours**

    - Monitor continuously
    - Verify each trade execution
    - Check position sizing is correct

2. **Week 1**

    - Review profitability
    - Compare your P&L to trader's P&L
    - Adjust if trades are too large/small

3. **Ongoing**
    - Check logs daily
    - Research new traders to copy
    - Consider adding protective features

---

## Advanced Configuration

### Track Multiple Traders

```bash
# Comma-separated
USER_ADDRESSES = 'trader1, trader2, trader3'

# Or JSON array
USER_ADDRESSES = '["trader1", "trader2", "trader3"]'
```

### Adjust Check Frequency

```bash
# Check every 2 seconds (less CPU usage)
FETCH_INTERVAL = 2

# Check every 0.5 seconds (faster execution)
FETCH_INTERVAL = 0.5
```

### Custom Retry Logic

```bash
# Retry failed orders up to 5 times
RETRY_LIMIT = 5
```

---

## Additional Resources

- **[Main README](./README.md)** - Complete documentation
- **[Multi-Trader Guide](./MULTI_TRADER_GUIDE.md)** - Advanced multi-trader setup
- **[Logging Preview](./LOGGING_PREVIEW.md)** - Console output examples

---

## Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the [main README](./README.md)
3. Open a GitHub issue with:
    - Error message (remove private keys!)
    - Steps to reproduce
    - Your environment (Node version, OS)

---

**Ready to trade smarter?** Start the bot and let it mirror the best! 🚀

**Disclaimer:** Trading involves risk. Past performance doesn't guarantee future results. Only invest what you can afford to lose.
