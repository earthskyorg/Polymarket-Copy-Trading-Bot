# 🚀 Getting Started with Polymarket Copy Trading Bot

Welcome! This guide will help you set up your copy trading bot in **10 minutes or less**.

## What This Bot Does

Automatically copies trades from successful Polymarket traders to your wallet. Think of it as "follow the experts" for prediction markets.

When a trader you're following makes a bet, the bot:
1. Detects it within 1 second
2. Calculates your proportional position size
3. Places the same bet for you automatically
4. Tracks your performance

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Computer with Node.js v18+** ([Download here](https://nodejs.org))
- [ ] **Polygon wallet** (MetaMask or any Web3 wallet)
- [ ] **USDC on Polygon network** (your trading capital)
- [ ] **POL (MATIC)** (~$5-10 for gas fees)
- [ ] **MongoDB database** (free tier available)
- [ ] **RPC endpoint** (free from Infura/Alchemy)

**Don't have these yet?** No worries! See [Detailed Setup](#detailed-setup) below.

---

## Quick Setup (Recommended)

### Step 1: Install

```bash
# Clone the repository
git clone <repository-url>
cd polymarket-copytrading-bot

# Install dependencies
npm install
```

### Step 2: Configure (Interactive)

```bash
# Run the setup wizard - it will guide you through everything
npm run setup
```

The wizard will ask you simple questions and create your configuration file automatically.

### Step 3: Test

```bash
# Build the bot
npm run build

# Run health check to verify everything works
npm run health-check
```

### Step 4: Start Trading

```bash
# Start the bot
npm start
```

That's it! Your bot is now running and will copy trades automatically.

---

## Detailed Setup

### 1. Get a Polygon Wallet

**If you don't have one:**
1. Install [MetaMask](https://metamask.io)
2. Create a new wallet
3. **Important:** Create a DEDICATED wallet just for the bot (don't use your main wallet!)
4. Save your:
   - Wallet address (starts with 0x...)
   - Private key (Settings → Security & Privacy → Show Private Key)

### 2. Fund Your Wallet

You need two things in your Polygon wallet:

#### A) USDC (Trading Capital)

**Option 1: Bridge from Ethereum**
- Visit [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge/deposit)
- Connect wallet and bridge USDC to Polygon
- Takes ~10 minutes

**Option 2: Buy on Exchange**
- Buy USDC on Coinbase, Binance, Kraken, etc.
- Withdraw to your wallet **on Polygon network**
- Make sure to select "Polygon" not "Ethereum"!

#### B) POL/MATIC (Gas Fees)

- Get $5-10 worth from any exchange
- Withdraw to your wallet on Polygon network
- This pays for transaction fees

### 3. Get MongoDB Database (Free)

1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for free account
3. Click "Build a Database" → Choose **FREE** tier
4. Select a region close to you
5. Click "Create Cluster" (takes ~5 minutes)

**Configure Access:**
1. Click "Database Access" → Add New User
   - Username: `botuser` (or anything you want)
   - Password: Generate a strong password
   - User Privileges: "Read and write to any database"
   - Click "Add User"

2. Click "Network Access" → Add IP Address
   - Click "Allow Access from Anywhere"
   - IP: `0.0.0.0/0`
   - Click "Confirm"

**Get Connection String:**
1. Click "Database" → "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password
5. Replace `myFirstDatabase` with `polymarket`

Example: `mongodb+srv://botuser:MyPassword123@cluster0.abc123.mongodb.net/polymarket`

### 4. Get RPC Endpoint (Free)

**Option A: Infura (Recommended)**
1. Visit [Infura.io](https://infura.io)
2. Sign up for free account
3. Create new project
4. Select "Polygon PoS"
5. Copy the HTTPS endpoint

Example: `https://polygon-mainnet.infura.io/v3/abc123def456...`

**Option B: Alchemy**
1. Visit [Alchemy.com](https://www.alchemy.com)
2. Sign up and create app
3. Select "Polygon" network
4. Copy the HTTPS URL

### 5. Find Traders to Copy

Visit the [Polymarket Leaderboard](https://polymarket.com/leaderboard) and look for traders with:

✅ **Good characteristics:**
- Positive total profit (green numbers)
- Win rate above 55%
- Active trading (traded in last 7 days)
- Consistent history (not just one lucky bet)

❌ **Red flags to avoid:**
- Single big win with no other trades
- Win rate below 50%
- Inactive for weeks
- Massive position sizes you can't afford to copy

**How to get their address:**
1. Click on a trader's profile
2. Copy their wallet address from the URL
3. Example: `https://polymarket.com/profile/0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b`
4. The address is: `0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b`

**Pro tip:** Use [Predictfolio](https://predictfolio.com) to analyze traders in detail!

---

## Configuration Options

After running `npm run setup`, you'll have a `.env` file. Here are the key settings:

### Basic Settings

```bash
# Traders to copy (comma-separated)
USER_ADDRESSES='0xTrader1..., 0xTrader2...'

# Your wallet
PROXY_WALLET='0xYourWallet...'
PRIVATE_KEY='your_private_key_here'

# Database & RPC
MONGO_URI='mongodb+srv://...'
RPC_URL='https://polygon-mainnet.infura.io/...'
```

### Trading Strategy (Optional)

```bash
# How much to trade
COPY_STRATEGY='PERCENTAGE'  # Copy as % of trader's position
COPY_SIZE='10.0'            # Copy 10% of their position size
TRADE_MULTIPLIER='1.0'      # 1.0 = normal, 2.0 = 2x aggressive

# Risk limits
MAX_ORDER_SIZE_USD='100.0'  # Never trade more than $100 per order
MIN_ORDER_SIZE_USD='1.0'    # Polymarket minimum
```

### Advanced Options

```bash
# Trade aggregation (combine small trades)
TRADE_AGGREGATION_ENABLED='true'
TRADE_AGGREGATION_WINDOW_SECONDS='300'

# Bot behavior
FETCH_INTERVAL='1'    # Check for trades every 1 second
RETRY_LIMIT='3'       # Retry failed orders 3 times
```

---

## Verify Everything Works

Before starting the bot, run the health check:

```bash
npm run health-check
```

**Expected output if everything is good:**
```
🏥 HEALTH CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Status: ✅ Healthy
Database: ✅ Connected
RPC: ✅ RPC endpoint responding
Balance: ✅ Balance: $100.00
Polymarket API: ✅ API responding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 All Systems Operational!

You're ready to start trading:
   npm start
```

**If you see errors,** the health check will tell you exactly what's wrong and how to fix it!

---

## Starting the Bot

Once health check passes:

```bash
npm start
```

**What you'll see:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 POLYMARKET COPY TRADING BOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Tracking 1 trader(s):
   1. 0x7c3d...6b

💼 Your Wallet:
   0x4fbb...1DE8C

✓ MongoDB connected
✓ CLOB client ready
──────────────────────────────────────────────────────────────
⏳ Waiting for trades from 1 trader(s)...
```

The bot is now running! It will automatically execute trades when your tracked traders make moves.

---

## Safety Tips

### ⚠️ IMPORTANT - Read This First!

1. **Start Small**
   - Begin with $50-100 to test
   - Verify the bot works correctly
   - Scale up gradually

2. **Use Dedicated Wallet**
   - Create a fresh wallet ONLY for the bot
   - Never use your main wallet
   - Only keep trading capital there

3. **Diversify**
   - Copy 3-5 different traders
   - Don't put all eggs in one basket
   - Mix different trading styles

4. **Monitor Daily**
   - Check bot logs at least once per day
   - Verify trades are executing correctly
   - Watch for errors or issues

5. **Understand the Risks**
   - You can lose ALL your trading capital
   - Past performance ≠ future results
   - No built-in stop-loss
   - Only invest what you can afford to lose

### Emergency Stop

Press `Ctrl+C` to stop the bot immediately. It will gracefully shut down and close all connections.

---

## Useful Commands

```bash
# Setup and configuration
npm run setup           # Interactive setup wizard
npm run health-check    # Verify everything works

# Running the bot
npm run build          # Compile TypeScript
npm start              # Start the bot
npm run dev            # Run in development mode

# Monitoring and stats
npm run check-proxy    # Check your wallet balance
npm run check-stats    # View your trading statistics
npm run check-activity # See recent trading activity

# Utilities
npm run find-traders   # Find profitable traders to copy
npm run simulate       # Backtest strategies
```

---

## Troubleshooting

### Bot won't start

**Error: "USER_ADDRESSES is not defined"**
- Run `npm run setup` to create your .env file
- Or manually create .env with all required variables

**Error: "MongoDB connection failed"**
- Check MONGO_URI is correct
- Verify IP whitelist in MongoDB Atlas
- Test connection in MongoDB Compass

### No trades detected

- Check traders are active (visit their Polymarket profile)
- Verify USER_ADDRESSES are correct
- Look for errors in bot logs

### Trades failing

**"Insufficient balance"**
- Add USDC to your wallet
- Get POL for gas fees

**"Price slippage too high"**
- Market moved too fast
- Increase FETCH_INTERVAL from 1 to 2-3 seconds

---

## Next Steps

Once your bot is running successfully:

### First 24 Hours
- [ ] Monitor continuously
- [ ] Verify each trade execution
- [ ] Check position sizing is correct
- [ ] Ensure no errors in logs

### Week 1
- [ ] Review profitability daily
- [ ] Compare your P&L to trader's P&L
- [ ] Adjust TRADE_MULTIPLIER if needed
- [ ] Add/remove traders based on performance

### Ongoing
- [ ] Check logs daily
- [ ] Research new traders to copy
- [ ] Optimize your strategy
- [ ] Join community discussions

---

## Learn More

- **[README.md](./README.md)** - Complete documentation
- **[Quick Start Guide](./docs/QUICK_START.md)** - Alternative setup instructions
- **[Multi-Trader Guide](./docs/MULTI_TRADER_GUIDE.md)** - Advanced multi-trader strategies
- **[Docker Guide](./docs/DOCKER.md)** - Deploy with Docker
- **[Simulation Guide](./docs/SIMULATION_GUIDE.md)** - Backtest before going live

---

## Getting Help

**Have questions?**
1. Check this guide thoroughly
2. Read the [README.md](./README.md)
3. Run `npm run health-check` to diagnose issues
4. Open a GitHub issue with details (remove private keys!)

---

## Ready to Start?

```bash
# 1. Setup (one-time)
npm install
npm run setup

# 2. Test
npm run build
npm run health-check

# 3. Go live!
npm start
```

**Happy trading! 🚀**

---

**Disclaimer:** This software is for educational purposes. Trading involves risk of loss. The developers are not responsible for any financial losses. Only invest what you can afford to lose.

