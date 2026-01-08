# Polymarket Copy Trading Bot - Automated Trading Bot for Polymarket Prediction Markets

<!-- SEO Meta Description: Best Polymarket copy trading bot for automated trading. Mirror top traders on Polymarket with intelligent position sizing, real-time execution, and 24/7 monitoring. Free open-source TypeScript trading bot for Polygon blockchain. -->

<div align="center">

**Automated copy trading (copytrading) bot for Polymarket that mirrors trades from top performers with intelligent position sizing and real-time execution.**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.9-green.svg)](https://www.mongodb.com/)
[![GitHub Stars](https://img.shields.io/github/stars/earthskyorg/polymarket-copy-trading-bot?style=social)](https://github.com/earthskyorg/polymarket-copy-trading-bot)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [FAQ](#-frequently-asked-questions) • [Support](#-support)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Docker Deployment](#-docker-deployment)
- [Documentation](#-documentation)
- [Frequently Asked Questions](#-frequently-asked-questions)
- [Advanced Version](#-advanced-version)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

---

## 🎯 Overview

The **Polymarket Copy Trading Bot** is the leading open-source automated trading solution for Polymarket prediction markets. This enterprise-grade trading bot automatically replicates trades from successful Polymarket traders directly to your wallet, enabling you to mirror top performers without manual intervention. The system provides continuous 24/7 monitoring, intelligent position sizing calculations, and real-time order execution with comprehensive trade tracking.

### What is Polymarket Copy Trading?

Copy trading on Polymarket allows you to automatically mirror the trades of successful traders. When a trader you're following makes a trade, this bot instantly replicates it in your wallet with proportional position sizing based on your capital. This is the most effective way to leverage the expertise of top Polymarket traders while maintaining full control over your funds.

### Key Capabilities

- **Automated Trade Replication**: Seamlessly mirrors trades from selected top-performing traders
- **Intelligent Position Sizing**: Dynamically calculates trade sizes based on capital ratios
- **Real-Time Execution**: Monitors and executes trades with sub-second latency
- **Comprehensive Tracking**: Maintains complete trade history and performance analytics

---

## 🔄 How It Works

<div align="center">

<img width="995" height="691" alt="Polymarket Copy Trading Bot Workflow - Automated Trading Process Diagram showing trader selection, monitoring, calculation, execution, and tracking" src="https://github.com/user-attachments/assets/79715c7a-de2c-4033-81e6-b2288963ec9b" />

</div>

### Process Flow

1. **Trader Selection**
   - Identify top performers from the [Polymarket Leaderboard](https://polymarket.com/leaderboard)
   - Validate trader statistics using [Predictfolio](https://predictfolio.com)
   - Configure trader addresses in the system

2. **Continuous Monitoring**
   - Bot monitors trader activity using the Polymarket Data API
   - Detects new positions and trade executions in real-time
   - Polls at configurable intervals (default: 1 second)

3. **Intelligent Calculation**
   - Analyzes trader's order size and portfolio value
   - Calculates proportional position size based on your capital
   - Applies configured multipliers and risk management rules

4. **Order Execution**
   - Places matching orders on Polymarket using your wallet
   - Implements price protection and slippage checks
   - Handles order aggregation for optimal execution

5. **Performance Tracking**
   - Maintains comprehensive trade history in MongoDB
   - Tracks positions, P&L, and performance metrics
   - Provides detailed analytics and reporting

---

## ✨ Features

### Core Functionality

This Polymarket copy trading bot provides enterprise-grade features for automated trading on Polymarket prediction markets:

| Feature | Description |
|---------|-------------|
| **Multi-Trader Support** | Track and copy trades from multiple Polymarket traders simultaneously with independent configuration for each trader |
| **Smart Position Sizing** | Automatically adjusts trade sizes based on your capital relative to trader's capital, ensuring proportional risk management |
| **Tiered Multipliers** | Apply different multipliers based on trade size ranges for sophisticated risk management and capital allocation |
| **Position Tracking** | Accurately tracks purchases and sells even after balance changes with complete historical context |
| **Trade Aggregation** | Combines multiple small trades into larger executable orders to optimize execution and reduce gas costs |
| **Real-Time Execution** | Monitors Polymarket trades every second and executes instantly with minimal latency for optimal entry prices |
| **MongoDB Integration** | Persistent storage of all trades, positions, and historical data for comprehensive analytics |
| **Price Protection** | Built-in slippage checks and price validation to avoid unfavorable fills and protect your capital |
| **24/7 Monitoring** | Continuous automated monitoring of selected traders without manual intervention |
| **Open Source** | Free and open-source codebase allowing full transparency and customization |

### Technical Specifications

- **Monitoring Method**: Polymarket Data API with configurable polling intervals for real-time trade detection
- **Default Polling Interval**: 1 second (configurable via `FETCH_INTERVAL`) for optimal balance between speed and API usage
- **Database**: MongoDB for persistent storage and analytics of all trading activity
- **Network**: Polygon blockchain for low-cost transactions and efficient gas usage
- **Architecture**: TypeScript-based modular design with comprehensive error handling and logging
- **Language**: Built with TypeScript for type safety and maintainability
- **Deployment**: Supports Docker deployment for easy setup and production use

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following:

- **Node.js** v18.0.0 or higher
- **MongoDB Database** ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) free tier recommended)
- **Polygon Wallet** with USDC and POL/MATIC for gas fees
- **RPC Endpoint** ([Infura](https://infura.io) or [Alchemy](https://www.alchemy.com) free tier)

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/earthskyorg/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot

# 2. Install dependencies
npm install

# 3. Run interactive setup wizard
npm run setup

# 4. Build the project
npm run build

# 5. Verify configuration
npm run health-check

# 6. Start the bot
npm start
```

> **📖 Detailed Setup**: For comprehensive setup instructions, see the [Getting Started Guide](./docs/GETTING_STARTED.md)

---

## ⚙️ Configuration

### Essential Environment Variables

The following environment variables are required for the bot to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `USER_ADDRESSES` | Comma-separated list of trader addresses to copy | `'0xABC..., 0xDEF...'` |
| `PROXY_WALLET` | Your Polygon wallet address | `'0x123...'` |
| `PRIVATE_KEY` | Wallet private key (without 0x prefix) | `'abc123...'` |
| `MONGO_URI` | MongoDB connection string | `'mongodb+srv://...'` |
| `RPC_URL` | Polygon RPC endpoint URL | `'https://polygon...'` |
| `TRADE_MULTIPLIER` | Position size multiplier (default: 1.0) | `2.0` |
| `FETCH_INTERVAL` | Monitoring interval in seconds (default: 1) | `1` |

### Finding Quality Traders

To identify traders worth copying, follow these steps:

1. **Visit the Leaderboard**: Navigate to [Polymarket Leaderboard](https://polymarket.com/leaderboard)
2. **Evaluate Performance**: Look for traders with:
   - Positive P&L over extended periods
   - Win rate above 55%
   - Active and consistent trading history
3. **Verify Statistics**: Cross-reference detailed stats on [Predictfolio](https://predictfolio.com)
4. **Configure**: Add verified wallet addresses to `USER_ADDRESSES` in your configuration

> **📖 Complete Configuration Guide**: See [Quick Start Documentation](./docs/QUICK_START.md) for detailed configuration options

---

## 🐳 Docker Deployment

Deploy the bot using Docker Compose for a production-ready, containerized setup:

```bash
# 1. Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f bot
```

### Docker Features

- **Isolated Environment**: Runs in a containerized environment
- **Automatic Restart**: Configured for automatic restart on failure
- **MongoDB Integration**: Includes MongoDB service in the stack
- **Health Checks**: Built-in health monitoring

> **📖 Docker Documentation**: For complete Docker setup and configuration, see [Docker Deployment Guide](./docs/DOCKER.md)

---

## 📚 Documentation

### Getting Started Guides

- **[🚀 Getting Started Guide](./docs/GETTING_STARTED.md)** - Comprehensive beginner's guide with step-by-step instructions
- **[⚡ Quick Start Guide](./docs/QUICK_START.md)** - Fast setup guide for experienced users

### Additional Resources

- **[Docker Guide](./docs/DOCKER.md)** - Complete Docker deployment documentation
- **[Multi-Trader Guide](./docs/MULTI_TRADER_GUIDE.md)** - Managing multiple traders
- **[Tiered Multipliers](./docs/TIERED_MULTIPLIERS.md)** - Advanced position sizing configuration
- **[Position Tracking](./docs/POSITION_TRACKING.md)** - Understanding position management

---

## ❓ Frequently Asked Questions

### What is a Polymarket Copy Trading Bot?

A Polymarket copy trading bot is an automated software that monitors successful traders on Polymarket and automatically replicates their trades in your wallet. This bot provides 24/7 monitoring, intelligent position sizing, and real-time execution to mirror top-performing traders.

### How does the Polymarket trading bot work?

The bot continuously monitors selected traders using the Polymarket Data API. When a trader makes a trade, the bot calculates the proportional position size based on your capital, applies configured multipliers, and executes the trade on your behalf with minimal latency.

### Is this Polymarket bot free and open source?

Yes! This is a completely free and open-source Polymarket copy trading bot. The code is available on GitHub under the ISC license, allowing you to use, modify, and distribute it freely.

### What are the requirements to run this Polymarket automated trading bot?

You need:
- Node.js v18.0.0 or higher
- MongoDB database (free tier available on MongoDB Atlas)
- Polygon wallet with USDC and POL/MATIC for gas fees
- RPC endpoint (free tier available on Infura or Alchemy)

### How do I find the best Polymarket traders to copy?

1. Visit the [Polymarket Leaderboard](https://polymarket.com/leaderboard)
2. Look for traders with positive P&L over extended periods
3. Verify statistics on [Predictfolio](https://predictfolio.com)
4. Add their wallet addresses to your bot configuration

### Can I copy multiple Polymarket traders at once?

Yes! The bot supports multi-trader functionality, allowing you to copy trades from multiple traders simultaneously with independent configuration for each trader.

### Is this bot safe to use?

The bot is open-source, allowing you to review all code. Your private keys are stored locally and never transmitted. The bot only executes trades you've configured, and you maintain full control over your funds at all times.

### What is the difference between this bot and manual trading on Polymarket?

This automated bot provides:
- 24/7 monitoring without manual oversight
- Instant trade replication (sub-second latency)
- Intelligent position sizing based on capital ratios
- Comprehensive trade history and analytics
- Ability to copy multiple traders simultaneously

### How much does it cost to run this Polymarket bot?

The bot itself is free. You only pay for:
- Polygon network gas fees (typically very low)
- Optional MongoDB Atlas hosting (free tier available)
- Optional RPC endpoint (free tier available)

### Can I customize the trading strategy?

Yes! The bot supports:
- Custom position multipliers
- Tiered multipliers based on trade size
- Configurable polling intervals
- Multiple trader configurations
- Risk management rules

## 🚀 Advanced Version

### Version 2.0 - RTDS (Real-Time Data Stream)

An advanced version with **Real-Time Data Stream (RTDS)** monitoring is available as a private repository.

#### Enhanced Features

- **Fastest Trade Detection**: Near-instantaneous trade replication
- **Reduced Latency**: Optimized for minimal execution delay
- **Lower API Load**: More efficient data streaming architecture
- **Superior Performance**: Enhanced copy trading (copytrading) capabilities

<!-- <div align="center">

<img width="680" height="313" alt="Version 2 RTDS Features" src="https://github.com/user-attachments/assets/d868f9f2-a1dd-4bfe-a76e-d8cbdfbd8497" />

</div> -->

---

## 🛠️ High-Performance Rust Trading Bot

A high-performance trading bot for Polymarket built with **Rust** is also available for advanced users seeking maximum performance.

<div align="center">

<img width="1917" height="942" alt="Rust Trading Bot for Polymarket - High Performance Automated Trading Interface" src="https://github.com/user-attachments/assets/08a5c962-7f8b-4097-98b6-7a457daa37c9" />

[Watch Demo Video](https://www.youtube.com/watch?v=0uUI_ht_2eY)

</div>

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

This project is built using the following technologies and services:

- **[Polymarket CLOB Client](https://github.com/Polymarket/clob-client)** - Official Polymarket trading client library
- **[Predictfolio](https://predictfolio.com)** - Trader analytics and performance metrics
- **Polygon Network** - Low-cost blockchain infrastructure for efficient trading

## 🔍 Related Searches

If you're looking for a Polymarket copy trading bot, automated trading bot for Polymarket, Polymarket trading automation, copy trading strategy, or Polymarket bot tutorial, you've found the right solution. This is the best free open-source Polymarket trading bot available.

---

## 💬 Support

For questions, issues, or feature requests:

- **Telegram**: [@opensea712](https://t.me/opensea712)
- **Twitter**: [@shinytechapes](https://x.com/shinytechapes)

---

<div align="center">

**Built with ❤️ for the Polymarket community**

[⬆ Back to Top](#polymarket-copy-trading-bot)

</div>
