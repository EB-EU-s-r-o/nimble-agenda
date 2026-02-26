# Test script to verify Vercel automated deployment setup
# Použitie: .\scripts\test-deployment-setup.ps1
# Overí, či sú všetky komponenty pre automatizovaný deployment správne nastavené

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "🧪 Testujem nastavenie automatizovaného deploymentu..." -ForegroundColor Cyan

$testsPassed = 0
$totalTests = 0

function Test-Condition {
    param(
        [string]$Description,
        [scriptblock]$TestBlock,
        [string]$SuccessMessage = "✅",
        [string]$FailureMessage = "❌"
    )
    
    $totalTests++
    try {
        $result = & $TestBlock
        if ($result) {
            Write-Host "$SuccessMessage $Description" -ForegroundColor Green
            $script:testsPassed++
            return $true
        } else {
            Write-Host "$FailureMessage $Description" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "$FailureMessage $Description - Chyba: $_" -ForegroundColor Red
        return $false
    }
}

# Test 1: Vercel CLI dostupný
Test-Condition -Description "Vercel CLI je nainštalovaný" -TestBlock {
    try {
        $vercelVersion = vercel --version 2>$null
        return ($vercelVersion -ne $null -and $vercelVersion -match "vercel")
    } catch {
        return $false
    }
}

# Test 2: Projekt je linked k Vercel
Test-Condition -Description "Projekt je pripojený k Vercel" -TestBlock {
    return (Test-Path ".vercel")
}

# Test 3: Token file existuje
Test-Condition -Description "Token file existuje" -TestBlock {
    return (Test-Path "scripts\vercel-deploy-token.txt")
}

# Test 4: Token file nie je prázdny
Test-Condition -Description "Token file obsahuje token" -TestBlock {
    if (-not (Test-Path "scripts\vercel-deploy-token.txt")) { return $false }
    $token = Get-Content "scripts\vercel-deploy-token.txt" -Raw | Where-Object { $_ -notmatch '^\s*#' } | Select-Object -First 1
    return ($token -and $token.Trim() -ne "")
}

# Test 5: Deployment script existuje
Test-Condition -Description "Deployment script existuje" -TestBlock {
    return (Test-Path "scripts\deploy-vercel.ps1")
}

# Test 6: Token setup script existuje
Test-Condition -Description "Token setup script existuje" -TestBlock {
    return (Test-Path "scripts\set-vercel-token-env.ps1")
}

# Test 7: VERCEL_TOKEN je nastavený vo Vercel (ak je projekt linked)
Test-Condition -Description "VERCEL_TOKEN je nastavený vo Vercel" -TestBlock {
    if (-not (Test-Path ".vercel")) { return $true } # Skip test if not linked
    try {
        $tokenCheck = vercel env ls production 2>$null | Select-String -Pattern "VERCEL_TOKEN"
        return ($tokenCheck -ne $null)
    } catch {
        return $false
    }
}

# Test 8: Build skript funguje
Test-Condition -Description "Build skript je spustiteľný" -TestBlock {
    try {
        $buildResult = npm run build --dry-run 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

# Test 9: Package.json obsahuje potrebné skripty
Test-Condition -Description "Package.json obsahuje build skript" -TestBlock {
    if (-not (Test-Path "package.json")) { return $false }
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    return ($packageJson.scripts -and $packageJson.scripts.build)
}

# Test 10: Vercel.json existuje
Test-Condition -Description "Vercel.json konfigurácia existuje" -TestBlock {
    return (Test-Path "vercel.json")
}

# Výsledky testov
Write-Host "`n📊 Výsledky testov:" -ForegroundColor Cyan
Write-Host "Prebehnuté testy: $testsPassed/$totalTests" -ForegroundColor Yellow

if ($testsPassed -eq $totalTests) {
    Write-Host "🎉 Všetky testy prebehli úspešne! Automatizovaný deployment je pripravený." -ForegroundColor Green
    Write-Host "`nĎalšie kroky:" -ForegroundColor Cyan
    Write-Host "1. Spust: .\scripts\set-vercel-token-env.ps1 (ak ešte nie je token nastavený)" -ForegroundColor White
    Write-Host "2. Spust: .\scripts\deploy-vercel.ps1 (pre testovací deployment)" -ForegroundColor White
} else {
    Write-Host "⚠️  Niektoré testy zlyhali. Skontroluj chybové hlášky vyššie." -ForegroundColor Red
    Write-Host "`nOdporúčané riešenia:" -ForegroundColor Cyan
    Write-Host "- Ak chýba Vercel CLI: npm install -g vercel" -ForegroundColor White
    Write-Host "- Ak nie je projekt linked: vercel link" -ForegroundColor White
    Write-Host "- Ak chýba token: skontroluj scripts\vercel-deploy-token.txt" -ForegroundColor White
    Write-Host "- Ak token nie je nastavený: .\scripts\set-vercel-token-env.ps1" -ForegroundColor White
}

Write-Host "`n💡 Tip: Pre podrobné informácie pozri docs/VERCEL-AUTOMATED-DEPLOYMENT.md" -ForegroundColor Gray