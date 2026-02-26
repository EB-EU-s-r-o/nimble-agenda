# Automatizovaný deployment na Vercel pomocou VERCEL_TOKEN
# Použitie: .\scripts\deploy-vercel.ps1 [-Environment <production|preview>] [-Force]
# Predpokladá, že VERCEL_TOKEN je nastavený ako env premenná vo Vercel

param(
    [Parameter()]
    [ValidateSet("production", "preview")]
    [string]$Environment = "production",
    
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Write-Host "🚀 Spúšťam automatizovaný deployment na Vercel..." -ForegroundColor Cyan
Write-Host "Prostredie: $Environment" -ForegroundColor Yellow

# Skontroluj, či je projekt už linked
if (-not (Test-Path ".vercel")) {
    Write-Host "Projekt nie je pripojený k Vercel. Spust: vercel link" -ForegroundColor Red
    exit 1
}

# Overenie, či existuje VERCEL_TOKEN vo Vercel prostredí
Write-Host "Kontrolujem VERCEL_TOKEN vo Vercel..." -ForegroundColor Yellow
$tokenCheck = vercel env ls $Environment 2>$null | Select-String -Pattern "VERCEL_TOKEN"
if (-not $tokenCheck) {
    Write-Host "VERCEL_TOKEN nie je nastavený vo Vercel prostredí $Environment." -ForegroundColor Red
    Write-Host "Najprv spust: .\scripts\set-vercel-token-env.ps1" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ VERCEL_TOKEN je k dispozícii" -ForegroundColor Green

# Build aplikácie
Write-Host "🔨 Spúšťam build..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build zlyhal" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build úspešný" -ForegroundColor Green
} catch {
    Write-Host "❌ Chyba pri build-e: $_" -ForegroundColor Red
    exit 1
}

# Deployment
Write-Host "🚀 Spúšťam deployment..." -ForegroundColor Yellow
$deployArgs = @()
if ($Environment -eq "production") {
    $deployArgs += "--prod"
}
if ($Force) {
    $deployArgs += "--force"
}

try {
    & vercel @deployArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment úspešný!" -ForegroundColor Green
        
        # Získaj URL deploymentu
        $projectInfo = vercel list --json | ConvertFrom-Json
        if ($projectInfo -and $projectInfo.url) {
            $url = "https://$($projectInfo.url)"
            Write-Host "🌐 URL aplikácie: $url" -ForegroundColor Cyan
            
            # Skús otvoriť v prehliadači (voliteľné)
            $openUrl = Read-Host "Chceš otvoriť aplikáciu v prehliadači? (y/n)"
            if ($openUrl -eq 'y' -or $openUrl -eq 'Y') {
                try {
                    Start-Process $url
                    Write-Host "✅ Aplikácia otvorená v prehliadači" -ForegroundColor Green
                } catch {
                    Write-Host "⚠️  Nepodarilo sa otvoriť prehliadač: $_" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "❌ Deployment zlyhal" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Chyba pri deploymente: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Deployment dokončený!" -ForegroundColor Cyan