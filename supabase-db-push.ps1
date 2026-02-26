# ==============================================================
# Push migrácií do Supabase cloudu (tabuľky, RPC, seed dáta)
# ==============================================================
# Použitie: .\supabase-db-push.ps1
#           .\supabase-db-push.ps1 -ProjectRef hrkwqdvfeudxkqttpgls
# Predtým: supabase login  (ak ešte nie si prihlásený)
# ==============================================================
# Tento skript aplikuje všetky migrácie z supabase/migrations/
# na zadaný projekt. Po úspechu budú tabuľky, RPC a seed dáta v cloude.
# ==============================================================

param(
    [string]$ProjectRef = "hrkwqdvfeudxkqttpgls"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Set-Location $ProjectRoot

$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    $supabaseCmd = "npx"
    $supabaseArgs = "supabase"
} else {
    $supabaseCmd = "supabase"
    $supabaseArgs = @()
}

Write-Host "`n[1/2] Link na projekt (ak uz je link, preskoci)..." -ForegroundColor Cyan
if ($supabaseCmd -eq "npx") { npx supabase link --project-ref $ProjectRef } else { supabase link --project-ref $ProjectRef }
if ($LASTEXITCODE -ne 0) {
    Write-Host "Link zlyhal. Skus: supabase login alebo npx supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[2/2] Push migracii do databazy (db push)..." -ForegroundColor Cyan
if ($supabaseCmd -eq "npx") { npx supabase db push } else { supabase db push }
if ($LASTEXITCODE -ne 0) {
    Write-Host "Db push zlyhal. Skontroluj migracie v supabase/migrations/" -ForegroundColor Red
    exit 1
}

Write-Host "`nHotovo. Tabuľky, RPC a seed dáta sú v cloude." -ForegroundColor Green
Write-Host "Otestuj /diagnostics?key=diagnostics a /booking`n" -ForegroundColor Cyan
