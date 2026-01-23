# PowerShell script to help install Rust
# This script will guide you through Rust installation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rust Installation Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Rust is already installed
$rustInstalled = $false
$rustCommands = @("rustc", "cargo")

foreach ($cmd in $rustCommands) {
    try {
        $result = Get-Command $cmd -ErrorAction Stop
        $version = & $cmd --version 2>&1
        Write-Host "✓ Rust is already installed: $version" -ForegroundColor Green
        Write-Host "  Location: $($result.Source)" -ForegroundColor Gray
        $rustInstalled = $true
        break
    }
    catch {
        # Continue checking
    }
}

if ($rustInstalled) {
    Write-Host ""
    Write-Host "Rust is already installed and ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Install dependencies: cargo build" -ForegroundColor White
    Write-Host "  2. Create .env file with your configuration" -ForegroundColor White
    Write-Host "  3. Run the bot: cargo run --release" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host "Rust is not installed." -ForegroundColor Yellow
Write-Host ""

# Method 1: Using rustup (recommended)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 1: rustup (Recommended)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This is the official and recommended way to install Rust:" -ForegroundColor White
Write-Host ""
Write-Host "rustup is the Rust toolchain installer and version manager." -ForegroundColor Gray
Write-Host ""

$useRustup = Read-Host "Would you like to install Rust using rustup now? (Y/N)"

if ($useRustup -eq "Y" -or $useRustup -eq "y") {
    Write-Host ""
    Write-Host "Installing Rust using rustup..." -ForegroundColor Cyan
    Write-Host "This will download and install rustup-init.exe..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Download rustup-init.exe
        $rustupUrl = "https://win.rustup.rs/x86_64"
        $rustupPath = "$env:TEMP\rustup-init.exe"
        
        Write-Host "Downloading rustup installer..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath -UseBasicParsing
        
        Write-Host "Running rustup installer..." -ForegroundColor Yellow
        Write-Host "Please follow the prompts in the installer window." -ForegroundColor Cyan
        Write-Host ""
        
        Start-Process -FilePath $rustupPath -Wait
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host ""
        Write-Host "✓ Rust installation completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Please restart your terminal and run:" -ForegroundColor Yellow
        Write-Host "  rustc --version" -ForegroundColor White
        Write-Host "  cargo --version" -ForegroundColor White
        Write-Host ""
        
        # Clean up
        Remove-Item $rustupPath -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "⚠ Installation may have failed. Please try manual installation." -ForegroundColor Yellow
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Method 2: Direct Download
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 2: Manual Download" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Download rustup from rustup.rs:" -ForegroundColor White
Write-Host ""
Write-Host "  https://rustup.rs/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or visit: https://www.rust-lang.org/tools/install" -ForegroundColor Cyan
Write-Host ""

$openBrowser = Read-Host "Would you like to open Rust installation page in browser? (Y/N)"

if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    Write-Host "Opening Rust installation page..." -ForegroundColor Cyan
    Start-Process "https://rustup.rs/"
    Write-Host ""
    Write-Host "After installation, restart your terminal and run:" -ForegroundColor Yellow
    Write-Host "  rustc --version" -ForegroundColor White
    Write-Host "  cargo --version" -ForegroundColor White
    Write-Host ""
}

# Method 3: Using winget (Windows Package Manager)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Method 3: Using winget" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if winget is available
try {
    $null = winget --version 2>&1
    Write-Host "✓ winget is available" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can install Rust using winget:" -ForegroundColor White
    Write-Host ""
    Write-Host "  winget install Rustlang.Rustup" -ForegroundColor Cyan
    Write-Host ""
    
    $useWinget = Read-Host "Would you like to install Rust using winget now? (Y/N)"
    
    if ($useWinget -eq "Y" -or $useWinget -eq "y") {
        Write-Host "Installing Rust using winget..." -ForegroundColor Cyan
        Write-Host "This may take a few minutes..." -ForegroundColor Yellow
        Write-Host ""
        
        try {
            winget install Rustlang.Rustup --accept-package-agreements --accept-source-agreements
            Write-Host ""
            Write-Host "✓ Rust installation completed!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Please restart your terminal and run:" -ForegroundColor Yellow
            Write-Host "  rustc --version" -ForegroundColor White
            Write-Host "  cargo --version" -ForegroundColor White
            Write-Host ""
        }
        catch {
            Write-Host "⚠ Installation may have failed. Please try manual installation." -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "⚠ winget is not available on this system" -ForegroundColor Yellow
    Write-Host "  (This is normal on older Windows versions)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor Yellow
Write-Host "2. Verify installation:" -ForegroundColor Yellow
Write-Host "   rustc --version" -ForegroundColor White
Write-Host "   cargo --version" -ForegroundColor White
Write-Host ""
Write-Host "3. Install bot dependencies:" -ForegroundColor Yellow
Write-Host "   cd RustVersion" -ForegroundColor White
Write-Host "   cargo build" -ForegroundColor White
Write-Host ""
Write-Host "4. Run the bot:" -ForegroundColor Yellow
Write-Host "   cargo run --release" -ForegroundColor White
Write-Host ""
