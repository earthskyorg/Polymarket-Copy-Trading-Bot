# 🎨 Logging Preview

## Beautiful Logging System

The bot features a clean, colorful logging system with masked sensitive information. Here's what you'll see:

---

### 🚀 Startup Screen

```
  ____       _        ____
 |  _ \ ___ | |_   _ / ___|___  _ __  _   _
 | |_) / _ \| | | | | |   / _ \| '_ \| | | |
 |  __/ (_) | | |_| | |__| (_) | |_) | |_| |
 |_|   \___/|_|\__, |\____\___/| .__/ \__, |
               |___/            |_|    |___/
               Copy the best, automate success

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Tracking Traders:
   1. 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
   2. 0x6bab41a0dc40d6dd4c1a915b8c01969479fd1292
   3. 0xd218e474776403a330142299f7796e8ba32eb5c9

💼 Your Wallet:
   0x4fbB**********************************DE8C

✓ MongoDB connected
ℹ Initializing CLOB client...
✓ CLOB client ready
──────────────────────────────────────────────────────────────────────
📦 Database Status:
   0x7c3d...6b: 0 trades
   0x6bab...92: 0 trades
   0xd218...c9: 0 trades

✓ Monitoring 3 trader(s) every 1s
──────────────────────────────────────────────────────────────────────
ℹ Starting trade monitor...
ℹ Starting trade executor...
✓ Trade executor ready for 3 trader(s)
[2:35:54 PM] ⏳ Waiting for trades from 3 trader(s)...
[2:35:55 PM] ⌛ Waiting for trades from 3 trader(s)...
[2:35:56 PM] ⏳ Waiting for trades from 3 trader(s)...
```

**Note:** Your wallet address is automatically masked for security! Shows only first 6 and last 4 characters.

---

### 📊 When a Trade is Detected

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚡ 1 NEW TRADE TO COPY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Action: BUY
Asset:  104411...55198
Side:   BUY
Amount: $150
Price:  0.68
──────────────────────────────────────────────────────────────────────

Balances:
  Your balance:   $1000.00
  Trader balance: $15000.00 (0x7c3d...6b)

ℹ Executing BUY strategy...
ℹ Position ratio: 9.1%
ℹ Best ask: 100 @ $0.685
✓ Order executed: Bought 21.8 tokens at $0.685
──────────────────────────────────────────────────────────────────────
```

---

### 💚 Success Messages

```
✓ Order executed: Bought 133 tokens at $0.685
✓ MongoDB connected
✓ CLOB client ready
✓ Trade executor ready for 3 trader(s)
```

---

### ⚠️ Warning Messages

```
⚠ Order failed (attempt 1/3)
⚠ Price slippage too high - skipping trade
⚠ No bids available in order book
⚠ No position to sell
```

---

### ❌ Error Messages

```
✗ MongoDB connection failed
✗ Unknown condition: invalid_strategy
```

---

### 🔄 Animated Waiting State

```
[2:35:54 PM] ⏳ Waiting for trades from 3 trader(s)...
[2:35:55 PM] ⌛ Waiting for trades from 3 trader(s)...
[2:35:56 PM] ⏳ Waiting for trades from 3 trader(s)...
[2:35:57 PM] ⌛ Waiting for trades from 3 trader(s)...
```

The hourglass icon (⏳⌛) animates smoothly, updating 3 times per second. The timestamp updates every second.

---

## Security Features

### 🔐 Wallet Address Masking

Your personal wallet address is automatically masked in all logs:

**Before:**

```
💼 Your Wallet:
   0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
```

**After:**

```
💼 Your Wallet:
   0x4fbB**********************************DE8C
```

This prevents accidental exposure of your wallet in:

- Screenshots
- Screen recordings
- Shared logs
- Debug outputs

**Trader addresses remain visible** so you can verify who you're copying.

---

## Color Scheme

### Logo Colors

The **PolyCopy** ASCII logo features a beautiful gradient:

- Top half: **Cyan** - Fresh, tech-forward feel
- Bottom half: **Magenta** - Energy and action
- Tagline: **Gray** - Subtle, professional

### Message Colors

- **Cyan** (🔵) - Headers, info messages, system status
- **Green** (🟢) - Success messages, your balance
- **Yellow** (🟡) - Amounts, trader counts, highlights
- **Blue** (🔹) - Trader balances, info icons
- **Red** (🔴) - Errors, SELL trades
- **Magenta** (🟣) - Trade alerts, new trade headers
- **Gray/Dim** (⚫) - Secondary info, timestamps, separators

---

## What Changed?

### Before (Old Logging):

```
Target User Wallet addresss is: 0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b
My Wallet addresss is: 0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
API Key derived { key: '...', secret: '...', passphrase: '...' }
ClobClient { ... }
Trade Monitor is running every 1 seconds
▰▰▱▱▱ Waiting for new transactions from 4 trader(s)
console.log('Trade to copy:', trade);
My balance: $1000 | 0x7c3db... balance: $15000
```

❌ Problems:

- Raw console.log outputs
- API keys visible
- Wallet fully exposed
- Ugly spinner
- No structure

### After (New Logging):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 POLYMARKET COPY TRADING BOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Tracking 3 trader(s)
💼 Your Wallet: 0x4fbB**********************************DE8C
✓ CLOB client ready

──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Side:   BUY
Amount: $150
──────────────────────────────────────────────────────────────────────

✓ Order executed: Bought 21.8 tokens at $0.685
```

✅ Improvements:

- Clean, structured output
- Wallet address masked
- No sensitive data exposure
- Beautiful animations
- Color-coded messages
- Professional appearance

---

## Benefits

1. **🔐 Security** - Wallet address masked, no API key exposure
2. **🎨 Clarity** - Color coding for instant message type recognition
3. **📦 Structure** - Organized boxes and separators
4. **🚀 Professional** - Clean output suitable for screenshots
5. **⚡ Real-time** - Smooth animations and live updates

---

## Examples by Scenario

### Successful Trade Copy

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚡ 1 NEW TRADE TO COPY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Side:   BUY
Amount: $500
Price:  0.72
──────────────────────────────────────────────────────────────────────

Balances:
  Your balance:   $2500.00
  Trader balance: $25000.00 (0x7c3d...6b)

ℹ Executing BUY strategy...
ℹ Position ratio: 9.1%
ℹ Best ask: 150 @ $0.725
✓ Order executed: Bought 62 tokens at $0.725
──────────────────────────────────────────────────────────────────────
```

### Failed Trade (Price Slippage)

```
──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Side:   BUY
Amount: $200
Price:  0.45
──────────────────────────────────────────────────────────────────────

ℹ Executing BUY strategy...
ℹ Best ask: 200 @ $0.52
⚠ Price slippage too high - skipping trade
──────────────────────────────────────────────────────────────────────
```

### Sell Trade

```
──────────────────────────────────────────────────────────────────────
📊 NEW TRADE DETECTED
Trader: 0x7c3d...6b
Side:   SELL
Amount: $300
Price:  0.88
──────────────────────────────────────────────────────────────────────

ℹ Executing SELL strategy...
ℹ Position ratio: 25.0%
ℹ Best bid: 50 @ $0.875
✓ Order executed: Sold 42 tokens at $0.875
──────────────────────────────────────────────────────────────────────
```

---

**Ready to see it in action?** Run `npm start` and watch the beautiful logs! 🚀
