# ==============================================================
# Supabase – migrácie (db push) + nasadenie Edge Functions
# ==============================================================
# Použitie: .\supabase-setup-full.ps1
#           .\supabase-setup-full.ps1 -ProjectRef hrkwqdvfeudxkqttpgls
# Predtým: npx supabase login  (ak ešte nie si prihlásený)
# ==============================================================

param(
    [string]$ProjectRef = "hrkwqdvfeudxkqttpgls"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "`n=== Supabase setup (migracie + Edge Functions) ===`n" -ForegroundColor Cyan

# 1. Migrácie (link + db push)
Write-Host "[1/2] Migracie (db push)..." -ForegroundColor Cyan
& "$ProjectRoot\supabase-db-push.ps1" -ProjectRef $ProjectRef
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nCHYBA: Migracie zlyhali. Skontroluj prihlasenie: npx supabase login" -ForegroundColor Red
    exit 1
}

# 2. Edge Functions
Write-Host "`n[2/2] Nasadenie Edge Functions..." -ForegroundColor Cyan
npm run supabase:deploy-functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nCHYBA: Deploy funkcii zlyhal. Skus: npx supabase functions deploy" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Hotovo ===" -ForegroundColor Green
Write-Host "V Supabase Dashboard (projekt $ProjectRef) by mali byt viditelne Tables a Edge Functions." -ForegroundColor White
Write-Host "Otestuj: npm run dev -> /diagnostics?key=diagnostics a /booking`n" -ForegroundColor Cyan
