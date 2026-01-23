# 🔧 How to access bot positions on Polymarket frontend

## 🎯 Problem

Your bot trades through address `0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C`, but when you go to polymarket.com through the browser, you see a **different address** and cannot manage positions.

## 🔍 Cause

Your bot uses an **EOA address directly**, while when you go to the browser, you connect with a **different wallet**. Polymarket links positions to a specific address, so you see different data.

---

## ✅ SOLUTION: Import bot's private key into MetaMask

### Step 1: Export private key from .env

1. Open the `.env` file in the project root
2. Find the line `PRIVATE_KEY=...`
3. Copy the private key value (without `0x` if present)

**⚠️ IMPORTANT**: This key gives full access to the wallet! Never share it.

---

### Step 2: Import key into MetaMask

#### Option A: Through MetaMask Extension

1. **Open MetaMask** in browser
2. **Click on account icon** (circle in top right corner)
3. **Select "Import Account"**
4. **Select type**: "Private Key"
5. **Paste your PRIVATE_KEY** from .env file
6. **Click "Import"**

#### Option B: Create new profile in MetaMask

If you want to keep the bot separate from your main wallet:

1. Open MetaMask
2. Click on profile icon
3. Select "Add account" or "Import Account"
4. Give the account a name (e.g., "Polymarket Bot")
5. Paste the private key

---

### Step 3: Switch network to Polygon

1. In MetaMask, click on network selection (at top)
2. Select **"Polygon Mainnet"**
3. If not in list, add:
    - Network Name: `Polygon Mainnet`
    - RPC URL: `https://polygon-rpc.com`
    - Chain ID: `137`
    - Currency Symbol: `MATIC`
    - Block Explorer: `https://polygonscan.com`

---

### Step 4: Connect to Polymarket

1. Open **https://polymarket.com**
2. Click **"Connect Wallet"**
3. Select **MetaMask**
4. **Make sure** the imported account is selected (`0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C`)
5. Confirm connection

---

### Step 5: Check access to positions

After connecting, you should see:

- ✅ All 20 positions that the bot opened
- ✅ Transaction history
- ✅ USDC balance (~$191 after recent sale)
- ✅ Ability to manage positions (buy/sell)

---

## 🔗 Alternative method: View via URL

If you don't want to import the key, you can view positions via direct link:

**📊 Your profile:**

```
https://polymarket.com/profile/0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
```

**🔍 Polygonscan (all transactions):**

```
https://polygonscan.com/address/0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
```

⚠️ **But**: Through URL you can only **view**, not **manage** positions. To manage, you need access to the private key.

---

## 🧪 Verify address in MetaMask

After import, make sure the address matches:

1. In MetaMask, click on account address (to copy)
2. Compare with `PROXY_WALLET` from `.env`:
    ```
    0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C
    ```
3. They should **completely match**

---

## 🔐 Security

### ✅ Good practices:

- Store private key in a safe place
- Use hardware wallet (Ledger/Trezor) for large amounts
- Create a separate wallet just for the bot
- Don't keep large amounts on bot wallet

### ⚠️ Never do:

- ❌ Don't share private key with anyone
- ❌ Don't enter key on suspicious sites
- ❌ Don't publish key in code/repositories
- ❌ Don't send key in messengers

---

## 📱 For mobile access

If you want to manage positions from phone:

1. Install **MetaMask Mobile** (iOS/Android)
2. Import private key into mobile app
3. Connect to Polymarket through built-in browser

---

## 🐛 Troubleshooting

### Problem: Address imported, but no positions

**Solution**:

1. Make sure **Polygon Mainnet** network is selected
2. Check that address exactly matches `PROXY_WALLET` from .env
3. Clear browser cache and re-login
4. Try opening direct profile link

### Problem: MetaMask doesn't show tokens

**Solution**:
Polymarket uses ERC1155 tokens, which MetaMask doesn't always display automatically. This is normal. Positions are visible on Polymarket website, not in MetaMask.

### Problem: Can't sell through frontend

**Solution**:

1. Make sure you have some MATIC for gas fees
2. Check that position is not locked (expired market)
3. Try through bot: `npm run manual-sell`

---

## 📊 Current state of your wallet

**Address**: `0x4fbBe5599c06e846D2742014c9eB04A8a3d1DE8C`

**Positions**: 20 open (after selling 5 large ones at 80%)

**Main positions** (remaining 20%):

- Iranian regime survive U.S. military strikes [Yes] - $18.72
- Maduro out in 2025 [Yes] - $13.24
- OpenAI IPO [No] - $13.67
- Nuggets vs Trail Blazers [Trail Blazers] - $11.82
- And others...

**USDC Balance**: ~$191 (after recent sales)

---

## 🤔 Why did this happen?

Polymarket uses a **proxy wallet system**:

1. **EOA (Externally Owned Account)** - your main wallet
2. **Proxy Wallet** - smart contract for trading

In your case:

- Bot uses **EOA directly** (without Gnosis Safe proxy)
- When you went to browser, you connected with a **different wallet**
- Therefore you saw different addresses and positions

**Solution**: Use the same private key everywhere.

---

## ✅ Final checklist

- [ ] Exported PRIVATE_KEY from .env
- [ ] Imported key into MetaMask
- [ ] Switched to Polygon Mainnet
- [ ] Connected to polymarket.com
- [ ] See all 20 bot positions
- [ ] Can manage positions through frontend
- [ ] Saved private key in a safe place

---

## 🆘 Need help?

If something doesn't work, run the diagnostic script:

```bash
npx ts-node src/scripts/findMyEOA.ts
```

It will show:

- ✅ Your EOA address
- ✅ Proxy wallet address
- ✅ Activity on both addresses
- ✅ Detailed instructions

---

**🎉 After completing these steps, you'll be able to fully manage bot positions through the Polymarket web interface!**
