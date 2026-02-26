# ==============================================================
# Nimble Agenda (PAPI HAIR DESIGN) – Príprava prostredia
# ==============================================================
# Spustenie: .\setup.ps1   alebo   npm run setup
# Požiadavky: Node.js 18+
# Projekt používa npm (package-lock.json). Viac: docs/DEVELOPMENT-SETUP.md
# ==============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "`n[Nimble Agenda] Pripravujem prostredie...`n" -ForegroundColor Cyan

# 1. Kontrola Node.js (min. 18)
$nodeVersion = $null
try {
    $nodeVersion = (node -v 2>$null) -replace 'v', ''
} catch {}
if (-not $nodeVersion) {
    Write-Host "CHYBA: Node.js nie je nainstalovany alebo nie je v PATH." -ForegroundColor Red
    Write-Host "Nainstaluj Node.js 18+ z https://nodejs.org alebo pouzi nvm / fnm.`n" -ForegroundColor Yellow
    exit 1
}
$major = [int]($nodeVersion.Split('.')[0])
if ($major -lt 18) {
    Write-Host "CHYBA: Potrebujes Node.js 18 alebo novsi (aktualne: $nodeVersion)." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green

# 2. Inštalácia závislostí (npm)
Set-Location $ProjectRoot
Write-Host "`nInštalujem závislosti (npm)..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "CHYBA: Inštalácia závislostí zlyhala." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Závislosti nainštalované`n" -ForegroundColor Green

# 3. .env – skopíruj z .env.example ak .env neexistuje
$envExample = Join-Path $ProjectRoot ".env.example"
$envFile   = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] Vytvoreny .env z .env.example – DOPLN hodnoty (Supabase URL a anon key)." -ForegroundColor Yellow
} elseif (Test-Path $envFile) {
    Write-Host "[OK] .env uz existuje." -ForegroundColor Green
} else {
    Write-Host "[!] Subor .env.example nebol najdeny. Premenne prostredia nastav manualne." -ForegroundColor Yellow
}

Write-Host "`nProstredie je pripravene.`n" -ForegroundColor Green
Write-Host "Dalsie kroky:" -ForegroundColor Cyan
Write-Host "  1. Uprav .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)" -ForegroundColor White
Write-Host "  2. Spust dev server:  npm run dev" -ForegroundColor White
Write-Host "  3. Aplikacia:        http://localhost:8080" -ForegroundColor White
Write-Host "  Doc: docs/DEVELOPMENT-SETUP.md (priprava na vyvoj)`n" -ForegroundColor Gray
