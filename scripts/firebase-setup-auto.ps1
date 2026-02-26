# ==============================================================
# Firebase Auth – automatický setup (načíta .env, potom spustí complete)
# ==============================================================
# Spustenie: .\scripts\firebase-setup-auto.ps1
# Z .env sa načítajú: SUPABASE_DB_URL, VITE_FIREBASE_PROJECT_ID (-> FIREBASE_PROJECT_ID)
# ==============================================================

param(
    [string]$SupabaseProjectRef = "hrkwqdvfeudxkqttpgls"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $ProjectRoot ".env"

Set-Location $ProjectRoot

if (Test-Path $envFile) {
    Write-Host "Nacitavam premenné z .env ..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^\s*#') { return }
        if ($line -match '^\s*(\w+)\s*=\s*(.*)$') {
            $key = $matches[1]
            $val = $matches[2].Trim()
            if ($val -match '#') { $val = ($val -split '#', 2)[0].Trim() }
            $val = $val.Trim('"').Trim("'")
            if ($key -eq "SUPABASE_DB_URL") {
                $env:SUPABASE_DB_URL = $val
                Write-Host "  SUPABASE_DB_URL nastavena" -ForegroundColor Gray
            }
            if ($key -eq "SUPABASE_ACCESS_TOKEN") {
                $env:SUPABASE_ACCESS_TOKEN = $val
                Write-Host "  SUPABASE_ACCESS_TOKEN nastaveny" -ForegroundColor Gray
            }
            if ($key -eq "VITE_FIREBASE_PROJECT_ID") {
                $env:FIREBASE_PROJECT_ID = $val
                Write-Host "  FIREBASE_PROJECT_ID (z VITE_FIREBASE_PROJECT_ID) nastaveny" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host ".env neexistuje – kroky 3–5 mozu byt preskocene." -ForegroundColor Yellow
}

& (Join-Path $ProjectRoot "scripts\firebase-setup-complete.ps1") -SupabaseProjectRef $SupabaseProjectRef
