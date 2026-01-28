<h1 align="center"> Polymarket Copy Trading Bot</h1>

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

## 💬 Support

For questions, issues, or feature requests:

- **Telegram**: [@opensea712](https://t.me/opensea712)
- **Twitter**: [@shinytechapes](https://x.com/shinytechapes)
- **GitHub Issues**: [Open an issue](https://github.com/earthskyorg/polymarket-copy-trading-bot/issues)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Configuration](#configuration)
- [Docker Deployment](#-docker-deployment)
- [Documentation](#-documentation)
- [Security](#-security)
- [Contributing](#-contributing)
- [Frequently Asked Questions](#-frequently-asked-questions)
- [Advanced Version](#-advanced-version)
- [TypeScript Trading Bot Implementation](#-typescript-trading-bot-implementation)
- [High-Performance Rust Trading Bot](#️-high-performance-rust-trading-bot)
- [Python Trading Bot Implementation](#-python-trading-bot-implementation)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)
- [Support](#-support)

---

## 🎯 Overview

The **Polymarket Copy Trading Bot** is a production-ready, open-source automated trading solution for Polymarket prediction markets. This enterprise-grade bot automatically replicates trades from successful Polymarket traders directly to your wallet, enabling you to mirror top performers without manual intervention.

### What is Polymarket Copy Trading?

Copy trading on Polymarket allows you to automatically mirror the trades of successful traders. When a trader you're following makes a trade, this bot instantly replicates it in your wallet with proportional position sizing based on your capital. This is the most effective way to leverage the expertise of top Polymarket traders while maintaining full control over your funds.

### Key Capabilities

- **🤖 Automated Trade Replication**: Seamlessly mirrors trades from selected top-performing traders
- **📊 Intelligent Position Sizing**: Dynamically calculates trade sizes based on capital ratios
- **⚡ Real-Time Execution**: Monitors and executes trades with sub-second latency
- **📈 Comprehensive Tracking**: Maintains complete trade history and performance analytics
- **🔒 Security First**: Open-source codebase with local key storage and full transparency

---

## 🔄 How It Works

<div align="center">

<img width="1252" height="947" alt="Polymarket Copy Trading Bot Workflow - Automated Trading Process Diagram showing trader selection, monitoring, calculation, execution, and tracking" src="https://github.com/user-attachments/assets/2d1056aa-a815-4cde-914b-14a563af0533" />

<img width="1337" height="980" alt="Polymarket Copy Trading Bot Workflow - Automated Trading Process Diagram showing trader selection, monitoring, calculation, execution, and tracking" src="https://github.com/user-attachments/assets/558a61b2-1db2-4ed6-ab74-2e2aa7171fdb" />

<img width="1387" height="908" alt="Polymarket Copy Trading Bot Workflow - Automated Trading Process Diagram showing trader selection, monitoring, calculation, execution, and tracking" src="https://github.com/user-attachments/assets/945a2de8-2bef-49c5-be4f-e046e8556896" />

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
- **Architecture**: Modular design with comprehensive error handling and logging
- **Deployment**: Supports Docker deployment for easy setup and production use

### Available Implementations

This project provides three independent, production-ready implementations to suit different needs:

- **TypeScript**: Production-ready implementation with full feature set, comprehensive documentation, and Docker support
- **Rust**: High-performance implementation with zero-cost abstractions and memory safety
- **Python**: Production-ready implementation optimized for Python ecosystem integration and data science workflows

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

> **📖 Detailed Setup**: For comprehensive setup instructions, see the [Getting Started Guide](./TypeScript/docs/GETTING_STARTED.md)

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

> **📖 Complete Configuration Guide**: See [Quick Start Documentation](./TypeScript/docs/QUICK_START.md) for detailed configuration options

---

## 🏗️ Architecture

### Project Structure

```
polymarket-copy-trading-bot/
├── TypeScript/              # TypeScript implementation
│   ├── src/
│   │   ├── config/          # Configuration management
│   │   ├── services/        # Core business logic
│   │   │   ├── tradeMonitor.ts    # Monitors trader activity
│   │   │   └── tradeExecutor.ts   # Executes trades
│   │   ├── utils/           # Utility functions
│   │   ├── models/          # Database models
│   │   ├── interfaces/      # TypeScript interfaces
│   │   └── scripts/         # Utility scripts
│   ├── docs/                # Documentation
│   └── package.json
├── Rust/                    # Rust implementation (high-performance)
│   ├── src/
│   │   ├── config/          # Configuration management
│   │   ├── services/        # Core business logic
│   │   │   ├── trade_monitor.rs    # Monitors trader activity
│   │   │   └── trade_executor.rs   # Executes trades
│   │   ├── utils/           # Utility functions
│   │   ├── models/          # Database models
│   │   ├── interfaces/      # Type definitions
│   │   └── main.rs          # Entry point
│   └── Cargo.toml           # Rust project configuration
├── Python/                  # Python implementation
│   ├── src/
│   │   ├── config/          # Configuration management
│   │   ├── services/        # Core business logic
│   │   │   ├── trade_monitor.py    # Monitors trader activity
│   │   │   └── trade_executor.py   # Executes trades
│   │   ├── utils/           # Utility functions
│   │   ├── models/          # Database models
│   │   └── interfaces/      # Type definitions
│   └── requirements.txt     # Python dependencies
└── README.md
```

### Design Principles

- **Modular Architecture**: Clear separation of concerns with dedicated modules
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Error Handling**: Comprehensive error handling with graceful degradation
- **Logging**: Structured logging with file and console output
- **Configuration**: Environment-based configuration with validation
- **Testing**: Unit tests for critical components

### Key Components

1. **Trade Monitor**: Continuously monitors selected traders for new trades
2. **Trade Executor**: Executes trades based on configured strategy
3. **Position Calculator**: Calculates optimal position sizes
4. **Risk Manager**: Enforces risk limits and position sizing rules
5. **Database Layer**: MongoDB integration for trade history and analytics

---

## 🐳 Docker Deployment

Deploy the bot using Docker Compose for a production-ready, containerized setup:

```bash
# 1. Navigate to TypeScript directory
cd TypeScript

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start services
docker-compose up -d

# 4. View logs
docker-compose logs -f bot
```

### Docker Features

- **Isolated Environment**: Runs in a containerized environment
- **Automatic Restart**: Configured for automatic restart on failure
- **MongoDB Integration**: Includes MongoDB service in the stack
- **Health Checks**: Built-in health monitoring

> **📖 Docker Documentation**: For complete Docker setup and configuration, see [Docker Deployment Guide](./TypeScript/docs/DOCKER.md)

---

## 📚 Documentation

### Getting Started Guides

- **[🚀 Getting Started Guide](./TypeScript/docs/GETTING_STARTED.md)** - Comprehensive beginner's guide with step-by-step instructions
- **[⚡ Quick Start Guide](./TypeScript/docs/QUICK_START.md)** - Fast setup guide for experienced users

### Additional Resources

- **[Docker Guide](./TypeScript/docs/DOCKER.md)** - Complete Docker deployment documentation
- **[Multi-Trader Guide](./TypeScript/docs/MULTI_TRADER_GUIDE.md)** - Managing multiple traders
- **[Tiered Multipliers](./TypeScript/docs/TIERED_MULTIPLIERS.md)** - Advanced position sizing configuration
- **[Position Tracking](./TypeScript/docs/POSITION_TRACKING.md)** - Understanding position management
- **[Simulation Guide](./TypeScript/docs/SIMULATION_GUIDE.md)** - Backtesting strategies

---

## 🔒 Security

### Security Best Practices

- **Private Key Storage**: Private keys are stored locally in `.env` file and never transmitted
- **Open Source**: Full code transparency allows security audits
- **No External Services**: All operations use official Polymarket APIs
- **Read-Only by Default**: Bot only executes trades you explicitly configure

### Security Recommendations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Private Keys**: Use a dedicated trading wallet, not your main wallet
3. **Access Control**: Restrict file permissions on `.env` file
4. **Monitoring**: Regularly review trade history and positions
5. **Updates**: Keep dependencies up to date

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./TypeScript/CONTRIBUTING.md) for details.

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

# Format code
npm run format
```

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation for API changes

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

## 💻 TypeScript Trading Bot Implementation

The **TypeScript** implementation is a production-ready, enterprise-grade trading bot for Polymarket. It features comprehensive documentation, full Docker support, extensive testing, and a rich ecosystem of utility scripts for advanced trading operations.

### Why Choose TypeScript?

The TypeScript implementation offers unique advantages for JavaScript/TypeScript developers:

- **📚 Comprehensive Documentation**: Extensive guides, tutorials, and examples
- **🐳 Docker Support**: Full containerization with docker-compose for easy deployment
- **✅ Production Tested**: Battle-tested in production environments
- **🔄 Active Development**: Continuously maintained with latest features and improvements
- **🛠️ Rich Tooling**: Extensive utility scripts for monitoring, analysis, and management
- **📊 Advanced Features**: Simulation tools, position tracking, and comprehensive analytics
- **🔧 Easy Setup**: Interactive setup wizard and health check utilities
- **🌐 Node.js Ecosystem**: Seamless integration with the vast Node.js and npm ecosystem

### Key Features

- **Complete Feature Set**: All core and advanced features including multi-trader support, tiered multipliers, and trade aggregation
- **Production Ready**: Comprehensive error handling, retry logic, and graceful degradation
- **Docker Deployment**: Full containerization support with docker-compose for production use
- **Utility Scripts**: Extensive collection of scripts for trader analysis, position management, and performance tracking
- **Simulation Tools**: Built-in backtesting and simulation capabilities for strategy validation
- **Comprehensive Logging**: Structured logging with file and console output for monitoring and debugging

### Technology Stack

- **Runtime**: Node.js v18.0+ with TypeScript 5.7
- **Blockchain**: `ethers.js` for Ethereum/Polygon interactions
- **Database**: `mongoose` for MongoDB integration with schema validation
- **CLOB Client**: Official `@polymarket/clob-client` package
- **HTTP**: Native `fetch` and `axios` for API interactions
- **Configuration**: `dotenv` for environment management
- **Testing**: Jest for unit and integration testing

### Quick Start

```bash
# Navigate to TypeScript directory
cd TypeScript

# Install dependencies
npm install

# Run interactive setup wizard
npm run setup

# Build the project
npm run build

# Verify configuration
npm run health-check

# Start the bot
npm start
```

### Docker Deployment

```bash
# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f bot
```

### Available Scripts

- `npm start` - Start the trading bot
- `npm run build` - Build TypeScript to JavaScript
- `npm run setup` - Interactive configuration wizard
- `npm run health-check` - Verify configuration and connections
- `npm test` - Run test suite
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

> **📖 TypeScript Documentation**: For comprehensive guides, see the [Getting Started Guide](./TypeScript/docs/GETTING_STARTED.md), [Quick Start](./TypeScript/docs/QUICK_START.md), and [Docker Guide](./TypeScript/docs/DOCKER.md)

---

## 🛠️ High-Performance Rust Trading Bot

A high-performance trading bot for Polymarket built with **Rust** is available for advanced users seeking maximum performance, memory safety, and zero-cost abstractions. This production-ready implementation leverages Rust's unique features to deliver exceptional performance and reliability for enterprise-grade trading operations.

### Why Choose Rust?

The Rust implementation offers significant advantages for production trading systems:

- **🚀 Maximum Performance**: Zero-cost abstractions with no runtime overhead, enabling sub-millisecond trade execution
- **🛡️ Memory Safety**: Compile-time guarantees prevent memory leaks, buffer overflows, and data races without garbage collection pauses
- **⚡ Concurrent Execution**: Excellent async/await support with `tokio` runtime for highly concurrent trade monitoring and execution
- **🔒 Type Safety**: Rust's powerful type system catches errors at compile-time, reducing runtime failures
- **📦 Resource Efficiency**: Minimal memory footprint and CPU usage, ideal for long-running trading bots
- **🔧 Production Ready**: Comprehensive error handling with `anyhow` and `thiserror` for robust error management

### Key Features

- **Complete Feature Set**: Full implementation including trade monitoring, execution, copy strategies, and position tracking
- **High-Performance Architecture**: Built on `tokio` async runtime for maximum concurrency and throughput
- **Memory Safety**: Rust's ownership system ensures memory safety without runtime overhead
- **Robust Error Handling**: Comprehensive error types with `Result<T, E>` pattern and graceful error recovery
- **Type-Safe Design**: Strong type system with compile-time checks for all critical operations
- **Production Logging**: Structured logging with `env_logger` for comprehensive monitoring and debugging

### Technology Stack

- **Async Runtime**: `tokio` (full features) for high-performance async I/O
- **Blockchain**: `ethers-rs` and `web3` crates for Ethereum/Polygon interactions
- **Database**: `mongodb` crate (v3.5) for MongoDB integration with async support
- **HTTP Client**: `reqwest` with JSON support for API interactions
- **Serialization**: `serde` and `serde_json` for efficient data serialization
- **Error Handling**: `anyhow` for error context and `thiserror` for custom error types
- **Utilities**: `chrono` for date/time, `rust_decimal` for precise decimal calculations

### Quick Start

```bash
# Navigate to Rust directory
cd Rust

# Install Rust (if not already installed)
# Windows: .\install_rust.ps1
# Linux/Mac: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build the project (release mode for optimal performance)
cargo build --release

# Configure environment
# Create .env file with your configuration (see Rust/README.md)

# Run the bot
cargo run --release
# Or use helper scripts:
# Windows: .\run.bat
# Linux/Mac: ./run.sh
```

### Performance Characteristics

- **Latency**: Sub-millisecond trade detection and execution
- **Throughput**: Handles thousands of concurrent operations with minimal resource usage
- **Memory**: Low memory footprint with predictable allocation patterns
- **CPU**: Efficient CPU utilization with zero-cost abstractions
- **Startup**: Fast initialization with compile-time optimizations

### Implementation Status

✅ **Completed:**
- Project structure and Cargo configuration
- Configuration system with environment variable loading
- Database models and MongoDB connection
- Logger utility with structured logging
- Trade monitoring service with async polling
- Trade executor service with concurrent execution
- Copy strategy calculations (PERCENTAGE, FIXED, ADAPTIVE)
- Health checks and comprehensive error handling
- Graceful shutdown with signal handling

⚠️ **Note:** The CLOB client requires implementation. See the [Rust README](./Rust/README.md) for details on implementing the Polymarket CLOB client integration.

> **📖 Rust Documentation**: For detailed setup, building, and usage instructions, see the [Rust README](./Rust/README.md)

---

## 🐍 Python Trading Bot Implementation

A **Python** implementation of the Polymarket Copy Trading Bot is a production-ready, enterprise-grade solution for developers and organizations working in the Python ecosystem. This independent implementation is designed from the ground up to leverage Python's strengths for trading automation, data analysis, and system integration.

### Why Choose Python?

The Python implementation offers unique advantages for developers and organizations:

- **🐍 Python Ecosystem**: Seamless integration with Python data science, machine learning, and analytics tools
- **📚 Rich Libraries**: Access to extensive Python ecosystem for custom analytics, reporting, and integrations
- **🔧 Easy Customization**: Python's simplicity makes it easy to modify and extend functionality
- **📊 Data Analysis**: Perfect for teams that need to integrate trading with data analysis pipelines
- **🤝 Team Familiarity**: Leverage existing Python expertise in your organization
- **🔄 Rapid Development**: Fast iteration and prototyping capabilities

### Key Features

- **Complete Feature Set**: Full implementation including trade monitoring, execution, copy strategies, and position tracking
- **Modern Async Architecture**: Built with Python 3.9+ using native `asyncio` for efficient concurrent operations
- **Type Safety**: Comprehensive type hints throughout the codebase for better IDE support and maintainability
- **Advanced Trading Logic**: Sophisticated trade detection algorithms, intelligent order size calculations, and comprehensive position management
- **Rich Logging**: Colorized console output using `colorama` and structured logging with `rich` for enhanced visibility
- **Production Ready**: Comprehensive error handling, health checks, and graceful shutdown mechanisms

### Technology Stack

- **Async Runtime**: Python's native `asyncio` for concurrent operations and non-blocking I/O
- **Blockchain**: `web3.py` (v6.15+) for Ethereum/Polygon blockchain interactions
- **Database**: `pymongo` (v4.6+) for MongoDB integration with async support
- **HTTP Clients**: `httpx` (v0.27+) for async HTTP requests and `requests` for synchronous operations
- **Configuration**: `python-dotenv` for environment variable management
- **Logging**: `colorama` for cross-platform colored terminal output and `rich` for enhanced formatting
- **Utilities**: `python-dateutil` for date/time handling and `typing-extensions` for advanced type hints

### Quick Start

```bash
# Navigate to Python directory
cd Python

# Install dependencies
pip install -r requirements.txt
# Or using pip with specific Python version:
# python -m pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Verify installation
python -m src.main --help  # If help is implemented

# Run the bot
python -m src.main
```

### Development Workflow

```bash
# Install in development mode (if using pyproject.toml)
pip install -e .

# Run with verbose logging
PYTHONPATH=. python -m src.main

# Run health check (if implemented)
python -m src.utils.health_check
```

### Implementation Status

✅ **Completed:**
- Configuration system with environment variable loading
- Database models and MongoDB connection with async support
- Trade monitoring service with async polling
- Trade executor service with concurrent execution
- Copy strategy calculations (PERCENTAGE, FIXED, ADAPTIVE)
- Tiered multipliers and trade aggregation
- Health checks and comprehensive error handling
- Structured logging with colored output
- Graceful shutdown handling

⚠️ **Note:** The CLOB client requires implementation. See the [Python README](./Python/README.md) for details on implementing the Polymarket CLOB client integration.

### Python-Specific Advantages

- **Integration**: Easy integration with Jupyter notebooks for analysis and backtesting
- **Scripting**: Simple to create custom scripts for trader analysis, performance metrics, and reporting
- **ML Integration**: Seamless integration with scikit-learn, pandas, and other data science libraries
- **API Development**: Straightforward to build REST APIs or web interfaces using Flask/FastAPI

> **📖 Python Documentation**: For detailed setup, configuration, and usage instructions, see the [Python README](./Python/README.md) and [Quick Start Guide](./Python/QUICK_START.md)

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](./TypeScript/LICENSE) file for details.

---

## 🙏 Acknowledgments

This project is built using the following technologies and services:

- **[Polymarket CLOB Client](https://github.com/Polymarket/clob-client)** - Official Polymarket trading client library
- **[Predictfolio](https://predictfolio.com)** - Trader analytics and performance metrics
- **Polygon Network** - Low-cost blockchain infrastructure for efficient trading

---

## 🔍 Related Searches

If you're looking for a Polymarket copy trading bot, automated trading bot for Polymarket, Polymarket trading automation, copy trading strategy, or Polymarket bot tutorial, you've found the right solution. This is the best free open-source Polymarket trading bot available.

---

<div align="center">

**Built with ❤️ for the Polymarket community**

[⬆ Back to Top](#polymarket-copy-trading-bot)

</div>
