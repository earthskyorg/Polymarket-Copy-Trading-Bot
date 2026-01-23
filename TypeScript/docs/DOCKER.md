# Docker Deployment Guide

Complete guide for deploying the Polymarket Copy Trading Bot using Docker and Docker Compose.

## Table of Contents

- [Why Docker?](#why-docker)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
    - [Bot Configuration (.env)](#bot-configuration-env)
    - [Docker Configuration (.env.docker)](#docker-configuration-envdocker)
    - [MongoDB Setup](#mongodb-setup)
    - [VPN Setup (Optional)](#vpn-setup-optional)
- [Running the Bot](#running-the-bot)
- [Container Management](#container-management)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Advanced Configuration](#advanced-configuration)

---

## Why Docker?

Docker deployment offers several advantages:

- **Isolation** - Bot runs in isolated environment, doesn't interfere with host system
- **Consistency** - Same setup works on any machine with Docker installed
- **Easy Updates** - Rebuild and restart containers to update the bot
- **MongoDB Included** - No need to install MongoDB separately
- **VPN Support** - Optional WireGuard VPN for geographic restrictions
- **Production Ready** - Automatic restarts, health checks, and logging

---

## Prerequisites

1. **Docker and Docker Compose installed**

    - Docker Engine 20.10+
    - Docker Compose 2.0+
    - [Install Docker](https://docs.docker.com/get-docker/)
    - [Install Docker Compose](https://docs.docker.com/compose/install/)

2. **System Requirements**

    - 2GB RAM minimum
    - 10GB disk space (for MongoDB data)
    - Linux, macOS, or Windows with WSL2

3. **Trading Prerequisites**
    - Polygon wallet with USDC balance
    - Small amount of POL for gas fees (~$5-10)
    - Infura or Alchemy API key for Polygon RPC

---

## Quick Start

Get running in 3 commands:

```bash
# 1. Clone and configure
git clone <repository-url>
cd polymarket-copy-trading-bot
cp .env.example .env
cp .env.docker.example .env.docker

# 2. Edit configuration files
nano .env              # Configure bot settings
nano .env.docker       # Configure Docker/MongoDB

# 3. Start everything
docker-compose up -d
```

That's it! The bot will:

- ✅ Build the Docker image
- ✅ Start MongoDB container
- ✅ Start VPN container (if configured)
- ✅ Start the trading bot
- ✅ Begin copying trades

Check logs: `docker-compose logs -f polymarket`

---

## Configuration

### Bot Configuration (.env)

This is your main bot configuration file. See `.env.example` for full details.

**Required settings:**

```bash
# Traders to copy
USER_ADDRESSES='0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'

# Your wallet
PROXY_WALLET='0xYourWalletAddress'
PRIVATE_KEY='your_private_key_without_0x_prefix'

# Polygon RPC
RPC_URL='https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY'

# Note: MONGO_URI is auto-configured by docker-compose.yml
# You don't need to set it in .env when using Docker
```

**Optional settings:**

```bash
TRADE_MULTIPLIER=1.0                    # Position size multiplier
TRADE_AGGREGATION_ENABLED=false         # Combine small trades
FETCH_INTERVAL=1                        # Check interval in seconds
```

### Docker Configuration (.env.docker)

This file contains Docker-specific configuration (MongoDB credentials, VPN keys, etc.).

```bash
cp .env.docker.example .env.docker
```

**Edit `.env.docker`:**

```bash
# MongoDB credentials (change password!)
MONGO_USER=polymarket_user
MONGO_PASSWORD=your_strong_password_here
MONGO_DATABASE=polymarket_db

# User/Group IDs (run 'id -u' and 'id -g' to get yours)
PUID=1000
PGID=1000

# VPN Configuration (optional - see VPN section below)
# Leave commented out if not using VPN
# WIREGUARD_PRIVATE_KEY=your_key
# WIREGUARD_PRESHARED_KEY=your_preshared_key
# WIREGUARD_ADDRESSES=10.x.x.x/32
```

**Load environment variables:**

```bash
# Option 1: Export to current shell (for docker-compose)
export $(cat .env.docker | grep -v '^#' | xargs)

# Option 2: Add to docker-compose.yml env_file section
# Already configured in the provided docker-compose.yml
```

### MongoDB Setup

The Docker setup includes a MongoDB container automatically.

**Included Configuration:**

- MongoDB 7.0 (official image)
- Data persisted to `./mongodb_data` directory
- Config persisted to `./mongodb_config` directory
- Only accessible within Docker network (not exposed externally)
- Health checks for dependency management

**Using External MongoDB (Optional):**

If you prefer MongoDB Atlas or external database:

1. Set `MONGO_URI` in your `.env` file:

    ```bash
    MONGO_URI='mongodb+srv://user:pass@cluster.mongodb.net/database'
    ```

2. Comment out the `mongodb` service in `docker-compose.yml`

3. Remove the MongoDB dependency from the `polymarket` service

### VPN Setup (Optional)

VPN is **completely optional** and only needed if:

- You're in a geo-restricted region for Polymarket
- You want to hide trading activity from your ISP
- You need to bypass regional limitations

**Supported VPN Providers:**

The Docker setup uses [Gluetun](https://github.com/qdm12/gluetun) which supports 40+ VPN providers including:

- AirVPN
- NordVPN
- ExpressVPN
- Mullvad
- Surfshark
- And many more...

**VPN Configuration Steps:**

1. **Get WireGuard configuration from your VPN provider**

    - Most providers offer WireGuard configs in their dashboard
    - Download or generate a WireGuard config file

2. **Extract required values** from the config file:

    ```ini
    [Interface]
    PrivateKey = YOUR_PRIVATE_KEY_HERE         # → WIREGUARD_PRIVATE_KEY
    Address = 10.x.x.x/32                      # → WIREGUARD_ADDRESSES

    [Peer]
    PresharedKey = YOUR_PRESHARED_KEY_HERE     # → WIREGUARD_PRESHARED_KEY (optional)
    ```

3. **Add to `.env.docker`:**

    ```bash
    VPN_PROVIDER=airvpn
    WIREGUARD_PRIVATE_KEY=your_private_key
    WIREGUARD_PRESHARED_KEY=your_preshared_key
    WIREGUARD_ADDRESSES=10.x.x.x/32
    VPN_COUNTRIES=Austria, Belgium, Germany, United Kingdom
    ```

4. **Create VPN directory** (optional, for Gluetun config):
    ```bash
    mkdir -p vpn
    ```

**To Disable VPN:**

If you don't need VPN, you have two options:

**Option 1: Comment out in docker-compose.yml**

```yaml
services:
    # wireguard-vpn:
    #   [entire service commented out]

    polymarket:
        # Change from:
        # network_mode: "service:wireguard-vpn"
        # To:
        networks:
            - polymarket-network
        depends_on:
            # Remove wireguard-vpn dependency
            mongodb:
                condition: service_healthy
```

**Option 2: Use docker-compose override**

Create `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
    polymarket:
        networks:
            - polymarket-network
        network_mode: null
        depends_on:
            mongodb:
                condition: service_healthy
```

---

## Running the Bot

### Initial Setup

```bash
# 1. Make sure your .env and .env.docker files are configured
export $(cat .env.docker | grep -v '^#' | xargs)

# 2. Build the Docker image
docker-compose build

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f polymarket
```

### First Run Behavior

On first run, the bot will:

1. ✅ Check USDC token allowance for Polymarket
2. ✅ Mark all historical trades as processed (won't copy old trades)
3. ✅ Begin monitoring for new trades
4. ✅ Start copying trades from your specified traders

### Monitoring

```bash
# View live logs
docker-compose logs -f polymarket

# View MongoDB logs
docker-compose logs -f mongodb

# View VPN logs (if enabled)
docker-compose logs -f wireguard-vpn

# View all logs
docker-compose logs -f
```

---

## Container Management

### Basic Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart bot (after config changes)
docker-compose restart polymarket

# Rebuild after code changes
docker-compose up -d --build

# View running containers
docker-compose ps

# View resource usage
docker stats
```

### Updating the Bot

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Check logs to verify update
docker-compose logs -f polymarket
```

### Backing Up MongoDB Data

```bash
# Create backup
docker-compose exec mongodb mongodump \
  --out=/data/backup \
  --authenticationDatabase=admin \
  -u polymarket_user \
  -p your_password

# Copy backup to host
docker cp polymarket-mongodb:/data/backup ./mongodb_backup

# Restore from backup
docker cp ./mongodb_backup polymarket-mongodb:/data/restore
docker-compose exec mongodb mongorestore \
  /data/restore \
  --authenticationDatabase=admin \
  -u polymarket_user \
  -p your_password
```

### Cleaning Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (WARNING: deletes MongoDB data!)
docker-compose down -v

# Remove old images
docker image prune -a

# Complete cleanup (use with caution)
docker-compose down -v
rm -rf mongodb_data mongodb_config vpn
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**

```bash
docker-compose logs polymarket
```

**Common causes:**

- Missing `.env` file → Copy from `.env.example`
- Invalid configuration → Check `USER_ADDRESSES`, `PRIVATE_KEY`, etc.
- Port conflicts → Check if ports are already in use
- Permission issues → See file permissions section below

### MongoDB Connection Failed

**Error:** `MongoServerError: Authentication failed`

**Solution:**

```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify credentials in .env.docker
# Make sure MONGO_USER and MONGO_PASSWORD match in:
# 1. .env.docker
# 2. docker-compose.yml MONGO_URI override

# Reset MongoDB (WARNING: deletes data)
docker-compose down -v
rm -rf mongodb_data mongodb_config
docker-compose up -d
```

### VPN Not Connecting

**Check VPN logs:**

```bash
docker-compose logs wireguard-vpn
```

**Common issues:**

- Invalid WireGuard keys → Double-check keys from VPN provider
- VPN provider not supported → Check [Gluetun docs](https://github.com/qdm12/gluetun-wiki/tree/main/setup/providers)
- Firewall blocking → Allow UDP traffic for WireGuard
- VPN server down → Try different `SERVER_COUNTRIES`

**Test VPN connection:**

```bash
# Check public IP (should be VPN IP, not your real IP)
docker-compose exec polymarket curl -s https://api.ipify.org
```

### File Permission Issues

**Error:** `EACCES: permission denied`

**Solution:**

```bash
# Get your user ID and group ID
id -u  # Your UID
id -g  # Your GID

# Update .env.docker
PUID=1000  # Replace with your UID
PGID=1000  # Replace with your GID

# Restart containers
docker-compose restart polymarket

# Fix existing file permissions
sudo chown -R $(id -u):$(id -g) mongodb_data mongodb_config logs
```

### Bot Not Detecting Trades

**Checklist:**

1. ✅ Trader addresses correct in `.env`
2. ✅ Traders are actively trading
3. ✅ MongoDB connection working
4. ✅ `FETCH_INTERVAL` not too long

**Verify trader activity:**

```bash
# Check if trader has recent trades on Polymarket
# Visit: https://polymarket.com/profile/<trader_address>
```

### Container Exits Immediately

**Check exit code:**

```bash
docker-compose ps
```

**View full logs:**

```bash
docker-compose logs polymarket
```

**Common causes:**

- Build failed → Check Dockerfile and npm install logs
- Invalid Node.js version → Ensure Node 18+ in Dockerfile
- Missing dependencies → Try rebuilding: `docker-compose build --no-cache`

### High CPU/Memory Usage

**Monitor resources:**

```bash
docker stats polymarket
```

**Optimization tips:**

- Increase `FETCH_INTERVAL` (reduce API polling frequency)
- Limit number of tracked traders
- Enable `TRADE_AGGREGATION_ENABLED=true`
- Reduce log verbosity

---

## Security Best Practices

### Environment Files

```bash
# Never commit sensitive files
echo ".env" >> .gitignore
echo ".env.docker" >> .gitignore

# Verify they're not tracked
git status

# Set proper permissions
chmod 600 .env .env.docker
```

### MongoDB Security

```bash
# Use strong password in .env.docker
MONGO_PASSWORD=$(openssl rand -base64 32)

# MongoDB is NOT exposed externally by default
# Only accessible within Docker network

# To expose MongoDB externally (NOT recommended):
# Uncomment ports in docker-compose.yml:
# ports:
#   - "27017:27017"
```

### VPN Security

```bash
# VPN keys are sensitive - treat like passwords
chmod 600 .env.docker

# Never share VPN keys publicly
# Don't commit vpn/ directory to git

# Test VPN is working:
docker-compose exec polymarket curl -s https://api.ipify.org
# Should show VPN IP, not your real IP
```

### Wallet Security

```bash
# Use a dedicated wallet for the bot
# Don't use your main wallet

# Keep limited funds in bot wallet
# Only what you're comfortable risking

# Monitor wallet regularly:
# https://polygonscan.com/address/<your_wallet>
```

---

## Advanced Configuration

### Custom Network Configuration

```yaml
# docker-compose.yml
networks:
    polymarket-network:
        driver: bridge
        ipam:
            config:
                - subnet: 172.25.0.0/16 # Change subnet if conflicts
```

### Resource Limits

```yaml
# docker-compose.yml
services:
    polymarket:
        deploy:
            resources:
                limits:
                    cpus: '2'
                    memory: 2G
                reservations:
                    cpus: '1'
                    memory: 512M
```

### Logging Configuration

```yaml
# docker-compose.yml
services:
    polymarket:
        logging:
            driver: 'json-file'
            options:
                max-size: '10m'
                max-file: '3'
```

### Multiple Bot Instances

Run multiple bots with different configurations:

```bash
# Create separate directories
mkdir bot1 bot2

# Copy config to each
cp -r polymarket-copy-trading-bot/* bot1/
cp -r polymarket-copy-trading-bot/* bot2/

# Configure each with different:
# - .env (different wallets, traders)
# - docker-compose.yml (different container names, networks)

# Start each separately
cd bot1 && docker-compose up -d
cd bot2 && docker-compose up -d
```

### External MongoDB Atlas

If using MongoDB Atlas instead of local container:

```yaml
# docker-compose.yml
services:
    # Comment out mongodb service

    polymarket:
        # Remove mongodb from depends_on
        environment:
            # Override with Atlas connection string
            MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/db'
```

---

## Additional Resources

- **Polymarket CLOB Docs:** https://docs.polymarket.com
- **Gluetun VPN Wiki:** https://github.com/qdm12/gluetun-wiki
- **Docker Documentation:** https://docs.docker.com
- **Docker Compose Reference:** https://docs.docker.com/compose/compose-file/

---

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review container logs: `docker-compose logs`
3. Search existing GitHub issues
4. Open a new issue with:
    - Docker version: `docker --version`
    - Compose version: `docker-compose --version`
    - OS and architecture
    - Full error logs (redact sensitive info)

---

**Last Updated:** October 2025

**Note:** This guide assumes Docker Compose V2. If using V1, replace `docker-compose` with `docker compose` (with space instead of hyphen).
