# Polymarket Copy Trading Bot - Rust Version

This is a Rust Version for Polymarket Copy Trading Bot. It maintains all functionalities with high speed.

## ⚠️ Important Note

**This Rust version requires a fully implemented Polymarket CLOB client.** The TypeScript version uses the official `@polymarket/clob-client` package, but there is no official Rust equivalent. You will need to:

1. **Implement the CLOB client** - The `src/utils/create_clob_client.rs` file contains a placeholder structure. You need to implement:
   - `get_order_book(asset)` - Fetch order book from Polymarket CLOB API
   - `create_market_order(order_args)` - Create and sign orders using your Ethereum wallet
   - `post_order(signed_order, order_type)` - Submit orders to Polymarket CLOB API
   - API key creation/derivation

2. **Alternative approaches:**
   - Use a Rust wrapper for the CLOB client (if available)
   - Implement direct HTTP API calls to Polymarket CLOB endpoints
   - Use a bridge service that calls the client

## Prerequisites

- **Rust 1.70+** (stable or nightly)
- **Cargo** (comes with Rust)
- **MongoDB** (running and accessible)
- **Ethereum wallet** with private key

## Installation

### 1. Install Rust

**Windows:**
```powershell
# Run the installation helper
.\install_rust.ps1

# Or install manually from https://rustup.rs/
```

**Linux/Mac:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Verify Installation

```bash
rustc --version
cargo --version
```

### 3. Install Dependencies

**Windows (PowerShell):**
```powershell
cd RustVersion
cargo build
```

**Linux/Mac (Bash):**
```bash
cd RustVersion
./install_dependencies.sh
# Or manually: cargo build
```

### 4. Create `.env` File

create new:

```env
USER_ADDRESSES=0x...  # Comma-separated trader addresses
PROXY_WALLET=0x...    # Your wallet address
PRIVATE_KEY=0x...     # Your private key
CLOB_HTTP_URL=https://clob.polymarket.com/
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws
MONGO_URI=mongodb://...
RPC_URL=https://polygon-rpc.com
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
FETCH_INTERVAL=1
TOO_OLD_TIMESTAMP=24
RETRY_LIMIT=3
COPY_STRATEGY=PERCENTAGE
COPY_SIZE=10.0
MAX_ORDER_SIZE_USD=100.0
MIN_ORDER_SIZE_USD=1.0
```

## Project Structure

```
RustVersion/
├── src/
│   ├── config/          # Configuration (env, copy strategy, database)
│   ├── interfaces/       # Type definitions
│   ├── models/          # MongoDB models
│   ├── services/        # Core services (trade monitor, executor)
│   ├── utils/           # Utilities (logger, fetch data, etc.)
│   └── main.rs          # Entry point
├── logs/                # Log files (created automatically)
├── Cargo.toml          # Rust project configuration
└── README.md           # This file
```

## Usage

**Before running, ensure:**
1. MongoDB is running and accessible
2. CLOB client is fully implemented (see `src/utils/create_clob_client.rs`)
3. All environment variables are set correctly

**Run the bot:**

**Windows:**
```batch
.\run.bat
```

**Linux/Mac:**
```bash
./run.sh
```

**Or directly with Cargo:**
```bash
cargo run --release
```

## Features

✅ **Fully implemented:**
- Trade monitoring and execution
- Copy strategy system (PERCENTAGE, FIXED, ADAPTIVE)
- Tiered multipliers
- Trade aggregation
- Position tracking
- Comprehensive logging
- Health checks
- Graceful shutdown

✅ **Same logic and results:**
- Identical trade detection
- Same order size calculations
- Same position management
- Same error handling

## Differences from TypeScript Version

1. **CLOB Client**: Requires manual implementation (see above)
2. **Async Runtime**: Uses `tokio` instead of Promise-based async
3. **Type System**: Uses Rust's strong type system with ownership
4. **MongoDB**: Uses `mongodb` crate instead of `mongoose`
5. **Ethereum**: Uses `ethers-rs` or `web3` crate instead of `ethers.js`
6. **Error Handling**: Uses `Result<T, E>` and `anyhow`/`thiserror` for error handling
7. **Memory Safety**: Rust's ownership system ensures memory safety

## Implementation Status

- ✅ Project structure
- ✅ Cargo configuration
- ⚠️ **Configuration system** (needs implementation)
- ⚠️ **Database models and connection** (needs implementation)
- ⚠️ **Logger utility** (needs implementation)
- ⚠️ **Trade monitoring service** (needs implementation)
- ⚠️ **Trade executor service** (needs implementation)
- ⚠️ **Copy strategy calculations** (needs implementation)
- ⚠️ **Health checks** (needs implementation)
- ⚠️ **Error handling** (needs implementation)
- ⚠️ **CLOB client** (needs implementation)
- ⚠️ **Order signing** (needs implementation)

## Next Steps

1. **Implement Core Modules:**
   - Configuration loading from `.env`
   - MongoDB connection and models
   - Logger with colored output
   - Error types and handling

2. **Implement CLOB Client:**
   - Study the TypeScript `@polymarket/clob-client` package
   - Implement HTTP API calls to Polymarket CLOB endpoints
   - Implement order signing using `ethers-rs` or similar
   - Test with small orders first

3. **Implement Services:**
   - Trade monitoring service
   - Trade executor service
   - Copy strategy calculations
   - Health checks

4. **Testing:**
   - Unit tests for each module
   - Integration tests
   - Verify calculations

5. **Production Readiness:**
   - Add comprehensive error handling
   - Add retry logic for API calls
   - Add monitoring and alerts
   - Performance optimization

## Building

**Debug build:**
```bash
cargo build
```

**Release build (optimized):**
```bash
cargo build --release
```

**Run tests:**
```bash
cargo test
```

## Performance

Rust offers significant performance advantages:
- **Zero-cost abstractions**: No runtime overhead
- **Memory safety**: No garbage collection pauses
- **Concurrency**: Excellent async/await support with tokio
- **Compile-time checks**: Catches errors before runtime

## Support

For issues or questions:
1. Check the documentation
2. Review the Polymarket CLOB API documentation
3. Check the code comments for implementation hints
4. Refer to Rust documentation: https://doc.rust-lang.org/
