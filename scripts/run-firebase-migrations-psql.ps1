# ==============================================================
# Spustí len Firebase Auth migrácie cez psql (bez Supabase CLI).
# ==============================================================
# Použitie:
#   $env:SUPABASE_DB_URL = "postgresql://postgres:HESLO@db.hrkwqdvfeudxkqttpgls.supabase.co:5432/postgres"
#   .\scripts\run-firebase-migrations-psql.ps1
# alebo:
#   $env:PGPASSWORD = "tvoje_heslo"
#   .\scripts\run-firebase-migrations-psql.ps1 -ProjectRef hrkwqdvfeudxkqttpgls
# ==============================================================

param(
    [string]$ProjectRef = "hrkwqdvfeudxkqttpgls",
    [string]$DbUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Mig1 = Join-Path $ProjectRoot "supabase\migrations\20260223120000_firebase_auth.sql"
$Mig2 = Join-Path $ProjectRoot "supabase\migrations\20260223120100_firebase_rls_use_current_profile_id.sql"

Set-Location $ProjectRoot

foreach ($f in @($Mig1, $Mig2)) {
    if (-not (Test-Path $f)) { Write-Host "Chyba: neexistuje $f" -ForegroundColor Red; exit 1 }
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "Chyba: psql nie je v PATH. Nainstaluj: winget install PostgreSQL.PostgreSQL" -ForegroundColor Red
    exit 1
}

if ($DbUrl) {
    $conn = $DbUrl
    Write-Host "Pouzivam SUPABASE_DB_URL" -ForegroundColor Cyan
} else {
    $pwd = $env:PGPASSWORD
    if (-not $pwd) {
        Write-Host "Nastav SUPABASE_DB_URL alebo PGPASSWORD. Napr:" -ForegroundColor Yellow
        Write-Host '  $env:PGPASSWORD = "tvoje_heslo"; .\scripts\run-firebase-migrations-psql.ps1' -ForegroundColor Yellow
        exit 1
    }
    $conn = "postgresql://postgres@db.$ProjectRef.supabase.co:5432/postgres"
}

Write-Host "Spustam 20260223120000_firebase_auth.sql ..." -ForegroundColor Cyan
& psql $conn -f $Mig1
if ($LASTEXITCODE -ne 0) { Write-Host "Chyba pri prvej migracii." -ForegroundColor Red; exit 1 }

Write-Host "Spustam 20260223120100_firebase_rls_use_current_profile_id.sql ..." -ForegroundColor Cyan
& psql $conn -f $Mig2
if ($LASTEXITCODE -ne 0) { Write-Host "Chyba pri druhej migracii." -ForegroundColor Red; exit 1 }

Write-Host "`nFirebase migracie dokoncene." -ForegroundColor Green
