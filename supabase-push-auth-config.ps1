# ==============================================================
# Push auth konfigurácie (Site URL + Redirect URLs) do Supabase
# ==============================================================
# Použitie: .\supabase-push-auth-config.ps1
# Predtým: supabase login  (ak ešte nie si prihlásený)
# ==============================================================
# POZOR: Obsah supabase/config.toml (napr. [auth], site_url) sa
# NEPASTUJE do terminálu – to sú riadky do súboru. Tento skript
# pushne už uložený config do cloudu.
# ==============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$ProjectRef = "eudwjgdijylsgcnncxeg"

Set-Location $ProjectRoot

# Použij npx supabase (z devDependencies), ak nie je v PATH
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

Write-Host "`n[2/2] Push config do cloudu (auth site_url + redirect_urls)..." -ForegroundColor Cyan
if ($supabaseCmd -eq "npx") { npx supabase config push } else { supabase config push }
if ($LASTEXITCODE -ne 0) {
    Write-Host "Config push zlyhal." -ForegroundColor Red
    exit 1
}

Write-Host "`nHotovo. Auth na booking.papihairdesign.sk by mal teraz fungovat." -ForegroundColor Green
Write-Host "Otestuj prihlasenie na https://booking.papihairdesign.sk/auth`n" -ForegroundColor Cyan
