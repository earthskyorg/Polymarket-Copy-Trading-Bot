# PowerShell script to check for Rust installation
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rust Installation Checker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rustFound = $false

# Check common Rust commands
$rustCommands = @("rustc", "cargo", "rustc.exe", "cargo.exe")

Write-Host "Checking for Rust in PATH..." -ForegroundColor Yellow
foreach ($cmd in $rustCommands) {
    try {
        $result = Get-Command $cmd -ErrorAction Stop
        Write-Host "✓ Found: $($result.Name) at $($result.Source)" -ForegroundColor Green
        Write-Host "  Version: " -NoNewline
        & $cmd --version 2>&1
        $rustFound = $true
    } catch {
        # Command not found, continue
    }
}

if (-not $rustFound) {
    Write-Host ""
    Write-Host "❌ Rust not found in PATH" -ForegroundColor Red
    Write-Host ""
    
    # Check common installation locations
    Write-Host "Checking common installation locations..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "$env:USERPROFILE\.cargo\bin",
        "$env:LOCALAPPDATA\Programs\Rust stable MSVC 64-bit\bin",
        "C:\Users\$env:USERNAME\.cargo\bin"
    )
    
    $foundPaths = @()
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $rustcExe = Join-Path $path "rustc.exe"
            $cargoExe = Join-Path $path "cargo.exe"
            
            if (Test-Path $rustcExe) {
                $foundPaths += $path
                Write-Host "✓ Found Rust at: $path" -ForegroundColor Green
                Write-Host "  rustc version: " -NoNewline
                & $rustcExe --version 2>&1
            }
        }
    }
    
    if ($foundPaths.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Rust is installed but not in PATH" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To fix this:" -ForegroundColor Cyan
        Write-Host "1. Add Rust to PATH manually:" -ForegroundColor White
        Write-Host "   - Open System Properties > Environment Variables" -ForegroundColor Gray
        Write-Host "   - Add $($foundPaths[0]) to PATH" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Or use the full path to run Rust:" -ForegroundColor White
        Write-Host "   $($foundPaths[0])\cargo.exe build" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Or restart your terminal (PATH may need refresh)" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Rust is not installed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Rust from:" -ForegroundColor Yellow
        Write-Host "   https://rustup.rs/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Or run the installation helper:" -ForegroundColor Yellow
        Write-Host "   .\install_rust.ps1" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "✅ Rust is installed and accessible!" -ForegroundColor Green
    Write-Host ""
    
    # Check if Cargo.toml exists
    if (Test-Path "Cargo.toml") {
        Write-Host "✓ Found Cargo.toml" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now:" -ForegroundColor Cyan
        Write-Host "  1. Build the project: cargo build" -ForegroundColor White
        Write-Host "  2. Run the bot: cargo run --release" -ForegroundColor White
        Write-Host "  3. Or use: .\run.bat" -ForegroundColor White
    } else {
        Write-Host "⚠️  Cargo.toml not found in current directory" -ForegroundColor Yellow
        Write-Host "   Make sure you're in the RustVersion directory" -ForegroundColor Gray
    }
}

Write-Host ""
