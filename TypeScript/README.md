<h1 align="center"> Polymarket Copy Trading Bot - TypeScript Implementation </h1>

<div align="center">

**Enterprise-grade automated copy trading bot for Polymarket prediction markets**

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
- [Configuration](#configuration)
- [Architecture](#-architecture)
- [Docker Deployment](#-docker-deployment)
- [Documentation](#-documentation)
- [Security](#-security)
- [Contributing](#-contributing)
- [Frequently Asked Questions](#-frequently-asked-questions)
- [Advanced Version](#-advanced-version)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 Overview

The **Polymarket Copy Trading Bot** is a production-ready, open-source automated trading solution for Polymarket prediction markets. This TypeScript implementation provides enterprise-grade features with full type safety, comprehensive error handling, and modular architecture.

### What is Polymarket Copy Trading?

Copy trading on Polymarket allows you to automatically mirror the trades of successful traders. When a trader you're following makes a trade, this bot instantly replicates it in your wallet with proportional position sizing based on your capital. This is the most effective way to leverage the expertise of top Polymarket traders while maintaining full control over your funds.

### Key Capabilities

- **🤖 Automated Trade Replication**: Seamlessly mirrors trades from selected top-performing traders
- **📊 Intelligent Position Sizing**: Dynamically calculates trade sizes based on capital ratios
- **⚡ Real-Time Execution**: Monitors and executes trades with sub-second latency
- **📈 Comprehensive Tracking**: Maintains complete trade history and performance analytics
- **🔒 Security First**: Open-source codebase with local key storage and full transparency
- **💪 Type Safety**: Full TypeScript coverage with strict type checking

---

## 🔄 How It Works

<div align="center">

<img width="1252" height="947" alt="Polymarket Copy Trading Bot Workflow" src="https://github.com/user-attachments/assets/2d1056aa-a815-4cde-914b-14a563af0533" />

<img width="1337" height="980" alt="Polymarket Copy Trading Bot Workflow" src="https://github.com/user-attachments/assets/558a61b2-1db2-4ed6-ab74-2e2aa7171fdb" />

<img width="1387" height="908" alt="Polymarket Copy Trading Bot Workflow" src="https://github.com/user-attachments/assets/945a2de8-2bef-49c5-be4f-e046e8556896" />

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
- **Language**: Built with TypeScript 5.7 for type safety and maintainability
- **Deployment**: Supports Docker deployment for easy setup and production use
- **Type Safety**: Strict TypeScript configuration with full type coverage

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
cd polymarket-copy-trading-bot/TypeScript

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

<a id="configuration"></a>
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

## 🏗️ Architecture

### Project Structure

```
TypeScript/
├── src/
│   ├── config/              # Configuration management
│   │   ├── env.ts           # Environment variable validation
│   │   ├── copyStrategy.ts  # Copy trading strategy logic
│   │   └── db.ts            # MongoDB connection
│   ├── services/            # Core business logic
│   │   ├── tradeMonitor.ts  # Monitors trader activity
│   │   ├── tradeExecutor.ts # Executes trades
│   │   └── createClobClient.ts # CLOB client factory
│   ├── utils/               # Utility functions
│   │   ├── logger.ts        # Structured logging
│   │   ├── postOrder.ts     # Order execution logic
│   │   ├── errors.ts        # Error handling
│   │   └── constants.ts     # Application constants
│   ├── models/              # Database models
│   │   └── userHistory.ts   # User activity and position models
│   ├── interfaces/          # TypeScript interfaces
│   │   └── User.ts          # User and trade interfaces
│   ├── scripts/             # Utility scripts
│   │   ├── setup.ts         # Interactive setup wizard
│   │   ├── healthCheck.ts   # Health check utility
│   │   └── ...              # Additional utility scripts
│   └── index.ts             # Application entry point
├── docs/                    # Documentation
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Docker image definition
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

### Design Principles

- **Modular Architecture**: Clear separation of concerns with dedicated modules
- **Type Safety**: Full TypeScript coverage with strict type checking (`strict: true`)
- **Error Handling**: Comprehensive error handling with custom error classes and graceful degradation
- **Logging**: Structured logging with file and console output using chalk for colors
- **Configuration**: Environment-based configuration with validation
- **Testing**: Unit tests for critical components using Jest

### Key Components

1. **Trade Monitor** (`services/tradeMonitor.ts`): Continuously monitors selected traders for new trades
2. **Trade Executor** (`services/tradeExecutor.ts`): Executes trades based on configured strategy
3. **Position Calculator** (`config/copyStrategy.ts`): Calculates optimal position sizes
4. **Risk Manager**: Enforces risk limits and position sizing rules
5. **Database Layer** (`models/userHistory.ts`): MongoDB integration for trade history and analytics
6. **Error Handler** (`utils/errors.ts`): Custom error classes for different error types

### TypeScript Configuration

The project uses strict TypeScript configuration:

- **Strict Mode**: All strict type-checking options enabled
- **Target**: ES2016 for modern JavaScript features
- **Module**: CommonJS for Node.js compatibility
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for type definitions

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
- **[Simulation Guide](./docs/SIMULATION_GUIDE.md)** - Backtesting strategies
- **[Simulation Quick Start](./docs/SIMULATION_QUICKSTART.md)** - Quick simulation guide
- **[Simulation Runner Guide](./docs/SIMULATION_RUNNER_GUIDE.md)** - Complete simulation documentation

---

## 🔒 Security

### Security Best Practices

- **Private Key Storage**: Private keys are stored locally in `.env` file and never transmitted
- **Open Source**: Full code transparency allows security audits
- **No External Services**: All operations use official Polymarket APIs
- **Read-Only by Default**: Bot only executes trades you explicitly configure
- **Type Safety**: TypeScript prevents many runtime errors through compile-time checks

### Security Recommendations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Private Keys**: Use a dedicated trading wallet, not your main wallet
3. **Access Control**: Restrict file permissions on `.env` file (chmod 600)
4. **Monitoring**: Regularly review trade history and positions
5. **Updates**: Keep dependencies up to date (`npm audit`)
6. **Code Review**: Review all code changes before deployment

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/earthskyorg/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot/TypeScript

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run in development mode
npm run dev
```

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation for API changes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the bot (production) |
| `npm run dev` | Start the bot in development mode |
| `npm run build` | Build TypeScript to JavaScript |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run setup` | Run interactive setup wizard |
| `npm run health-check` | Verify configuration |

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

### Why TypeScript?

TypeScript provides:
- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Autocomplete and refactoring
- **Maintainability**: Easier to understand and modify code
- **Documentation**: Types serve as inline documentation

---

## 🚀 Advanced Version

### Version 3.0 - RTDS (Real-Time Data Stream)

An advanced version with **Real-Time Data Stream (RTDS)** monitoring is available as a private repository.

<img width="1900" height="909" alt="Screenshot_1" src="https://github.com/user-attachments/assets/c7383d27-7331-42f7-aa55-beb1fdf08373" />

<img width="1904" height="909" alt="Screenshot_2" src="https://github.com/user-attachments/assets/651bcdb5-4aeb-4885-900d-23f7b5876d5d" />

<img width="1900" height="908" alt="Screenshot_3" src="https://github.com/user-attachments/assets/175969ee-af21-40b0-a9fc-73818baa9734" />

<img width="1902" height="905" alt="Screenshot_4" src="https://github.com/user-attachments/assets/46b96995-dafe-48ae-8eff-30106cf8100b" />

#### Enhanced Features

- **Fastest Trade Detection**: Near-instantaneous trade replication
- **Reduced Latency**: Optimized for minimal execution delay
- **Lower API Load**: More efficient data streaming architecture
- **Superior Performance**: Enhanced copy trading capabilities

---

## 🛠️ High-Performance Rust Trading Bot

A high-performance trading bot for Polymarket built with **Rust** is also available for advanced users seeking maximum performance. See the [Rust implementation](../Rust/README.md) for details.

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

This project is built using the following technologies and services:

- **[Polymarket CLOB Client](https://github.com/Polymarket/clob-client)** - Official Polymarket trading client library
- **[Predictfolio](https://predictfolio.com)** - Trader analytics and performance metrics
- **Polygon Network** - Low-cost blockchain infrastructure for efficient trading
- **TypeScript** - Type-safe JavaScript for better development experience
- **MongoDB** - Document database for trade history and analytics

---

## 🔍 Related Searches

If you're looking for a Polymarket copy trading bot, automated trading bot for Polymarket, Polymarket trading automation, copy trading strategy, or Polymarket bot tutorial, you've found the right solution. This is the best free open-source Polymarket trading bot available.

---

## 💬 Support

For questions, issues, or feature requests:

- **Telegram**: [@opensea712](https://t.me/opensea712)
- **Twitter**: [@shinytechapes](https://x.com/shinytechapes)
- **GitHub Issues**: [Open an issue](https://github.com/earthskyorg/polymarket-copy-trading-bot/issues)

---

<div align="center">

**Built with ❤️ for the Polymarket community**

[⬆ Back to Top](#polymarket-copy-trading-bot---typescript-implementation)

</div>
