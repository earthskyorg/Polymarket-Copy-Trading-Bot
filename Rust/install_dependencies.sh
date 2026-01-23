#!/bin/bash
# Install dependencies for Polymarket Copy Trading Bot (Rust Version)
# This script works in Git Bash, WSL, and Linux/Mac

echo "========================================"
echo "Installing Dependencies (Rust)"
echo "========================================"
echo ""

# Check if Rust is available
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed or not in PATH"
    echo ""
    echo "Please install Rust first:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "  Or visit: https://rustup.rs/"
    echo ""
    exit 1
fi

# Check if Cargo is available
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo is not installed or not in PATH"
    echo ""
    echo "Cargo should come with Rust. Please reinstall Rust:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo ""
    exit 1
fi

echo "✓ Found Rust: $(rustc --version)"
echo "✓ Found Cargo: $(cargo --version)"
echo ""

# Check if Cargo.toml exists
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Cargo.toml not found"
    echo ""
    echo "Make sure you're in the RustVersion directory"
    echo ""
    exit 1
fi

echo "Building project and installing dependencies..."
echo ""

# Build the project (this will download and compile all dependencies)
cargo build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed and project built successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Create .env file with your configuration"
    echo "  2. Run the bot: cargo run --release"
    echo "   Or: ./run.sh"
    echo ""
else
    echo ""
    echo "❌ Failed to build project"
    echo ""
    echo "Common issues:"
    echo "  - Missing system dependencies (build-essential, pkg-config, etc.)"
    echo "  - Network issues preventing dependency downloads"
    echo "  - Insufficient disk space"
    echo ""
    echo "Try running manually:"
    echo "  cargo build"
    echo ""
    exit 1
fi
