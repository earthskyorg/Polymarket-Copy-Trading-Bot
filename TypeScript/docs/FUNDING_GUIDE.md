# 💰 Wallet Funding & Setup Guide

This guide will help you set up your wallet with the necessary funds and permissions to run the Polymarket Copy Trading Bot.

## Your Wallet Address

```
0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
```

## Prerequisites

Your trading wallet needs:

1. **USDC** (for trading on Polymarket)
2. **MATIC** (for gas fees on Polygon)
3. **Allowance** (permission for Polymarket to spend your USDC)

---

## Step 1: Get POL (formerly MATIC) for Gas Fees

You need POL to pay for transaction fees on Polygon network.

**Note:** MATIC was rebranded to POL in September 2024. Most exchanges still show it as "MATIC" or "POL (MATIC)" during the transition.

### Recommended Amount

- **Minimum:** ~$5 worth of POL (~10 POL at current prices)
- **Recommended:** $10-20 worth of POL

### How to Get POL

**Option A: Buy Directly on Exchange**

1. Buy POL/MATIC on Coinbase, Binance, or Kraken
    - Look for "POL" or "MATIC" (both names are used during transition)
2. Withdraw to your wallet address on **Polygon Network**
3. ⚠️ **Important:** Select "Polygon" or "Polygon PoS" network, NOT "Ethereum"!

**Option B: Bridge from Ethereum**

1. Visit [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge)
2. Connect your wallet
3. Bridge ETH or USDC to Polygon
4. Swap for POL on Polygon using [QuickSwap](https://quickswap.exchange)

---

## Step 2: Get USDC on Polygon

You need USDC (Polygon) for trading on Polymarket.

### Recommended Amount

- **Minimum:** $100 USDC (for testing)
- **Recommended:** $500-1000 USDC (for meaningful trading)

### How to Get USDC on Polygon

**Option A: Centralized Exchange (Easiest)**

1. Buy USDC on Coinbase, Binance, or Kraken
2. Withdraw to your wallet address on **Polygon Network**
3. ⚠️ **Important:** Select "Polygon" network to avoid high gas fees!

**Option B: Bridge from Ethereum**

1. Visit [Polygon Bridge](https://wallet.polygon.technology/polygon/bridge)
2. Connect your wallet
3. Bridge USDC from Ethereum to Polygon
4. Wait ~7-8 minutes for confirmation

**Option C: Buy Directly on Polygon**

- [Transak](https://global.transak.com/) - Buy USDC directly on Polygon
- [Ramp Network](https://ramp.network/) - Credit/Debit card purchases

### Important Notes

✅ **Network**: Must be **Polygon** (also called "Polygon PoS"), NOT Ethereum mainnet
✅ **Token**: USDC.e (bridged USDC) contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
✅ **Gas Token**: POL (formerly MATIC) - both names are used

⚠️ **Warning**: Sending USDC on the wrong network will result in loss of funds!

---

## Step 3: Set USDC Allowance for Polymarket ⚡ **CRITICAL STEP**

**This is why you're getting "not enough balance / allowance" errors!**

You must give Polymarket permission to spend your USDC. This is a one-time setup.

### Automatic Setup (Recommended)

Run the built-in script:

```bash
npm run check-allowance
```

or

```bash
yarn check-allowance
```

This script will:

1. ✅ Check your current USDC balance
2. ✅ Check your current allowance
3. ✅ Automatically set unlimited allowance if needed
4. ✅ Show you the transaction link to verify

### What the script does:

```
🔍 Checking USDC balance and allowance...

💵 USDC Decimals: 6
💰 Your USDC Balance: 249.89 USDC
✅ Current Allowance: 0 USDC
📍 Polymarket Exchange: 0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E

⚠️  Allowance is insufficient or zero!
📝 Setting unlimited allowance for Polymarket...

⏳ Transaction sent: 0xabc123...
⏳ Waiting for confirmation...

✅ Allowance set successfully!
✅ New Allowance: 115792089237316195423570985008687907853269984665640564039457 USDC
```

---

## Step 4: Verify Your Setup

Run the check script to verify everything is set up correctly:

```bash
npm run check-allowance
```

You should see:

```
✅ Your USDC Balance: 249.89 USDC
✅ Current Allowance: XXXXX USDC
✅ Allowance is already sufficient!
```

Check your wallet on [Polygonscan](https://polygonscan.com/address/0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C)

---

## Troubleshooting

### Error: "not enough balance / allowance"

**This is your current issue!**

**Cause:** Either no USDC or no allowance set

**Solution:**

1. Run `npm run check-allowance` to diagnose
2. If balance is 0: Fund your wallet with USDC (see Step 2)
3. If allowance is 0: The script will automatically set it
4. You need POL for the approval transaction (~$0.01)

### Error: "INSUFFICIENT_FUNDS" during allowance setup

**Cause:** Not enough POL for gas fees

**Solution:**

1. Get more POL (see Step 1)
2. Minimum ~0.01 POL needed for approval transaction

### Transaction Stuck or Pending

**Cause:** Network congestion or low gas price

**Solution:**

1. Wait 5-10 minutes
2. Check transaction on [Polygonscan](https://polygonscan.com)
3. If still pending after 30 minutes, speed up transaction in your wallet

---

## Recommended Wallet Balance

For smooth operation of the bot:

| Asset    | Minimum      | Recommended   | Purpose         |
| -------- | ------------ | ------------- | --------------- |
| **USDC** | $100         | $500-1000     | Trading capital |
| **POL**  | 10 POL (~$5) | 50 POL (~$25) | Gas fees        |

**Note:** With `TRADE_MULTIPLIER = 2.0`, your effective buying power is 2x your balance!

---

## Quick Reference

**Your Wallet:** `0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C`

**Network:** Polygon (Chain ID: 137)

**USDC Contract:** `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

**Polymarket Exchange:** `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E`

**Block Explorer:** [Polygonscan](https://polygonscan.com/address/0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C)

---

## Next Steps

Once your wallet is funded and allowance is set:

1. ✅ Run `npm run check-allowance` to verify
2. ✅ Start the bot with `npm run dev`
3. ✅ Monitor the logs for successful trades
4. ✅ Check your positions on [Polymarket](https://polymarket.com)

**Ready to trade!** 🚀
