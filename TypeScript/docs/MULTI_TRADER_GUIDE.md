# 📊 Multi-Trader Configuration Guide

## Overview

The bot now supports tracking multiple traders simultaneously. This allows you to diversify your copy trading strategy by following several successful traders at once.

## Configuration Options

### Option 1: Single Trader

```bash
USER_ADDRESSES = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'
```

### Option 2: Multiple Traders (Comma-Separated)

```bash
USER_ADDRESSES = '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b, 0xAnotherTrader123..., 0xYetAnotherTrader456...'
```

### Option 3: Multiple Traders (JSON Array)

```bash
USER_ADDRESSES = '["0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b", "0xAnotherTrader123...", "0xYetAnotherTrader456..."]'
```

## How It Works

### 1. **Independent Monitoring**

Each trader is monitored separately. The bot creates separate database collections for each trader's activity.

### 2. **Unified Execution**

All trades from all traders are executed through your single wallet (`PROXY_WALLET`).

### 3. **Proportional Position Sizing**

For each trader, the bot calculates position sizes proportionally:

```
Your position = (Your balance / Trader's balance) × Trader's position
```

## Example Setup

### Scenario: Following 3 Top Traders

```bash
USER_ADDRESSES = '
  0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b,
  0xAbC123TopTraderWithHighWinRate456...,
  0xDeF789AnotherSuccessfulTrader012...
'

PROXY_WALLET = '0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C'
PRIVATE_KEY = 'your_private_key_without_0x'
```

## Bot Output Example

When starting the bot:

```
🤖 Polymarket Copy Trading Bot Starting...

📊 Tracking 3 trader(s):
   1. 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
   2. 0xabc123toptraderwith...
   3. 0xdef789anothersuccessful...

💼 Your trading wallet: 0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When a trade is detected:

```
💥 Found 2 new transaction(s) to copy 💥

📊 Trade to copy from 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b:
   Asset: 104411547841791877252227935410049230769909951522603517050502627610163580155198
   Side: BUY
   Amount: $150
   Price: 0.68

My balance: $1000 | 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b balance: $15000
```

## Finding Traders to Copy

### 1. Polymarket Leaderboard

Visit: https://polymarket.com/leaderboard

- Look for traders with consistent profits
- Check their trade history
- Note their wallet address

### 2. Profile Pages

Visit: https://polymarket.com/profile/[ADDRESS]

- View detailed trade history
- Check win rate
- Analyze position sizes

### 3. Key Metrics to Consider

- ✅ Total P&L (positive)
- ✅ Win rate (>55%)
- ✅ Number of trades (>100 for consistency)
- ✅ Recent activity (active in last 30 days)
- ❌ Avoid traders with very large positions (you may not have enough capital to copy)

## Risk Management Tips

### 1. **Diversify Across Traders**

Don't put all your faith in one trader. Track 3-5 different traders with different strategies.

### 2. **Start Small**

Begin with a small balance in `PROXY_WALLET` to test the bot's behavior.

### 3. **Monitor Regularly**

Check the bot's logs daily to ensure it's copying trades correctly.

### 4. **Set Aside Capital**

Ensure `PROXY_WALLET` has:

- Sufficient USDC for trading
- Some MATIC for gas fees (~$5-10 worth)

## Database Structure

Each trader gets their own collections:

```
MongoDB Collections:
- user_activities_0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
- user_positions_0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
- user_activities_0xabc123...
- user_positions_0xabc123...
...
```

## Troubleshooting

### Issue: Bot not detecting trades

**Solution**:

1. Verify trader addresses are correct
2. Check that traders are actively trading
3. Ensure MongoDB connection is working

### Issue: Trades failing

**Solution**:

1. Check `PROXY_WALLET` has sufficient USDC balance
2. Ensure you have MATIC for gas fees
3. Review price slippage settings (currently 0.05)

### Issue: Too many traders slowing down bot

**Solution**:

- Limit to 5-7 traders maximum
- Increase `FETCH_INTERVAL` to 2-3 seconds

## Security Reminders

- ⚠️ **Never share your `.env` file**
- ⚠️ **Use a dedicated wallet for the bot**
- ⚠️ **Don't store all your funds in `PROXY_WALLET`**
- ⚠️ **Monitor bot activity regularly**
- ⚠️ **Change MongoDB credentials if they were exposed in README**

## Support

For questions or issues:

- GitHub Issues: [Create an issue](https://github.com/earthskyorg/polymarket-copy-trading-bot/issues)
- Telegram: https://t.me/opensea712
