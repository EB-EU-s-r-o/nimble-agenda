# ==============================================================
# Push migrácií cez psql (ak supabase link zlyhá – nemáš týmový prístup)
# ==============================================================
# Použitie: $env:PGPASSWORD = "tvoje_heslo"; .\supabase-db-push-psql.ps1
#           .\supabase-db-push-psql.ps1 -ProjectRef dssdiqojkktzfuwoulbq
# Heslo: Supabase Dashboard → Settings → Database → Connection string
# ==============================================================
# Vyžaduje: psql (PostgreSQL client), napr. winget install PostgreSQL.PostgreSQL
# ==============================================================

param(
    [string]$ProjectRef = "eudwjgdijylsgcnncxeg",
    [string]$DbUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$RunAllSql = Join-Path $ProjectRoot "supabase\migrations\run-all.sql"

Set-Location $ProjectRoot

if (-not (Test-Path $RunAllSql)) {
    Write-Host "Chyba: run-all.sql neexistuje v supabase/migrations/" -ForegroundColor Red
    exit 1
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "Chyba: psql nie je v PATH. Nainstaluj PostgreSQL client (napr. winget install PostgreSQL.PostgreSQL)" -ForegroundColor Red
    exit 1
}

if ($DbUrl) {
    $conn = $DbUrl
    Write-Host "`nPouzivam SUPABASE_DB_URL..." -ForegroundColor Cyan
} else {
    $pwd = $env:PGPASSWORD
    if (-not $pwd) {
        Write-Host "Nastav heslo: `$env:PGPASSWORD = ""tvoje_heslo""" -ForegroundColor Yellow
        Write-Host "Heslo najdes: Supabase Dashboard → Settings → Database → Connection string" -ForegroundColor Yellow
        exit 1
    }
    $conn = "postgresql://postgres@db.$ProjectRef.supabase.co:5432/postgres"
    Write-Host "`nProjekt: $ProjectRef" -ForegroundColor Cyan
}

Write-Host "Spustam migracie (run-all.sql)..." -ForegroundColor Cyan
& psql $conn -f $RunAllSql
if ($LASTEXITCODE -ne 0) {
    Write-Host "psql zlyhal." -ForegroundColor Red
    exit 1
}

Write-Host "`nHotovo. Otestuj /diagnostics?key=diagnostics a /booking" -ForegroundColor Green
